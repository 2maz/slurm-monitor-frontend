import { MouseEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { bisectRight, brushX, format, scaleUtc, select, utcDay, utcFormat, utcMonth, utcYear } from "d3";
import { Button, createListCollection, HStack } from "@chakra-ui/react";
import useDataFrameQuery from "../../hooks/useDataFrameQuery";
import useAppState from "../../AppState";
import useSize from "../../hooks/useSize";
import useUrlParam, { useUrlFlag } from "../../hooks/useUrlParam";
import {
  ALLOCATION_KINDS,
  AllocationKind,
  addSplits,
  Band,
  CPU_ALLOCATION_QUERY_NAME,
  emptySplit,
  GPU_ALLOCATION_QUERY_NAME,
  groupSeries,
  NodeSeries,
  periodWeights,
  share,
  Split,
  summarize,
  Summary,
  toSeries,
  total,
} from "./allocation";
import { textWidth } from "./chartText";
import { DURATIONS, Option, saveFile, toPng, toUtc } from "./timeWindow";
import useTimeWindow from "./useTimeWindow";
import { InfoButton, InfoItem, LoadingNote, OptionSwitch, ParamSelect } from "./viewControls";

const SURFACE = "#fff";
const TEXT_PRIMARY = "#1f1e1c";
const TEXT_SECONDARY = "#52514e";
const FONT_SIZE = 12;
// Layout, top down: the legend, the cluster's row, the time axis, then a row per node. Left of the
// grid are the labels; right of it each row's totals, as a bar and as numbers.
const MARGIN = 12;
// the labels' column is as wide as its longest label, within these
const MIN_LABEL_WIDTH = 110;
const MAX_LABEL_WIDTH = 280;
// the capacity's column, at the right of the labels
const CAPACITY_WIDTH = 40;
// the nodes not in the cluster's totals come last, under a heading
const OTHERS_GAP = 14;
const OTHERS_HEADING = 20;
const LEGEND_ROW = 20;
const SWATCH = 12;
const CLUSTER_HEIGHT = 72;
// Node rows grow with the log of their capacity from the smallest's ROW_HEIGHT (see AllocationKind.rowScale), so
// that 16-GPU and 384-CPU nodes don't swamp the rest.
const ROW_HEIGHT = 18;
const ROW_GAP = 3;
// the time axis, then the nodes' column headers below it
const AXIS_HEIGHT = 44;
// the cluster's row stands out on a band of this color
const CLUSTER_BAND = "#f4f3f0";
// the totals, a table: a bar, then right-aligned columns of numbers, each ending at its x
const TOTALS_GAP = 16;
const TOTALS_BAR = 90;
const TOTALS_COLUMNS = { hours: TOTALS_BAR + 64, allocated: TOTALS_BAR + 140, busy: TOTALS_BAR + 216 };
const TOTALS_WIDTH = TOTALS_GAP + TOTALS_COLUMNS.busy + 4;
// two lines of column headers above the cluster's row
const TOTALS_HEADER = 34;
// about the tallest a tooltip gets, for flipping it above the pointer near the window's bottom
const TOOLTIP_HEIGHT = 240;
// when nothing has been measured yet, e.g. in tests
const FALLBACK_WIDTH = 960;

// Hours to three significant digits with an SI suffix, e.g. 903, 5.36k, 46.2M (d3's "s" would write
// fractions as milli, so under 1000 they are whole numbers).
const compact = format(".3~s");
const hours = (ms: number) => {
  const value = ms / 3_600_000;
  return Math.round(value) < 1000 ? value.toFixed(0) : compact(value);
};
const percent = (value?: number) => (value === undefined ? "–" : `${Math.round(100 * value)}%`);
// GPUs or CPUs averaged over a bucket: whole from 10, else to two significant digits, e.g. 2900, 16, 7.1, 0.25
const twoDigits = format(".2~r");
const amount = (value: number) => (value >= 9.5 ? value.toFixed(0) : twoDigits(value));
const formatTime = utcFormat("%d.%m.%Y %H:%M");
// ticks name only what changes, e.g. the hour within a day, the day at midnight
const formatTick = (date: Date) =>
  (utcDay(date) < date
    ? utcFormat("%H:%M")
    : utcMonth(date) < date
      ? utcFormat("%a %d")
      : utcYear(date) < date
        ? utcFormat("%b")
        : utcFormat("%Y"))(date);

// The bands filling a gauge from the bottom, in order; unavailable hangs from the top, and
// what's left between them is the empty track, not allocated.
const fills = (bands: Band[]) => bands.filter(({ key }) => key !== "unavailable" && key !== "notAllocated");
const bandOf = (bands: Band[], key: string) => bands.find((band) => band.key === key)!;

interface Gauge {
  // where it starts and how long it is along its axis, in px
  start: number;
  length: number;
  split: Split;
  // what a full gauge holds, e.g. its row's capacity; less was installed where it's left blank
  scale: number;
}

/**
 * Paths drawing gauges, each band as one path over all of them: vertical gauges (columns of
 * `height`, filled upwards) or horizontal ones (bars of `height`, filled rightwards).
 */
const gaugePaths = (bands: Band[], gauges: Gauge[], height: number, vertical: boolean) => {
  const paths = new Map<string, string>([["track", ""], ...bands.map(({ key }): [string, string] => [key, ""])]);
  const box = (key: string, start: number, length: number, from: number, to: number) => {
    if (to - from <= 0 || length <= 0) return;
    // from and to are shares of the gauge, along its fill direction
    const d = vertical
      ? `M${start},${height * (1 - to)}h${length}v${height * (to - from)}h${-length}z`
      : `M${start + length * from},0h${length * (to - from)}v${height}h${-length * (to - from)}z`;
    paths.set(key, paths.get(key) + d);
  };
  for (const { start, length, split, scale } of gauges) {
    if (total(split) <= 0 || scale <= 0) continue;
    // the share installed, from the bottom; above it the gauge is blank
    const installed = total(split) / scale;
    box("track", start, length, 0, installed);
    let level = 0;
    for (const { key } of fills(bands)) {
      const share = split[key] / scale;
      box(key, start, length, level, level + share);
      level += share;
    }
    box("unavailable", start, length, installed - split.unavailable / scale, installed);
  }
  return paths;
};

const GaugeShapes = ({ kind, paths }: { kind: AllocationKind; paths: Map<string, string> }) => (
  <>
    <path d={paths.get("track")} fill={bandOf(kind.bands, "notAllocated").color} />
    {kind.bands
      .filter(({ key }) => key !== "notAllocated")
      .map((band) => (
        <path key={band.key} d={paths.get(band.key)} fill={band.color} />
      ))}
  </>
);

interface LegendEntry {
  // a band, or the blank above a gauge where less was installed
  band: Band | typeof NOT_INSTALLED;
  text: string;
  x: number;
  y: number;
}

const NOT_INSTALLED = { key: "notInstalled", label: "Not installed (yet or any more)", color: "none" } as const;

// Swatches with each band's share of the capacity shown, in the order the gauges fill, wrapping to the width.
const legendLayout = (bands: Band[], summary: Summary, width: number, font: string) => {
  const entries: LegendEntry[] = [];
  let x = 0;
  let y = 0;
  const order = [...fills(bands), bandOf(bands, "notAllocated"), bandOf(bands, "unavailable")];
  // not installed is no share of the capacity, so it has none
  const texts = [
    ...order.map((band): [LegendEntry["band"], string] => [band, `${band.label} ${percent(share(summary.bands[band.key], summary.capacity))}`]),
    [NOT_INSTALLED, NOT_INSTALLED.label] as [LegendEntry["band"], string],
  ];
  for (const [band, text] of texts) {
    const entryWidth = SWATCH + 6 + textWidth(text, font) + 20;
    if (x > 0 && x + entryWidth > width) {
      x = 0;
      y += LEGEND_ROW;
    }
    entries.push({ band, text, x, y });
    x += entryWidth;
  }
  return { entries, height: y + LEGEND_ROW };
};

const SORTS: Option[] = [
  { label: "Most allocated but idle", value: "idle" },
  { label: "Capacity", value: "capacity" },
  { label: "Name", value: "node" },
];

interface Hover {
  // the period, and the node or the cluster ("") hovered
  index: number;
  target: string;
  // the hovered cell, for its outline and the tooltip
  x: number;
  y: number;
  width: number;
  height: number;
  // where the pointer is in the window, which the tooltip follows
  clientX: number;
  clientY: number;
}

// Why a node is not in the cluster's totals, and at more length
// Allocations come from Slurm's job records, collected centrally; capacity and use from each node's own reports.
const reason = (kind: AllocationKind, notCounted: string) =>
  ({
    "out of service": "Slurm had the node down or drained throughout the time shown, and it ran no jobs (e.g. service nodes).",
    "not monitored":
      `Slurm's job records give jobs ${kind.resource}s on this node, but the node itself reports none to the ` +
      "monitor (e.g. sonar doesn't see its cards), so its capacity and use are unknown.",
    "not a Slurm GPU node":
      "The node reports cards to the monitor, but Slurm gave none of them to a job in the time shown or the 30 " +
      "days before (e.g. login nodes, or accelerators Slurm doesn't schedule).",
  })[notCounted] ?? notCounted;


// a not monitored node's allocation, averaged over the periods shown
const averageAllocated = (node: NodeSeries, weights: number[], from: number, to: number) => {
  const span = weights.slice(from, to).reduce((sum, w) => sum + w, 0) || 1;
  return node.allocated.slice(from, to).reduce((sum, value, i) => sum + value * weights[from + i], 0) / span;
};

interface FigureProps {
  kind: AllocationKind;
  periods: number[];
  // the end of the last period
  end: number;
  cluster: Split[];
  rows: NodeSeries[];
  // the nodes not in the cluster's totals, with their reasons
  others: NodeSeries[];
  weights: number[];
  summaries: Map<string, Summary>;
  clusterSummary: Summary;
  // what the rows are, e.g. Node or GPU model, and the bucket length, for the tooltip
  rowLabel: string;
  bucketLength: string;
  from: number;
  to: number;
  onZoom: (from: number, to: number) => void;
  onResetZoom: () => void;
  width: number;
  // the start of downloads' file names, which add the time span
  fileName: string;
}

const Figure = (props: FigureProps) => {
  const { kind, periods, end, cluster, rows, others, weights, summaries, clusterSummary, rowLabel, bucketLength } = props;
  const { from, to, onZoom, onResetZoom, width, fileName } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const brushRef = useRef<SVGGElement>(null);
  const [hover, setHover] = useState<Hover>();
  // Chakra's `* { font: inherit }` beats SVG font attributes, so fonts are set as styles
  const font = useMemo(() => getComputedStyle(document.body).fontFamily, []);
  // e.g. "Tesla V100-SXM3-32GB" when grouped by model, and the capacity's column
  const labelWidth = Math.min(
    MAX_LABEL_WIDTH,
    Math.max(MIN_LABEL_WIDTH, ...[...rows, ...others].map((row) => textWidth(row.node, font) + CAPACITY_WIDTH + 20)),
  );
  const gridWidth = Math.max(100, width - 2 * MARGIN - labelWidth - TOTALS_WIDTH);
  const domainEnd = to < periods.length ? periods[to] : end;
  const x = scaleUtc().domain([periods[from], domainEnd]).range([0, gridWidth]);
  // a column per period, 1px apart where there's room
  const columns = periods.slice(from, to).map((period, i) => {
    const start = x(period);
    const length = x(from + i + 1 < periods.length ? periods[from + i + 1] : end) - start;
    return { start, length: length >= 6 ? length - 1 : length };
  });
  // a row's gauges, full at its capacity
  const gauges = (splits: Split[], scale: number) =>
    columns.map((column, i) => ({ ...column, split: splits[from + i], scale }));
  // above the grid, beside the totals' headers
  const legend = legendLayout(kind.bands, clusterSummary, gridWidth, font);
  const unit = kind.resource === "GPU" ? "GPUs" : "CPUs";
  const smallest = Math.min(...[...rows, ...others].filter((row) => row.capacity > 0).map((row) => row.capacity));
  const rowHeight = (row: NodeSeries) =>
    row.capacity > smallest
      ? ROW_HEIGHT + (kind.rowScale.step * Math.log(row.capacity / smallest)) / Math.log(kind.rowScale.factor)
      : ROW_HEIGHT;
  const clusterY = MARGIN + Math.max(legend.height + 12, TOTALS_HEADER + 6);
  const rowsY = clusterY + CLUSTER_HEIGHT + AXIS_HEIGHT;
  // rows one below the other from `top`, and where they end
  const stack = (list: NodeSeries[], top: number) => {
    let y = top;
    const placed = list.map((row) => {
      const at = { row, y, height: rowHeight(row) };
      y += at.height + ROW_GAP;
      return at;
    });
    return { placed, end: y };
  };
  const counted = stack(rows, rowsY);
  const othersY = counted.end + OTHERS_GAP;
  const uncounted = stack(others, othersY + OTHERS_HEADING);
  const height = (others.length ? uncounted.end : counted.end) + MARGIN;
  // every row the pointer can be over, and where
  const placed = [...counted.placed, ...uncounted.placed.filter(({ row }) => row.capacity > 0)];
  // the totals' bars are as long as their capacity-time, the longest TOTALS_BAR
  const longest = Math.max(...rows.map((row) => summaries.get(row.node)!.capacity), 1);
  const capacity = Math.max(...cluster.slice(from, to).map(total), 0);

  // drag across the cluster's row to zoom to whole periods; a double click goes back
  useEffect(() => {
    if (!brushRef.current) return;
    const g = select(brushRef.current);
    const brush = brushX<unknown>()
      .extent([
        [0, 0],
        [gridWidth, CLUSTER_HEIGHT],
      ])
      .on("end", (event: { selection: [number, number] | null }) => {
        if (!event.selection) return;
        const [left, right] = event.selection.map((px) => x.invert(px).getTime());
        const first = Math.max(from, bisectRight(periods, left) - 1);
        const last = Math.min(to, Math.max(first + 1, bisectRight(periods, right - 1)));
        brush.clear(g);
        if (last - first >= 1 && (first !== from || last !== to)) onZoom(first, last);
      });
    g.call(brush);
    g.on("dblclick", () => onResetZoom());
    return () => {
      g.on(".brush", null).on("dblclick", null);
    };
  });

  const onMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    const box = svgRef.current!.getBoundingClientRect();
    const px = event.clientX - box.left - MARGIN - labelWidth;
    const py = event.clientY - box.top;
    if (px < 0 || px > gridWidth) return setHover(undefined);
    const pointer = { clientX: event.clientX, clientY: event.clientY };
    const i = Math.min(columns.length - 1, Math.max(0, bisectRight(columns.map(({ start }) => start), px) - 1));
    const column = { x: MARGIN + labelWidth + columns[i].start, width: columns[i].length };
    if (py >= clusterY && py < clusterY + CLUSTER_HEIGHT)
      return setHover({ index: from + i, target: "", ...column, y: clusterY, height: CLUSTER_HEIGHT, ...pointer });
    const over = placed.find(({ y, height }) => py >= y - ROW_GAP / 2 && py < y + height + ROW_GAP / 2);
    if (!over) return setHover(undefined);
    setHover({ index: from + i, target: over.row.node, ...column, y: over.y, height: over.height, ...pointer });
  };

  const download = async (format: "svg" | "png") => {
    const clone = svgRef.current!.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll('[data-export="skip"]').forEach((element) => element.remove());
    clone.setAttribute("font-family", font);
    const svg = new XMLSerializer().serializeToString(clone);
    const blob = format === "svg" ? new Blob([svg], { type: "image/svg+xml" }) : await toPng(svg);
    const time = (t: number) => utcFormat("%Y-%m-%dT%H%MZ")(new Date(t));
    saveFile(blob, `${fileName}_${time(periods[from])}_${time(domainEnd)}.${format}`);
  };

  // A row of the totals: a bar as long as the capacity-time (the cluster's has none, as the nodes'
  // bars share a scale of their own), the capacity-time, and the shares allocated and busy.
  const totals = (summary: Summary, bar: boolean, emphasis = false, barHeight = ROW_HEIGHT) => {
    const cell = (x: number, text: string) => (
      <text
        x={x}
        y={barHeight / 2}
        dy="0.32em"
        textAnchor="end"
        fill={emphasis ? TEXT_PRIMARY : TEXT_SECONDARY}
        style={{ fontVariantNumeric: "tabular-nums", fontWeight: emphasis ? 600 : 400 }}
      >
        {text}
      </text>
    );
    return (
      <g transform={`translate(${gridWidth + TOTALS_GAP}, 0)`}>
        {bar && (
          <GaugeShapes
            kind={kind}
            paths={gaugePaths(
              kind.bands,
              [{ start: 0, length: (TOTALS_BAR * summary.capacity) / longest, split: summary.bands, scale: summary.capacity }],
              barHeight,
              false,
            )}
          />
        )}
        {cell(TOTALS_COLUMNS.hours, hours(summary.capacity))}
        {cell(TOTALS_COLUMNS.allocated, percent(share(summary.allocated, summary.capacity)))}
        {cell(TOTALS_COLUMNS.busy, percent(share(summary.bands.busy, summary.allocated)))}
      </g>
    );
  };
  const header = (x: number, lines: [string, string]) =>
    lines.map((line, i) => (
      <text key={i} x={x} y={i * 14} textAnchor="end" fill={TEXT_SECONDARY}>
        {line}
      </text>
    ));

  const hoveredRow = hover && placed.find(({ row }) => row.node === hover.target)?.row;
  const hovered = hover && (hover.target === "" ? cluster[hover.index] : hoveredRow?.splits[hover.index]);
  const hoveredCapacity = hovered ? total(hovered) : 0;
  const flipX = hover !== undefined && hover.clientX + 300 > window.innerWidth;
  const flipY = hover !== undefined && hover.clientY + TOOLTIP_HEIGHT > window.innerHeight;
  // the nodes of a hovered group
  const members = hoveredRow?.members;
  // a row's label: its name, and its capacity in a column of its own
  const label = (name: string, capacity: string, y: number) => (
    <>
      <text x={-8 - CAPACITY_WIDTH} y={y} dy="0.32em" textAnchor="end" fill={TEXT_PRIMARY}>
        {name}
      </text>
      <text x={-8} y={y} dy="0.32em" textAnchor="end" fill={TEXT_SECONDARY} style={{ fontVariantNumeric: "tabular-nums" }}>
        {capacity}
      </text>
    </>
  );
  return (
    <>
      <HStack gap={2} mb={1} justify="flex-end">
        {(from > 0 || to < periods.length) && (
          <Button size="xs" variant="outline" onClick={onResetZoom}>
            Show the whole range
          </Button>
        )}
        <Button size="xs" variant="outline" onClick={() => void download("svg")}>
          Download SVG
        </Button>
        <Button size="xs" variant="outline" onClick={() => void download("png")}>
          Download PNG
        </Button>
      </HStack>
      <div style={{ position: "relative" }}>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: "block", fontSize: FONT_SIZE }}
          onMouseMove={onMouseMove}
          onMouseLeave={() => setHover(undefined)}
        >
          <rect width={width} height={height} fill={SURFACE} />
          <g transform={`translate(${MARGIN + labelWidth}, ${MARGIN})`}>
            {legend.entries.map(({ band, text, x, y }) => (
              <g key={band.key} transform={`translate(${x}, ${y})`}>
                {band === NOT_INSTALLED ? (
                  <rect x={0.5} y={0.5} width={SWATCH - 1} height={SWATCH - 1} rx={2} fill="none" stroke={TEXT_SECONDARY} strokeWidth={1} />
                ) : (
                  <rect width={SWATCH} height={SWATCH} rx={2} fill={band.color} />
                )}
                <text x={SWATCH + 6} y={SWATCH / 2} dy="0.32em" fill={TEXT_SECONDARY}>
                  {text}
                </text>
              </g>
            ))}
          </g>
          {/* the whole cluster, as one tall row on a band of its own */}
          <rect x={MARGIN / 2} y={clusterY - 6} width={width - MARGIN} height={CLUSTER_HEIGHT + 10} rx={6} fill={CLUSTER_BAND} />
          <g transform={`translate(${MARGIN + labelWidth}, ${clusterY})`}>
            <text x={-8} y={ROW_HEIGHT / 2} dy="0.32em" textAnchor="end" fill={TEXT_PRIMARY} style={{ fontWeight: 600 }}>
              Whole cluster
            </text>
            <text x={-8} y={ROW_HEIGHT / 2 + 16} dy="0.32em" textAnchor="end" fill={TEXT_SECONDARY}>
              up to {Math.round(capacity)} {unit}
            </text>
            <GaugeShapes kind={kind} paths={gaugePaths(kind.bands, gauges(cluster, capacity), CLUSTER_HEIGHT, true)} />
            {/* the totals' column headers, and a rule below them */}
            <g transform={`translate(${gridWidth + TOTALS_GAP}, ${-TOTALS_HEADER + 10})`}>
              {header(TOTALS_COLUMNS.hours, [`${kind.resource}-hours`, "installed"])}
              {header(TOTALS_COLUMNS.allocated, ["Allocated", "of these"])}
              {header(TOTALS_COLUMNS.busy, ["Busy", "of allocated"])}
              <line y1={TOTALS_HEADER - 14} y2={TOTALS_HEADER - 14} x2={TOTALS_COLUMNS.busy} stroke="#e4e3df" />
            </g>
            {totals(clusterSummary, false, true)}
            <g ref={brushRef} data-export="skip" />
          </g>

          {/* the time axis, between the cluster and the nodes, and the nodes' column headers */}
          <g transform={`translate(${MARGIN + labelWidth}, ${clusterY + CLUSTER_HEIGHT})`}>
            <g transform={`translate(0, ${AXIS_HEIGHT - 6})`}>
              <text x={-8 - CAPACITY_WIDTH} textAnchor="end" fill={TEXT_SECONDARY}>
                {rowLabel}
              </text>
              <text x={-8} textAnchor="end" fill={TEXT_SECONDARY}>
                {unit}
              </text>
            </g>
            {x.ticks(Math.max(2, Math.floor(gridWidth / 90))).map((tick) => (
              <g key={tick.getTime()} transform={`translate(${x(tick)}, 0)`}>
                <line y1={2} y2={6} stroke={TEXT_SECONDARY} />
                <text y={15} dy="0.32em" textAnchor="middle" fill={TEXT_SECONDARY}>
                  {formatTick(tick)}
                </text>
              </g>
            ))}
          </g>

          {/* a row per node */}
          <g transform={`translate(${MARGIN + labelWidth}, 0)`}>
            {counted.placed.map(({ row, y, height }) => (
              <g key={row.node} transform={`translate(0, ${y})`}>
                {label(row.node, String(Math.round(row.capacity)), Math.min(height, ROW_HEIGHT) / 2)}
                <GaugeShapes kind={kind} paths={gaugePaths(kind.bands, gauges(row.splits, row.capacity), height, true)} />
                {totals(summaries.get(row.node)!, true, false, Math.min(height, ROW_HEIGHT))}
              </g>
            ))}
          </g>

          {/* the nodes not in the cluster's totals, as far as they are known, and why */}
          {others.length > 0 && (
            <g transform={`translate(${MARGIN + labelWidth}, 0)`}>
              <text x={-labelWidth} y={othersY + OTHERS_HEADING / 2} dy="0.32em" fill={TEXT_PRIMARY} style={{ fontWeight: 600 }}>
                Not in the cluster's totals
              </text>
              <line x1={-labelWidth} x2={gridWidth + TOTALS_WIDTH} y1={othersY} y2={othersY} stroke="#e4e3df" />
              {uncounted.placed.map(({ row, y, height }) => (
                <g key={row.node} transform={`translate(0, ${y})`}>
                  {label(row.node, row.capacity > 0 ? String(Math.round(row.capacity)) : "–", Math.min(height, ROW_HEIGHT) / 2)}
                  {row.capacity > 0 ? (
                    <GaugeShapes kind={kind} paths={gaugePaths(kind.bands, gauges(row.splits, row.capacity), height, true)} />
                  ) : (
                    // only not monitored nodes have no cells, as the backend leaves out nodes with nothing to show
                    row.notCounted === "not monitored" && (
                      <>
                        <rect width={gridWidth} height={height} fill="#f0efec" />
                        <text x={6} y={ROW_HEIGHT / 2} dy="0.32em" fill={TEXT_SECONDARY}>
                          Slurm&apos;s job records give jobs {amount(averageAllocated(row, weights, from, to))} {unit} here on
                          average, but the node reports no {unit} to the monitor
                        </text>
                      </>
                    )
                  )}
                  <g>
                    <title>{reason(kind, row.notCounted!)}</title>
                    <text x={gridWidth + TOTALS_GAP} y={ROW_HEIGHT / 2} dy="0.32em" fill={TEXT_SECONDARY}>
                      {row.notCounted}
                    </text>
                  </g>
                </g>
              ))}
            </g>
          )}

          {hover && (
            <rect
              data-export="skip"
              x={hover.x - 1}
              y={hover.y - 1}
              width={hover.width + 2}
              height={hover.height + 2}
              fill="none"
              stroke={TEXT_PRIMARY}
              strokeWidth={1.5}
              pointerEvents="none"
            />
          )}
        </svg>
        {hover && hovered && (
          <div
            role="tooltip"
            style={{
              // fixed in the window rather than in the page, which it would make longer near its end;
              // beside the pointer, flipped to its left or above it where there's no room
              position: "fixed",
              left: hover.clientX + (flipX ? -14 : 14),
              top: hover.clientY + (flipY ? -14 : 14),
              transform: `translate(${flipX ? "-100%" : "0"}, ${flipY ? "-100%" : "0"})`,
              width: 260,
              pointerEvents: "none",
              background: SURFACE,
              border: "1px solid #e4e3df",
              borderRadius: 6,
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
              padding: "6px 10px",
              fontSize: FONT_SIZE,
              color: TEXT_PRIMARY,
              zIndex: 4,
            }}
          >
            <div style={{ fontWeight: 600 }}>
              {hover.target || "Whole cluster"}, {amount(hoveredCapacity)}{" "}
              {amount(hoveredCapacity) === "1" ? unit.slice(0, -1) : unit}
            </div>
            {/* why GPUs come in fractions: a GPU busy half the bucket counts as 0.5 */}
            <div style={{ color: TEXT_SECONDARY }}>
              Averages over {bucketLength} from {formatTime(new Date(periods[hover.index]))} UTC
            </div>
            {members && <div style={{ color: TEXT_SECONDARY }}>{members.join(", ")}</div>}
            {hoveredRow && hoveredCapacity < hoveredRow.capacity - 0.005 && (
              <div style={{ color: TEXT_SECONDARY }}>
                {amount(hoveredRow.capacity - hoveredCapacity)} of its {Math.round(hoveredRow.capacity)} {unit} not installed
              </div>
            )}
            <div style={{ marginBottom: 4 }} />
            {[bandOf(kind.bands, "unavailable"), bandOf(kind.bands, "notAllocated"), ...fills(kind.bands).reverse()].map((band) => (
              <div key={band.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 12, height: 3, borderRadius: 2, background: band.color, flex: "none" }} />
                <strong style={{ minWidth: 40, fontVariantNumeric: "tabular-nums" }}>{amount(hovered[band.key])}</strong>
                <span style={{ color: TEXT_SECONDARY }}>
                  {band.label} ({percent(share(hovered[band.key], hoveredCapacity))})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// The figure's numbers, per node over the time shown, as shares of capacity-time.
interface SummaryTableProps {
  kind: AllocationKind;
  rows: NodeSeries[];
  summaries: Map<string, Summary>;
  clusterSummary: Summary;
  // the nodes not in the cluster's totals, with their reasons
  others: NodeSeries[];
  // what the rows are, e.g. Node or GPU model
  rowLabel: string;
}

const SummaryTable = ({ kind, rows, others, summaries, clusterSummary, rowLabel }: SummaryTableProps) => {
  const line = (name: string, capacity: number | string, summary: Summary) => (
    <tr key={name}>
      <td>{name}</td>
      <td style={{ textAlign: "right" }}>{capacity}</td>
      {[...kind.bands].reverse().map((band) => (
        <td key={band.key} style={{ textAlign: "right" }}>
          {percent(share(summary.bands[band.key], summary.capacity))}
        </td>
      ))}
      <td style={{ textAlign: "right" }}>{percent(share(summary.bands.busy, summary.allocated))}</td>
    </tr>
  );
  return (
    <table className="table table-sm" style={{ fontSize: FONT_SIZE, fontVariantNumeric: "tabular-nums", marginTop: 12 }}>
      <thead>
        <tr>
          <th>{rowLabel}</th>
          <th style={{ textAlign: "right" }}>{kind.resource}s</th>
          {[...kind.bands].reverse().map((band) => (
            <th key={band.key} style={{ textAlign: "right" }}>
              {band.label}
            </th>
          ))}
          <th style={{ textAlign: "right" }}>Busy of allocated</th>
        </tr>
      </thead>
      <tbody>
        {line("Cluster", "", clusterSummary)}
        {rows.map((row) => line(row.node, Math.round(row.capacity), summaries.get(row.node)!))}
        {others.length > 0 && (
          <tr>
            <th colSpan={kind.bands.length + 3}>Not in the cluster's totals</th>
          </tr>
        )}
        {others.map((row) => (
          <tr key={row.node}>
            <td>{row.node}</td>
            <td style={{ textAlign: "right" }}>{row.capacity > 0 ? Math.round(row.capacity) : "–"}</td>
            <td colSpan={kind.bands.length + 1} style={{ color: TEXT_SECONDARY }}>
              {row.notCounted}: {reason(kind, row.notCounted!)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const info = (kind: AllocationKind): ReactNode => {
  const unit = `${kind.resource}s`;
  return (
    <>
      <InfoItem term="A cell">
        one node&apos;s {unit} (or a group&apos;s) in one bucket. It fills from the bottom with what Slurm&apos;s jobs
        held, darker for more use, then in amber with{" "}
        {kind.resource === "GPU" ? "cards held by processes outside Slurm, busy or not" : "CPUs busy beyond the allocations"}.
        Unavailable time hangs from the top in gray, the light middle is not allocated, and the cell is blank where
        fewer {unit} were installed. The top row is the whole cluster.
      </InfoItem>
      <InfoItem term="Rows">
        grow a step for every {kind.rowScale.growth} of their {unit}; the cluster&apos;s row is not to scale.
      </InfoItem>
      <InfoItem term="Totals">
        over the time shown: the {kind.resource}-hours installed (also the bar&apos;s length), the share allocated, and
        the share of that busy.
      </InfoItem>
      <InfoItem term="Sources">
        allocations come from Slurm&apos;s job records (AllocTRES); a job counts from its start until a minute after it
        was last seen running, split evenly over its nodes. What is installed and used comes from each node&apos;s own
        reports, and hardware counts from its first report until 3 hours after its last.
      </InfoItem>
      <InfoItem term="Busy">
        {kind.resource === "GPU"
          ? "a card's driver reports a kernel running, so it is an upper bound on use; it counts only on cards a job holds."
          : "the node's busy CPUs, up to what was allocated; more than that counts as beyond the allocations."}
      </InfoItem>
      <InfoItem term="Unavailable">
        Slurm had the node down, drained, failing, in maintenance, not responding or misregistered, except what running
        jobs still had.
      </InfoItem>
      <InfoItem term="Not in the cluster&apos;s totals">
        where the two sources disagree: Slurm gave jobs {unit} on a node that reports none (not monitored), or a node
        reports cards Slurm never gave a job (not a Slurm GPU node). Also nodes out of service throughout. Hover a reason
        for more.
      </InfoItem>
      <InfoItem term="Zoom">drag across the cluster&apos;s row, double click to zoom out.</InfoItem>
    </>
  );
};

interface AllocationViewProps {
  // GPU_ALLOCATION_QUERY_NAME or CPU_ALLOCATION_QUERY_NAME
  queryName: string;
  querySelect: ReactNode;
  // switches to the other resource's query, keeping the other settings
  onQueryName: (queryName: string) => void;
}

const AllocationView = ({ queryName, querySelect, onQueryName }: AllocationViewProps) => {
  const kind = ALLOCATION_KINDS[queryName];
  const timeWindow = useTimeWindow();
  const [sort, setSort] = useUrlParam("sort", "idle", (value) => SORTS.some((sort) => sort.value === value));
  const [level, setLevel] = useUrlParam("level", "node", (value) => kind.levels.some((level) => level.value === value));
  const levelLabel = kind.levels.find((option) => option.value === level)!.label;
  const [showTable, setShowTable] = useUrlFlag("table", false);
  // periods [from, to) of the data it was made on, so that new data shows whole
  const [zoom, setZoom] = useState<{ data: unknown; range: [number, number] }>();
  const [frameRef, { width: measured }] = useSize();
  const width = measured || FALLBACK_WIDTH;
  const { cluster_id } = useAppState().currentBackendSpec();
  const { data, dataUpdatedAt, isLoading, error } = useDataFrameQuery(kind.queryName, timeWindow.params);

  const series = useMemo(() => toSeries(kind, data ?? []), [kind, data]);
  const { periods } = series;
  // the end of the last period, at the end of the window or when the data came
  const end = useMemo(() => {
    if (!periods.length) return 0;
    const last = toUtc(new Date(periods[periods.length - 1]).toISOString()).plus(DURATIONS[timeWindow.bucketLength]).toMillis();
    return Math.min(last, timeWindow.custom ? Date.parse(timeWindow.custom.end) : dataUpdatedAt);
  }, [periods, timeWindow.bucketLength, timeWindow.custom, dataUpdatedAt]);
  const weights = useMemo(() => periodWeights(periods, end), [periods, end]);
  const [from, to] = zoom && zoom.data === data ? zoom.range : [0, periods.length];

  const counted = series.nodes.filter((node) => !node.notCounted);
  // the nodes, or their models or manufacturers
  const grouped = useMemo(() => groupSeries(series.nodes.filter((node) => !node.notCounted), level), [series, level]);
  const summaries = new Map(grouped.map((node) => [node.node, summarize(node.splits, weights, from, to)]));
  const cluster = periods.map((_, i) => counted.reduce((sum, node) => addSplits(sum, node.splits[i]), emptySplit()));
  const clusterSummary = summarize(cluster, weights, from, to);
  const idle = (node: NodeSeries) => {
    const { bands } = summaries.get(node.node)!;
    return bands.occupiedIdle + bands.allocatedIdle;
  };
  // the nodes not in the totals, each with its reason, by reason
  const others = series.nodes
    .filter((node) => node.notCounted)
    .sort((a, b) => a.notCounted!.localeCompare(b.notCounted!) || a.node.localeCompare(b.node, undefined, { numeric: true }));
  const rows = [...grouped].sort((a, b) =>
    sort === "node"
      ? a.node.localeCompare(b.node, undefined, { numeric: true })
      : sort === "capacity"
        ? b.capacity - a.capacity || a.node.localeCompare(b.node, undefined, { numeric: true })
        : idle(b) - idle(a),
  );

  const resources = createListCollection({
    items: [
      { label: "GPUs", value: GPU_ALLOCATION_QUERY_NAME },
      { label: "CPUs", value: CPU_ALLOCATION_QUERY_NAME },
    ],
  });

  let chart;
  if (isLoading)
    chart = <LoadingNote expected="a year can take a couple of minutes, shorter ranges much less" />;
  else if (error) chart = "Failed to load data";
  else if (!periods.length) chart = "No data available for this time range";
  else
    chart = (
      <>
        {!counted.length ? (
          `No monitored ${kind.resource}s Slurm allocates in this time range`
        ) : showTable ? (
          // the figure's numbers, in place of it (the time span shown if zoomed in)
          <SummaryTable
            kind={kind}
            rows={rows}
            others={others}
            summaries={summaries}
            clusterSummary={clusterSummary}
            rowLabel={levelLabel}
          />
        ) : (
          <Figure
            kind={kind}
            periods={periods}
            end={end}
            cluster={cluster}
            rows={rows}
            others={others}
            weights={weights}
            summaries={summaries}
            clusterSummary={clusterSummary}
            rowLabel={levelLabel}
            bucketLength={timeWindow.bucketLength}
            from={from}
            to={to}
            onZoom={(first, last) => setZoom({ data, range: [first, last] })}
            onResetZoom={() => setZoom(undefined)}
            width={width}
            // e.g. ex3.simula.no_gpu-allocation_1-hour
            fileName={[cluster_id, kind.queryName, timeWindow.bucketLength.replace(/\s+/g, "-")].join("_")}
          />
        )}
      </>
    );

  return (
    <div className="my-3">
      <HStack alignItems="end" wrap="wrap">
        {querySelect}
        <ParamSelect label="Resource" collection={resources} value={queryName} onChange={onQueryName} width="120px" />
        <ParamSelect
          label="Group by"
          collection={createListCollection({ items: kind.levels })}
          value={level}
          onChange={setLevel}
          width="160px"
        />
        {timeWindow.controls}
        <ParamSelect
          label="Sort by"
          collection={createListCollection({ items: SORTS })}
          value={sort}
          onChange={setSort}
          width="220px"
        />
        <OptionSwitch label="Show as table" checked={showTable} onChange={setShowTable} mb={2} />
        <InfoButton>{info(kind)}</InfoButton>
      </HStack>
      <div ref={frameRef} className="my-3" style={{ color: TEXT_SECONDARY }}>
        {chart}
      </div>
    </div>
  );
};

export default AllocationView;
