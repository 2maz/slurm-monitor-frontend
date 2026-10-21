import { memo, ReactNode, RefCallback, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DateTime, Duration, DurationLikeObject, DurationUnit } from "luxon";
import { BarLoader } from "react-spinners";
import {
  Button,
  createListCollection,
  Field,
  HStack,
  IconButton,
  Input,
  ListCollection,
  Popover,
  Portal,
  Switch,
} from "@chakra-ui/react";
import { LuInfo } from "react-icons/lu";
import useDataFrameQuery, { Row } from "../../hooks/useDataFrameQuery";
import useAppState from "../../AppState";
import {
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "../ui/select";

interface Option {
  label: string;
  value: string;
  disabled?: boolean;
}

const options = (values: string[], isDisabled: (value: string) => boolean = () => false) =>
  createListCollection<Option>({ items: values.map((value) => ({ label: value, value, disabled: isDisabled(value) })) });

// Mirrors GPUUtilizationBucketLength / GPUUtilizationLength in slurm_monitor/db/query.py,
// which both utilization queries use - keep in sync with the backend enums.
const BUCKET_LENGTHS = ["15 minutes", "1 hour", "1 day", "1 week", "1 month"];
const LENGTHS = ["15 minutes", "1 hour", "1 day", "1 week", "1 month", "1 year"];
// a custom range of whole UTC days, picked with date inputs
const CUSTOM = "custom";
const DURATIONS: Record<string, DurationLikeObject> = {
  "15 minutes": { minutes: 15 },
  "1 hour": { hours: 1 },
  "1 day": { days: 1 },
  "1 week": { weeks: 1 },
  "1 month": { months: 1 },
  "1 year": { years: 1 },
};
const seconds = (value: string) => Duration.fromObject(DURATIONS[value]).as("seconds");
// Caps the number of buckets (heatmap columns) to keep rendering fast, e.g. 1 hour
// buckets go up to 1 week, 1 day buckets up to 1 year. The backend enforces it too.
const MAX_BUCKETS = 400;
const isValidSpan = (bucketLength: string, spanSeconds: number) => {
  const buckets = spanSeconds / seconds(bucketLength);
  return buckets >= 1 && buckets <= MAX_BUCKETS;
};
interface ParamSelectProps {
  label: string;
  collection: ListCollection<Option>;
  value: string;
  onChange: (value: string) => void;
  width?: string;
}

const ParamSelect = ({ label, collection, value, onChange, width = "180px" }: ParamSelectProps) => (
  <SelectRoot
    collection={collection}
    size="sm"
    width={width}
    value={[value]}
    onValueChange={(event) => onChange(event.value[0])}
  >
    <SelectLabel>{label}</SelectLabel>
    <SelectTrigger>
      <SelectValueText />
    </SelectTrigger>
    <SelectContent>
      {collection.items.map((item) => (
        <SelectItem item={item} key={item.value}>
          {item.label}
        </SelectItem>
      ))}
    </SelectContent>
  </SelectRoot>
);

interface OptionSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  mb?: number;
}

// The root is a label, which Bootstrap's unlayered `label { display: inline-block }`
// would take over from Chakra's layered styles, so its flex layout is set inline.
const OptionSwitch = ({ label, checked, onChange, mb }: OptionSwitchProps) => (
  <Switch.Root
    size="sm"
    mb={mb}
    checked={checked}
    onCheckedChange={(event) => onChange(event.checked)}
    style={{ display: "inline-flex" }}
  >
    <Switch.HiddenInput />
    <Switch.Control />
    <Switch.Label>{label}</Switch.Label>
  </Switch.Root>
);

interface DateInputProps {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}

// A UTC date (yyyy-MM-dd); cleared inputs are ignored, as a range needs both ends.
const DateInput = ({ label, value, min, max, onChange }: DateInputProps) => (
  <Field.Root width="150px">
    <Field.Label>{label}</Field.Label>
    <Input
      type="date"
      size="sm"
      value={value}
      min={min}
      max={max}
      onChange={(event) => event.target.value && onChange(event.target.value)}
    />
  </Field.Root>
);

// Single-hue ramps (light = low, dark = high) for heatmap magnitude: blue by
// default, amber for power, green for memory. Checked for colour-blind safety;
// green has blue's lightness steps (OKLCH, hue 150).
const BLUE = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
const AMBER = ["#ffeab1", "#ffcc5f", "#f5af20", "#df9201", "#bd7200", "#985704", "#743c01"];
const GREEN = ["#cde8d2", "#9dd0a7", "#69b87c", "#1fa04e", "#02813a", "#00622a", "#01441b"];

const UTILIZATION = "utilization";

// A metric shown on a 0-100% color scale, with a box sized by time online.
interface PercentMetric {
  value: string;
  // in the metric select, and in the legend and tooltip
  label: string;
  legend: string;
  column: string;
  ramp: string[];
  // absolute values the tooltip adds after the percentage, e.g. " (41 W of 350 W)"
  detail?: (row: Row) => string | undefined;
}

// What a utilization query returns, and how its rows are grouped and explained.
interface UtilizationKind {
  queryName: string;
  // the columns with each row's group, and its display label if not the group itself
  groupColumn: string;
  labelColumn?: string;
  // the label of a switch showing the groups rather than their labels
  showGroupsLabel?: string;
  levels: string[];
  // the level where every group is a single GPU or node
  unitLevel: string;
  // the column counting GPUs or nodes in a group (also a metric), and its label
  count: { column: string; label: string };
  metrics: PercentMetric[];
  // a group's section, if its level has any, and what the sections' headers count
  section: (level: string, row: Row) => string | undefined;
  unit: (level: string) => string;
  info: ReactNode;
}

const InfoItem = ({ term, children }: { term: string; children: ReactNode }) => (
  <p style={{ marginTop: 6 }}>
    <strong>{term}</strong>: {children}
  </p>
);

export const GPU_UTILIZATION_QUERY_NAME = "gpu-utilization";
export const CPU_UTILIZATION_QUERY_NAME = "cpu-utilization";

const GPU_UTILIZATION: UtilizationKind = {
  queryName: GPU_UTILIZATION_QUERY_NAME,
  groupColumn: "gpu_group",
  labelColumn: "gpu_label",
  showGroupsLabel: "Show UUIDs",
  levels: ["card", "model", "manufacturer"],
  unitLevel: "card",
  count: { column: "gpus_reporting", label: "GPUs reporting" },
  metrics: [
    {
      value: UTILIZATION,
      label: "Utilization & time online",
      legend: "Utilization while online",
      column: "avg_utilization_percent_while_online",
      ramp: BLUE,
    },
    {
      value: "power",
      label: "Power & time online",
      legend: "Power while online (% of limit)",
      column: "power_percent_of_limit",
      ramp: AMBER,
      detail: (row) =>
        row.avg_power_watts !== undefined && row.avg_power_watts !== null
          ? ` (${row.avg_power_watts} W of ${row.avg_power_limit_watts} W)`
          : undefined,
    },
  ],
  // cards by model, models by manufacturer
  section: (level, row) =>
    level === "card"
      ? `${row.manufacturer || "unknown"} · ${row.model || "unknown model"}`
      : level === "model"
        ? String(row.manufacturer || "unknown")
        : undefined,
  unit: (level) => (level === "card" ? "card" : "model"),
  info: (
    <>
      <InfoItem term="Utilization">
        how busy the card's compute engines were, as reported by its driver, averaged over the time it was
        online. It says nothing about whether a Slurm job had the card allocated.
      </InfoItem>
      <InfoItem term="Time online">
        the share of the bucket the card sent samples (one every 30 seconds), shown as the area of the box in
        each cell.
      </InfoItem>
      <InfoItem term="Power">
        the average power draw as a share of the card's power limit. Some cards (e.g. Habana, Intel) don't
        report it.
      </InfoItem>
      <InfoItem term="GPUs reporting">the cards in a model or manufacturer that sent samples in the bucket.</InfoItem>
    </>
  ),
};

const CPU_UTILIZATION: UtilizationKind = {
  queryName: CPU_UTILIZATION_QUERY_NAME,
  groupColumn: "cpu_group",
  levels: ["node", "model"],
  unitLevel: "node",
  count: { column: "nodes_reporting", label: "Nodes reporting" },
  metrics: [
    {
      value: UTILIZATION,
      label: "Utilization & time online",
      legend: "Utilization while online",
      column: "avg_utilization_percent_while_online",
      ramp: BLUE,
      // on average over the bucket
      detail: (row) => {
        const percent = toNumber(row.avg_utilization_percent_while_online);
        const cpus = toNumber(row.logical_cpus);
        if (percent === undefined || cpus === undefined) return undefined;
        return ` (${((percent * cpus) / 100).toFixed(1)} of ${cpus} CPUs)`;
      },
    },
    {
      value: "memory",
      label: "Memory & time online",
      legend: "Memory used while online",
      column: "memory_percent_used",
      ramp: GREEN,
    },
  ],
  // nodes by CPU model
  section: (level, row) => (level === "node" ? String(row.model || "unknown model") : undefined),
  unit: () => "node",
  info: (
    <>
      <InfoItem term="Utilization">
        the share of the node's logical CPUs that were busy, from the kernel's busy time per CPU, averaged over
        the time it was online. Logical CPUs are hardware threads: on nodes with 2 threads per core, every
        core running a single thread shows as about 50%.
      </InfoItem>
      <InfoItem term="What counts">
        everything on the node: Slurm jobs, other processes (e.g. on login nodes) and the kernel's own work (e.g.
        the file system on the mds nodes). The load average isn't used, as it also counts processes waiting for
        I/O and can exceed the number of CPUs.
      </InfoItem>
      <InfoItem term="Memory">the memory in use as a share of the node's memory.</InfoItem>
      <InfoItem term="Time online">
        the share of the bucket the node sent samples (one every 30 seconds), shown as the area of the box in
        each cell.
      </InfoItem>
      <InfoItem term="Nodes reporting">the nodes of a CPU model that sent samples in the bucket.</InfoItem>
    </>
  ),
};

const UTILIZATION_KINDS: Record<string, UtilizationKind> = Object.fromEntries(
  [GPU_UTILIZATION, CPU_UTILIZATION].map((kind) => [kind.queryName, kind]),
);

const percentMetric = (kind: UtilizationKind, metric: string) => kind.metrics.find(({ value }) => value === metric);
const rampFor = (kind: UtilizationKind, metric: string) => percentMetric(kind, metric)?.ramp ?? BLUE;
// At the unit level every group is a single GPU or node, so the count is always 1.
const isValidMetric = (kind: UtilizationKind, level: string, metric: string) =>
  level !== kind.unitLevel || metric !== kind.count.column;

const OFFLINE = "#f0efec";
// box color for cards that were online but don't report the metric (e.g. power)
const NOT_REPORTED = "#a9a7a1";
// Cells are at most this wide, so they are square unless there are many buckets.
const CELL_SIZE = 20;
// Columns are at most CELL_SIZE + 2px apart. When fitting the width makes them
// closer than MIN_PITCH, the heatmap can scroll sideways instead.
const MIN_PITCH = 12;
// rough width of a 12px label character, for fitting axis labels
const CHAR_WIDTH = 7;
// rough tooltip height, for placing it below cells near the top of the window
const TOOLTIP_HEIGHT = 100;
// vertical layout of the grid: section headers, with space above all but the first, and rows
const HEADER_HEIGHT = 18;
const HEADER_GAP = 12;
const ROW_GAP = 2;
// space between the labels and the cells
const LABEL_PADDING = 8;
// Full size heatmaps can be split into columns side by side, as many as fit
// with at least MIN_COLUMN_ROWS rows each, COLUMN_GAP apart.
const MIN_COLUMN_ROWS = 4;
const COLUMN_GAP = 32;
// the axis: a border, ticks with their labels, and bands
const TICKS_TOP = 3;
const BANDS_TOP = 27;
const BAND_HEIGHT = 18;
const AXIS_HEIGHT = BANDS_TOP + BAND_HEIGHT;
// space above an axis on top, and between it and the first header or row
const TOP_AXIS_SPACE = 8;
// space between legend entries, and between groups of them
const LEGEND_GAP = 4;
const LEGEND_SPACING = 16;
// margin around a downloaded chart
const EXPORT_PADDING = 16;
// Moves the sticky parts of the SVGs (labels, the axis mask and band labels) along
// with the --scroll position the heatmap sets; 0 in a downloaded chart.
const SCROLL = "var(--scroll, 0px)";
const STICKY = { transform: `translateX(${SCROLL})` };
const SURFACE = "#fff";
const BORDER = "#e4e3df";
const TEXT_PRIMARY = "#1f1e1c";
const TEXT_SECONDARY = "#52514e";
const TOOLTIP_STYLE = {
  background: SURFACE,
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
  padding: "6px 10px",
  fontSize: 12,
  color: TEXT_PRIMARY,
};

const toUtc = (ts: string) => DateTime.fromISO(ts, { zone: "utc" });
const formatTime = (ts: string, format: string) => toUtc(ts).toFormat(format);
// Formats leave out what the bucket makes redundant, e.g. the hour of a day bucket.
interface AxisFormat {
  // the bucket length, in luxon units
  unit: DurationUnit;
  amount: number;
  // minor ticks, which count from the start of their band's calendar unit (e.g. days 1, 8, 15)
  minor: string;
  // the steps, in buckets, minor ticks may be spaced by
  steps: number[];
  // major bands below the ticks: formats from longest to shortest, and their calendar unit
  majors: string[];
  majorUnit: "day" | "month" | "year";
  tooltip: string;
}

const AXES: Record<string, AxisFormat> = {
  "15 minutes": {
    unit: "minutes",
    amount: 15,
    minor: "HH:mm",
    steps: [1, 2, 4, 8, 16, 24],
    majors: ["ccc dd.MM", "dd.MM", "d"],
    majorUnit: "day",
    tooltip: "dd.MM.yyyy HH:mm",
  },
  "1 hour": {
    unit: "hours",
    amount: 1,
    minor: "HH",
    steps: [1, 2, 3, 6, 12],
    majors: ["ccc dd.MM", "dd.MM", "d"],
    majorUnit: "day",
    tooltip: "dd.MM.yyyy HH:mm",
  },
  "1 day": {
    unit: "days",
    amount: 1,
    minor: "d",
    steps: [1, 2, 7, 14],
    majors: ["MMMM yyyy", "MMM yyyy", "MMM"],
    majorUnit: "month",
    tooltip: "ccc dd.MM.yyyy",
  },
  "1 week": {
    unit: "weeks",
    amount: 1,
    minor: "d",
    steps: [1, 2],
    majors: ["MMMM yyyy", "MMM yyyy", "MMM"],
    majorUnit: "month",
    tooltip: "'Week of' dd.MM.yyyy",
  },
  "1 month": {
    unit: "months",
    amount: 1,
    minor: "MMM",
    steps: [1, 3, 6],
    majors: ["yyyy", "yy"],
    majorUnit: "year",
    tooltip: "MMMM yyyy",
  },
};
const toNumber = (value?: string | number | null) => (value === null || value === undefined ? undefined : Number(value));
const ramp = (steps: string[], fraction: number) => steps[Math.min(steps.length - 1, Math.floor(fraction * steps.length))];
// The side of a box whose area is `percent` of its cell, as a fraction of the cell's side.
const boxSide = (percent: number) => Math.sqrt(Math.min(percent, 100) / 100);
// A cell with a centered box whose area is `percent` of the cell, on the offline color.
const fill = (color: string, percent: number) => {
  const side = 100 * boxSide(percent);
  return `linear-gradient(${color}, ${color}) center / ${side}% ${side}% no-repeat, ${OFFLINE}`;
};

// All bucket starts in the time range, including those without data (e.g. downtime).
// Steps from a bucket in the data so they line up with the backend's time_bucket.
// The range is a custom start-end, or else `length` up to now; never past now.
const bucketStarts = (first: string, bucketLength: string, length: string, start?: string, end?: string) => {
  const step = DURATIONS[bucketLength];
  const now = DateTime.utc();
  const to = end ? DateTime.min(toUtc(end), now) : now;
  const from = start ? toUtc(start) : to.minus(DURATIONS[length]);
  let period = toUtc(first);
  while (period > from) period = period.minus(step);
  const periods = [];
  for (; period < to; period = period.plus(step)) periods.push(period.toISO()!);
  return periods;
};

interface ChartProps {
  kind: UtilizationKind;
  data: Row[];
  metric: string;
  groups: string[];
  labels: Map<string, string>;
  headers: Map<string, string>;
  showGroups: boolean;
  bucketLength: string;
  length: string;
  start?: string;
  end?: string;
}

// An element's size, kept up to date as it resizes. A ref callback, so it
// follows the element when React replaces it.
const useSize = () => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const element = useRef<HTMLDivElement | null>(null);
  const ref: RefCallback<HTMLDivElement> = useCallback((current: HTMLDivElement | null) => {
    element.current = current;
    if (!current) return;
    const observer = new ResizeObserver(() => setSize({ width: current.clientWidth, height: current.clientHeight }));
    observer.observe(current);
    return () => observer.disconnect();
  }, []);
  return [ref, size, element] as const;
};

// Marks a side the heatmap has more to scroll to: columns to the left or right,
// or rows beneath the floating axis ("top" of an axis at the bottom, "bottom" of one on top).
const scrollShadow = (side: "left" | "right" | "top" | "bottom", offset: number, visible: boolean) => (
  <div
    style={{
      position: "absolute",
      // the side shadows start below the scroll container's 2px top padding
      ...(side === "top"
        ? { left: offset, right: 0, bottom: "100%", height: 16 }
        : side === "bottom"
          ? { left: offset, right: 0, top: "100%", height: 16 }
          : { top: 2, bottom: 0, [side]: offset, width: 16 }),
      background: `linear-gradient(to ${{ left: "right", right: "left", top: "top", bottom: "bottom" }[side]}, rgba(0, 0, 0, 0.15), transparent)`,
      opacity: visible ? 1 : 0,
      transition: "opacity 150ms",
      pointerEvents: "none",
      zIndex: 1,
    }}
  />
);

const Swatch = ({ background }: { background: string }) => (
  <span style={{ background, width: 12, height: 12, borderRadius: 2, flexShrink: 0 }} />
);

// An entry of the legend: a label, or a swatch whose box covers `percent` of it
// (100 by default), sized like a cell or like a ramp step, with extra space
// before it when it starts a group of entries.
type LegendItem = { text: string } | { color: string; percent?: number; cell?: boolean; spaced?: boolean };

const legendItems = (kind: UtilizationKind, metric: string, max: number): LegendItem[] => {
  const steps = rampFor(kind, metric);
  const percent = percentMetric(kind, metric);
  return [
    { text: percent ? `${percent.legend}: 0%` : `${kind.count.label}: 0` },
    ...steps.map((color) => ({ color })),
    { text: percent ? "100%" : String(max) },
    ...(!percent
      ? []
      : [
          { color: steps[3], percent: 25, cell: true, spaced: true },
          { color: steps[3], cell: true },
          { text: "box area = time online" },
          { color: NOT_REPORTED, spaced: true },
          { text: "not reported" },
        ]),
    { color: OFFLINE, spaced: true },
    { text: "offline / no data" },
  ];
};

const swatchSize = (item: { cell?: boolean }) => (item.cell ? [CELL_SIZE, CELL_SIZE] : [24, 12]);

const Legend = ({ items }: { items: LegendItem[] }) => (
  <div style={{ display: "flex", alignItems: "center", gap: LEGEND_GAP }}>
    {items.map((item, i) =>
      "text" in item ? (
        <span key={i}>{item.text}</span>
      ) : (
        <span
          key={i}
          style={{
            background: fill(item.color, item.percent ?? 100),
            width: swatchSize(item)[0],
            height: swatchSize(item)[1],
            marginLeft: item.spaced ? LEGEND_SPACING : undefined,
          }}
        />
      ),
    )}
  </div>
);

// A label's width at 12px, measured on a canvas; estimated where there is none (tests).
const textWidth = (text: string, font: string) => {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return CHAR_WIDTH * text.length;
  context.font = `12px ${font}`;
  return context.measureText(text).width;
};

// Where each legend entry starts, in a row laid out like `Legend`, and the row's width.
const legendLayout = (items: LegendItem[], font: string) => {
  let x = 0;
  const starts = items.map((item) => {
    if (!("text" in item) && item.spaced) x += LEGEND_SPACING;
    const start = x;
    x += ("text" in item ? textWidth(item.text, font) : swatchSize(item)[0]) + LEGEND_GAP;
    return start;
  });
  return { starts, width: x - LEGEND_GAP };
};

interface CellBoxProps {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  percent: number;
}

// A cell of the offline color with a centered box of `color` covering `percent` of it.
const CellBox = ({ x, y, width, height, color, percent }: CellBoxProps) => {
  const side = boxSide(percent);
  return (
    <>
      {side < 1 && <rect x={x} y={y} width={width} height={height} fill={OFFLINE} />}
      {side > 0 && (
        <rect
          x={x + (width * (1 - side)) / 2}
          y={y + (height * (1 - side)) / 2}
          width={width * side}
          height={height * side}
          fill={color}
        />
      )}
    </>
  );
};

// The legend as SVG, for a downloaded chart.
const LegendSvg = ({ items, font }: { items: LegendItem[]; font: string }) => {
  const { starts } = legendLayout(items, font);
  return (
    <g>
      {items.map((item, i) => {
        if ("text" in item)
          return (
            <text key={i} x={starts[i]} y={CELL_SIZE / 2} dominantBaseline="central" fill={TEXT_SECONDARY}>
              {item.text}
            </text>
          );
        const [width, height] = swatchSize(item);
        const y = (CELL_SIZE - height) / 2;
        return <CellBox key={i} x={starts[i]} y={y} width={width} height={height} color={item.color} percent={item.percent ?? 100} />;
      })}
    </g>
  );
};

// narrow columns drop their gaps, so that a year of days still fits the width
const columnGapFor = (pitch: number) => (pitch >= 6 ? 2 : pitch >= 3 ? 1 : 0);
// where the i-th column of cells starts, after the label column
const columnX = (i: number, labelWidth: number, pitch: number) => labelWidth + columnGapFor(pitch) + i * pitch;
const chartWidth = (periods: string[], labelWidth: number, pitch: number) => labelWidth + periods.length * pitch;

// The top of each group's section header (if any) and row in the grid, and the grid's height.
const gridRows = (groups: string[], headers: Map<string, string>) => {
  let y = 0;
  const rows = groups.map((group, i) => {
    let header;
    if (headers.has(group)) {
      if (i) y += HEADER_GAP;
      header = y;
      y += HEADER_HEIGHT + ROW_GAP;
    }
    const row = { group, header, y };
    y += CELL_SIZE + ROW_GAP;
    return row;
  });
  return { rows, height: Math.max(0, y - ROW_GAP) };
};

// A column of the heatmap: its groups, and the section headers above them.
interface Column {
  groups: string[];
  headers: Map<string, string>;
}

// Splits the groups into `count` columns of about equal height. A column starts
// with a section where one starts close enough, else in the middle of one, whose
// header it then repeats.
const splitColumns = (groups: string[], headers: Map<string, string>, count: number): Column[] => {
  // the top of each group, with its header, in a single column
  const tops = [0];
  groups.forEach((group, i) =>
    tops.push(tops[i] + CELL_SIZE + ROW_GAP + (headers.has(group) ? HEADER_GAP + HEADER_HEIGHT + ROW_GAP : 0)),
  );
  const height = tops[groups.length];
  const starts = [0];
  for (let k = 1; k < count; k++) {
    const target = (k * height) / count;
    const distance = (i: number) => Math.abs(tops[i] - target);
    // leaving at least one group for each of the columns after it
    const candidates = groups.map((_, i) => i).filter((i) => i > starts[k - 1] && i <= groups.length - count + k);
    const nearest = (indices: number[]) => indices.sort((a, b) => distance(a) - distance(b))[0] as number | undefined;
    const section = nearest(candidates.filter((i) => headers.has(groups[i])));
    starts.push(section !== undefined && distance(section) <= height / count / 4 ? section : nearest(candidates)!);
  }
  return starts.map((start, k) => {
    let section = start;
    while (section > 0 && !headers.has(groups[section])) section--;
    const columnHeaders = new Map(headers);
    if (headers.has(groups[section]) && section !== start)
      columnHeaders.set(groups[start], `${headers.get(groups[section])} (cont.)`);
    return { groups: groups.slice(start, starts[k + 1]), headers: columnHeaders };
  });
};

interface GridProps extends ChartProps {
  periods: string[];
  max: number;
  // distance between columns
  pitch: number;
  // width of the label column, including the padding before the cells
  labelWidth: number;
  // receives the label column's width, measured once rendered and when web fonts load
  onLabelWidth?: (width: number) => void;
  // gives each cell its values as a title, the browser's tooltip in a downloaded chart
  titles?: boolean;
}

interface CellValues {
  group: string;
  label?: string;
  period: string;
  percent?: number | string;
  detail?: string;
  online?: number | string;
  count?: number | string;
}

// A cell's values as plain text lines, as its tooltip shows them.
const cellTitle = (kind: UtilizationKind, metric: string, bucketLength: string, cell: CellValues) => {
  const { group, label, period, percent, detail, online, count } = cell;
  const lines = [formatTime(period, AXES[bucketLength].tooltip), label];
  if (group !== label) lines.push(group);
  const percentLabel = percentMetric(kind, metric)?.legend;
  if (online === undefined) lines.push("Offline / no data");
  else if (!percentLabel) lines.push(`${kind.count.label}: ${count}`);
  else {
    lines.push(`${percentLabel}: ${percent === undefined ? "not reported" : `${percent}%`}${detail ?? ""}`);
    lines.push(`Time online: ${online}%`);
  }
  return lines.join("\n");
};

// One row per group, one cell per period, as SVG. Percentage metric cells are
// colored by the metric while online, with a centered box sized by time online.
// Memoized so hovering, which only re-renders the tooltip in Heatmap, doesn't
// re-render every cell.
const HeatmapGrid = memo(function HeatmapGrid({
  kind,
  data,
  metric,
  groups,
  labels,
  headers,
  showGroups,
  bucketLength,
  periods,
  max,
  pitch,
  labelWidth,
  onLabelWidth,
  titles,
}: GridProps) {
  const labelText = useRef<SVGGElement>(null);
  const { rows, height } = useMemo(() => gridRows(groups, headers), [groups, headers]);

  useLayoutEffect(() => {
    const element = labelText.current;
    // getBBox is missing where nothing is laid out (tests)
    if (!onLabelWidth || !element?.getBBox) return;
    const measure = () => onLabelWidth(element.getBBox().width + LABEL_PADDING);
    measure();
    void document.fonts?.ready.then(measure);
  }, [rows, labels, showGroups, onLabelWidth]);

  const cells = useMemo(() => {
    const byKey = new Map(data.map((row) => [`${row[kind.groupColumn]}|${toUtc(String(row.period_start)).toISO()}`, row]));
    const width = pitch - columnGapFor(pitch);
    const percentColumn = percentMetric(kind, metric);
    return rows.map(({ group, y }) =>
      periods.map((period, i) => {
        const row = byKey.get(`${group}|${period}`);
        const online = toNumber(row?.percent_time_online);
        const count = toNumber(row?.[kind.count.column]);
        const percent = percentColumn && toNumber(row?.[percentColumn.column]);
        const value = percentColumn ? percent : count;
        const color = value === undefined ? undefined : ramp(rampFor(kind, metric), value / (percentColumn ? 100 : max));
        const values = {
          group,
          label: labels.get(group),
          period,
          percent,
          detail: row && percentColumn?.detail?.(row),
          online,
          count,
        };
        return (
          <g
            key={`${group}|${period}`}
            data-group={group}
            data-label={values.label}
            data-period={period}
            data-color={color}
            data-percent={percent}
            data-detail={values.detail}
            data-online={online}
            data-count={count}
          >
            {titles && <title>{cellTitle(kind, metric, bucketLength, values)}</title>}
            <CellBox
              x={columnX(i, labelWidth, pitch)}
              y={y}
              width={width}
              height={CELL_SIZE}
              color={color ?? NOT_REPORTED}
              percent={online === undefined ? 0 : percentColumn ? online : 100}
            />
          </g>
        );
      }),
    );
  }, [kind, data, metric, rows, labels, bucketLength, periods, max, pitch, labelWidth, titles]);

  return (
    <svg width={chartWidth(periods, labelWidth, pitch)} height={height} style={{ display: "block" }}>
      <g shapeRendering="crispEdges">{cells}</g>
      {/* labels and headers stay in view when scrolling sideways, covering the cells beneath */}
      <g style={STICKY}>
        <rect width={labelWidth} height={height} fill={SURFACE} />
        <g ref={labelText} fill={TEXT_SECONDARY}>
          {rows.map(({ group, y }) => (
            <text key={group} y={y + CELL_SIZE / 2} dominantBaseline="central">
              {showGroups ? group : labels.get(group)}
            </text>
          ))}
        </g>
        {rows.map(
          ({ group, header }) =>
            header !== undefined && (
              <text
                key={group}
                y={header + HEADER_HEIGHT / 2}
                dominantBaseline="central"
                fill={TEXT_PRIMARY}
                // a style, as Chakra's `* { font: inherit }` overrides the fontWeight attribute
                style={{ fontWeight: 700 }}
              >
                {headers.get(group)}
              </text>
            ),
        )}
      </g>
    </svg>
  );
});

interface AxisProps {
  periods: string[];
  bucketLength: string;
  pitch: number;
  labelWidth: number;
  // above the heatmap: mirrored, so the ticks and the border are next to the cells
  top?: boolean;
}

// Minor ticks per column and major bands below them (above them on top), as SVG
// aligned with the heatmap's columns.
const Axis = ({ periods, bucketLength, pitch, labelWidth, top }: AxisProps) => {
  const { unit, amount, minor: minorFormat, majors, majorUnit, steps } = AXES[bucketLength];
  const majorFormat = majors[0];
  // The longest band label that fits its columns.
  // Month bands only show the year where it changes: on the first band and on January.
  const bandFormat = (period: string, span: number, first: boolean) => {
    const withYear = majorUnit !== "month" || first || toUtc(period).month === 1;
    const formats = withYear ? majors : ["MMMM", "MMM"];
    return (
      formats.find((format) => CHAR_WIDTH * formatTime(period, format).length + 8 <= span * pitch) ??
      formats[formats.length - 1]
    );
  };
  // buckets since the start of the period's major unit, e.g. 6 for the 7th day of a month
  const calendarOffset = (period: string) => {
    const time = toUtc(period);
    return Math.floor(time.diff(time.startOf(majorUnit), unit).as(unit) / amount + 1e-9);
  };
  // columns a minor tick label needs
  const labelLength = Math.max(...periods.map((period) => formatTime(period, minorFormat).length));
  const fit = Math.ceil((CHAR_WIDTH * labelLength + 4) / pitch);
  const minorEvery = steps.find((step) => step >= fit) ?? fit;
  // Bands of consecutive periods with the same major label. A minor tick is shown
  // every minorEvery buckets of its calendar unit, unless it would run into the next band.
  const bands: { period: string; span: number; start: number }[] = [];
  const ticks = periods.map((period, i) => {
    const band = bands[bands.length - 1];
    if (band && formatTime(band.period, majorFormat) === formatTime(period, majorFormat)) {
      return { band, index: band.span++ };
    }
    bands.push({ period, span: 1, start: i });
    return { band: bands[bands.length - 1], index: 0 };
  });
  const showTick = (i: number) => {
    const { band, index } = ticks[i];
    return calendarOffset(periods[i]) % minorEvery === 0 && index + fit <= band.span;
  };
  const x = (i: number) => columnX(i, labelWidth, pitch);
  const width = chartWidth(periods, labelWidth, pitch);
  const gap = columnGapFor(pitch);
  // the top of something `height` high, `y` from the edge next to the cells
  const fromCells = (y: number, height = 0) => (top ? AXIS_HEIGHT - y - height : y);

  return (
    <svg width={width} height={AXIS_HEIGHT} style={{ display: "block" }}>
      <line x2={width} y1={fromCells(0.5)} y2={fromCells(0.5)} stroke={BORDER} />
      {periods.map(
        (period, i) =>
          showTick(i) && (
            // a bar over the labelled column, as wide as its cells
            <g key={period}>
              <rect x={x(i)} y={fromCells(TICKS_TOP, 2)} width={pitch - gap} height={2} fill={TEXT_PRIMARY} />
              <text x={x(i)} y={fromCells(TICKS_TOP + 13)} dominantBaseline="central" fill={TEXT_SECONDARY}>
                {formatTime(period, minorFormat)}
              </text>
            </g>
          ),
      )}
      {bands.map(({ period, span, start }, i) => {
        const label = formatTime(period, bandFormat(period, span, i === 0));
        const bandWidth = span * pitch - gap;
        // stays in view, beside the label column, while its band scrolls past
        const stick = `translateX(clamp(0px, calc(${SCROLL} + ${labelWidth - x(start)}px), ${bandWidth - 8 - CHAR_WIDTH * label.length}px))`;
        return (
          // a nested svg clips the label to its band
          <svg key={period} x={x(start)} y={fromCells(BANDS_TOP, BAND_HEIGHT)} width={bandWidth} height={BAND_HEIGHT}>
            <line x1={0.5} x2={0.5} y2={BAND_HEIGHT} stroke={TEXT_SECONDARY} />
            <text x={4} y={BAND_HEIGHT / 2} dominantBaseline="central" fill={TEXT_PRIMARY} style={{ transform: stick }}>
              {label}
            </text>
          </svg>
        );
      })}
      {/* the label column covers ticks and bands scrolling sideways beneath it, like the cells */}
      <rect y={fromCells(1, AXIS_HEIGHT - 1)} width={labelWidth} height={AXIS_HEIGHT - 1} fill={SURFACE} style={STICKY} />
    </svg>
  );
};

// Outlines the hovered cell and shows its exact values above it (below when the
// window has no room above), shifted horizontally by the cell's position so it
// stays within the visible part of the heatmap.
interface CellTooltipProps {
  kind: UtilizationKind;
  cell: SVGGElement;
  // the element the tooltip is placed in, around the scroll container, which would clip it
  frame: HTMLElement;
  metric: string;
  bucketLength: string;
}

const CellTooltip = ({ kind, cell, frame, metric, bucketLength }: CellTooltipProps) => {
  // the cell may have been removed by a refetch while hovered
  if (!cell.isConnected) return null;
  const { group, label, period, color, percent, detail, online, count } = cell.dataset;
  const percentLabel = percentMetric(kind, metric)?.legend;
  // the cell's box within the frame
  const box = cell.getBoundingClientRect();
  const origin = frame.getBoundingClientRect();
  const left = box.left - origin.left;
  const top = box.top - origin.top;
  const x = left + box.width / 2;
  const shift = Math.min(100, Math.max(0, (100 * x) / frame.clientWidth));
  const line = { display: "flex", alignItems: "center", gap: 6 };
  const below = box.top < TOOLTIP_HEIGHT;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: left - 2,
          top: top - 2,
          width: box.width + 4,
          height: box.height + 4,
          border: `2px solid ${TEXT_PRIMARY}`,
          pointerEvents: "none",
          zIndex: 4,
        }}
      />
      <div
        style={{
          ...TOOLTIP_STYLE,
          position: "absolute",
          left: x,
          top: below ? top + box.height + 6 : top - 6,
          transform: `translate(-${shift}%, ${below ? 0 : -100}%)`,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 4,
        }}
      >
        <div style={{ color: TEXT_SECONDARY }}>{formatTime(period!, AXES[bucketLength].tooltip)}</div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        {group !== label && <div style={{ color: TEXT_SECONDARY }}>{group}</div>}
        {online === undefined ? (
          <div style={line}>
            <Swatch background={OFFLINE} />
            Offline / no data
          </div>
        ) : percentLabel ? (
          <>
            <div style={line}>
              <Swatch background={color ?? NOT_REPORTED} />
              {percentLabel}: <strong>{percent === undefined ? "not reported" : `${percent}%`}</strong>
              {detail}
            </div>
            <div style={line}>
              <Swatch background={fill(color ?? NOT_REPORTED, Number(online))} />
              Time online: <strong>{online}%</strong>
            </div>
          </>
        ) : (
          <div style={line}>
            <Swatch background={color!} />
            {kind.count.label}: <strong>{count}</strong>
          </div>
        )}
      </div>
    </>
  );
};

interface ChartSvgProps extends GridProps {
  font: string;
  columns: Column[];
  axisTop: boolean;
}

// The legend above the columns, each a grid with its axis, in one standalone SVG,
// as drawn when scrolled to the start.
const ChartSvg = ({ font, columns, axisTop, ...props }: ChartSvgProps) => {
  const { kind, metric, max, periods, bucketLength, pitch, labelWidth } = props;
  const items = legendItems(kind, metric, max);
  const gridTop = CELL_SIZE + 8;
  // the axis, with the space below it on top as on screen
  const axisSpace = AXIS_HEIGHT + (axisTop ? 4 + TOP_AXIS_SPACE : 0);
  const heights = columns.map(({ groups, headers }) => gridRows(groups, headers).height);
  const columnWidth = chartWidth(periods, labelWidth, pitch);
  const width = Math.max(columns.length * (columnWidth + COLUMN_GAP) - COLUMN_GAP, legendLayout(items, font).width);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width + 2 * EXPORT_PADDING}
      height={gridTop + Math.max(...heights) + axisSpace + 2 * EXPORT_PADDING}
      fontFamily={font}
      fontSize={12}
    >
      <rect width="100%" height="100%" fill={SURFACE} />
      <g transform={`translate(${EXPORT_PADDING}, ${EXPORT_PADDING})`}>
        <LegendSvg items={items} font={font} />
        {columns.map(({ groups, headers }, i) => (
          <g key={i} transform={`translate(${i * (columnWidth + COLUMN_GAP)}, ${gridTop})`}>
            <g transform={`translate(0, ${axisTop ? axisSpace : 0})`}>
              <HeatmapGrid {...props} groups={groups} headers={headers} titles />
            </g>
            <g transform={`translate(0, ${axisTop ? 0 : heights[i]})`}>
              <Axis periods={periods} bucketLength={bucketLength} pitch={pitch} labelWidth={labelWidth} top={axisTop} />
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
};

/**
 * Renders the heatmap, with its legend and axes, as a standalone SVG document.
 * Loads the renderer on first use.
 */
const chartSvg = async (props: ChartSvgProps) => {
  const { renderToStaticMarkup } = await import("react-dom/server");
  return renderToStaticMarkup(<ChartSvg {...props} />);
};

// Rasterizes an SVG document at `scale` times its size.
const toPng = (svg: string, scale = 2) =>
  new Promise<Blob>((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = image.width * scale;
      canvas.height = image.height * scale;
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Too large for a PNG, try SVG"))), "image/png");
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to render the PNG"));
    };
    image.src = url;
  });

// Offers a file for download.
const saveFile = (blob: Blob, name: string) => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  // once the download has started
  setTimeout(() => URL.revokeObjectURL(link.href));
};

interface FloatingAxisProps {
  labelWidth: number;
  // above its grid, rather than below
  top: boolean;
  children: ReactNode;
}

// Floats at the top or bottom of the window while rows of its grid run past it, so
// it's outside any scroll container (sticky only follows the window from there),
// above the sticky grid and below the tooltip (4). Its shadow is outside the axis'
// own scroll container, which would clip it.
const FloatingAxis = ({ labelWidth, top, children }: FloatingAxisProps) => {
  const [axisRef, { height }] = useSize();
  // Whether the axis floats over rows. Below the grid: the end of the grid is behind
  // it or below the window, rather than above it or scrolled past. On top: where
  // the axis would be is scrolled above the window.
  const [floating, setFloating] = useState(false);
  // just before the axis: the end of the grid below it, or where the axis would be on top
  const before = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      const observer = new IntersectionObserver(
        ([entry]) => setFloating(!entry.isIntersecting && (top ? entry.boundingClientRect.top < 0 : entry.boundingClientRect.top > 0)),
        { rootMargin: top ? "0px" : `0px 0px -${height}px 0px` },
      );
      observer.observe(element);
      return () => observer.disconnect();
    },
    [height, top],
  );
  return (
    <>
      <div ref={before} style={{ height: 1 }} />
      <div
        ref={axisRef}
        style={{
          position: "sticky",
          [top ? "top" : "bottom"]: 0,
          zIndex: 3,
          background: SURFACE,
          ...(top && { paddingTop: TOP_AXIS_SPACE, paddingBottom: TOP_AXIS_SPACE }),
        }}
      >
        {scrollShadow(top ? "bottom" : "top", labelWidth, floating)}
        {children}
      </div>
    </>
  );
};

interface HeatmapProps extends ChartProps {
  // whether to split the rows into columns side by side, where they fit
  multiColumn: boolean;
  onMultiColumn: (multiColumn: boolean) => void;
  // the start of downloads' file names, which add the time span
  fileName: string;
  // whether the time axis is above the rows, rather than below
  axisTop: boolean;
  onAxisTop: (axisTop: boolean) => void;
}

const Heatmap = ({ multiColumn, onMultiColumn, fileName, axisTop, onAxisTop, ...props }: HeatmapProps) => {
  const { kind, data, metric, groups, headers, bucketLength, length, start, end } = props;
  const [cell, setCell] = useState<SVGGElement | null>(null);
  const [fitToWidth, setFitToWidth] = useState(true);
  // each column's label width, as measured by its grid; all columns use the widest
  const [labelWidths, setLabelWidths] = useState<number[]>([]);
  const labelWidth = labelWidths.reduce((widest, width) => Math.max(widest, width), 0);
  const [exportError, setExportError] = useState<string>();
  const [rootRef, { width }, root] = useSize();
  // state rather than a ref, as rendering the tooltip needs it
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const axis = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });
  const periods = useMemo(
    () => bucketStarts(String(data[0].period_start), bucketLength, length, start, end),
    [data, bucketLength, length, start, end],
  );
  const max = Math.max(...data.map((row) => Number(row[kind.count.column])));
  // the pitch that fits the width (less a pixel against rounding, at least 1px); full size until measured
  const fitPitch = width ? Math.max(1, (width - labelWidth - 1) / periods.length) : CELL_SIZE + 2;
  const pitch = Math.min(CELL_SIZE + 2, fitToWidth ? fitPitch : Math.max(fitPitch, MIN_PITCH));
  const scrollable = !fitToWidth && fitPitch < MIN_PITCH;
  const columnCount = Math.min(
    Math.floor((width + COLUMN_GAP) / (chartWidth(periods, labelWidth, CELL_SIZE + 2) + COLUMN_GAP)),
    Math.floor(groups.length / MIN_COLUMN_ROWS),
  );
  const columns = useMemo(
    () => (multiColumn && columnCount > 1 ? splitColumns(groups, headers, columnCount) : [{ groups, headers }]),
    [multiColumn, columnCount, groups, headers],
  );
  // drops the widths of columns no longer shown
  const count = columns.length;
  const onLabelWidths = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => (labelWidth: number) =>
        setLabelWidths((widths) => {
          if (widths.length <= count && widths[i] === labelWidth) return widths;
          const next = widths.slice(0, count);
          next[i] = labelWidth;
          return next;
        }),
      ),
    [count],
  );
  // the sticky parts of the SVGs follow the scroll position
  const setScroll = (left: number) => root.current?.style.setProperty("--scroll", `${left}px`);
  // also when a new width or pitch moves it without a scroll event
  useLayoutEffect(() => {
    setScroll(container.current?.scrollLeft ?? 0);
  });
  // The heatmap and the axis scroll together, whichever is scrolled; only the
  // axis shows a scrollbar, as it stays in the window.
  const syncScroll = (from: HTMLDivElement, to: HTMLDivElement | null) => {
    if (to && to.scrollLeft !== from.scrollLeft) to.scrollLeft = from.scrollLeft;
    setScroll(from.scrollLeft);
    // the tooltip doesn't scroll along with its cell, so it shows again on the next move
    setCell(null);
    const atStart = from.scrollLeft <= 0;
    const atEnd = from.scrollLeft + from.clientWidth >= from.scrollWidth - 1;
    if (atStart !== edges.atStart || atEnd !== edges.atEnd) setEdges({ atStart, atEnd });
  };
  const download = async (format: "svg" | "png") => {
    setExportError(undefined);
    try {
      const font = getComputedStyle(root.current!).fontFamily;
      const svg = await chartSvg({ ...props, periods, max, pitch, labelWidth, font, columns, axisTop });
      const blob = format === "svg" ? new Blob([svg], { type: "image/svg+xml" }) : await toPng(svg);
      // in UTC, from the start of the first bucket to the end of the last
      const time = (period: DateTime) => period.toFormat("yyyy-MM-dd'T'HHmm'Z'");
      const from = time(toUtc(periods[0]));
      const to = time(toUtc(periods[periods.length - 1]).plus(DURATIONS[bucketLength]));
      saveFile(blob, `${fileName}_${from}_${to}.${format}`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : String(error));
    }
  };
  const hover = {
    onMouseMove: ({ target }: { target: EventTarget }) =>
      setCell((target as Element).closest<SVGGElement>("[data-period]")),
    onMouseLeave: () => setCell(null),
  };
  const grid = (column: Column, i: number) => (
    <HeatmapGrid
      {...props}
      groups={column.groups}
      headers={column.headers}
      periods={periods}
      max={max}
      pitch={pitch}
      labelWidth={labelWidth}
      onLabelWidth={onLabelWidths[i]}
    />
  );
  const axisSvg = (
    <Axis periods={periods} bucketLength={bucketLength} pitch={pitch} labelWidth={labelWidth} top={axisTop} />
  );
  const columnAxis = (
    <FloatingAxis labelWidth={labelWidth} top={axisTop}>
      <div style={{ paddingBottom: 4 }}>{axisSvg}</div>
    </FloatingAxis>
  );
  const singleAxis = (
    <FloatingAxis labelWidth={labelWidth} top={axisTop}>
      <div
        ref={axis}
        style={{ overflowX: "auto", paddingBottom: 4 }}
        onScroll={(event) => syncScroll(event.currentTarget, container.current)}
      >
        {axisSvg}
      </div>
    </FloatingAxis>
  );
  // outside any scroll container, which would clip it at the ends and below short heatmaps
  const tooltip = cell && frame && (
    <CellTooltip kind={kind} cell={cell} frame={frame} metric={metric} bucketLength={bucketLength} />
  );
  return (
    <div ref={rootRef} className="my-3" style={{ fontSize: 12, color: TEXT_SECONDARY }}>
      <HStack gap={8} mb={2} wrap="wrap">
        <Legend items={legendItems(kind, metric, max)} />
        {/* the options and downloads wrap below the legend together, rather than one by one */}
        <HStack gap={8}>
          {fitPitch < MIN_PITCH && (
            <OptionSwitch label="Fit to width" checked={fitToWidth} onChange={setFitToWidth} />
          )}
          {columnCount > 1 && (
            <OptionSwitch label="Multiple columns" checked={multiColumn} onChange={onMultiColumn} />
          )}
          <OptionSwitch label="Axis on top" checked={axisTop} onChange={onAxisTop} />
          <HStack gap={2}>
            <Button size="xs" variant="outline" onClick={() => void download("svg")}>
              Download SVG
            </Button>
            <Button size="xs" variant="outline" onClick={() => void download("png")}>
              Download PNG
            </Button>
            {exportError}
          </HStack>
        </HStack>
      </HStack>
      {count > 1 ? (
        // full size columns, which fit without scrolling, each with its own axis
        <div
          ref={setFrame}
          style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: COLUMN_GAP }}
          {...hover}
        >
          {columns.map((column, i) => (
            <div key={i}>
              {axisTop && columnAxis}
              {grid(column, i)}
              {!axisTop && columnAxis}
            </div>
          ))}
          {tooltip}
        </div>
      ) : (
        <>
          {axisTop && singleAxis}
          <div ref={setFrame} style={{ position: "relative" }} {...hover}>
            <div
              ref={container}
              // room for the hover outline of the first row
              style={{ position: "relative", overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", paddingTop: 2 }}
              onScroll={(event) => syncScroll(event.currentTarget, axis.current)}
            >
              {grid(columns[0], 0)}
            </div>
            {scrollShadow("left", labelWidth, scrollable && !edges.atStart)}
            {scrollShadow("right", 0, scrollable && !edges.atEnd)}
            {tooltip}
          </div>
          {!axisTop && singleAxis}
        </>
      )}
    </div>
  );
};

// Explains the metrics of a view, in a popover opened by clicking an info icon.
const InfoButton = ({ children }: { children: ReactNode }) => (
  <Popover.Root positioning={{ placement: "bottom-end" }}>
    <Popover.Trigger asChild>
      <IconButton aria-label="About these numbers" title="About these numbers" size="sm" variant="ghost">
        <LuInfo />
      </IconButton>
    </Popover.Trigger>
    <Portal>
      <Popover.Positioner>
        <Popover.Content width="420px" style={{ fontSize: 13 }}>
          <Popover.Arrow />
          <Popover.Body>
            <Popover.Title fontWeight="semibold">About these numbers</Popover.Title>
            {children}
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Portal>
  </Popover.Root>
);

interface UtilizationViewProps {
  // GPU_UTILIZATION_QUERY_NAME or CPU_UTILIZATION_QUERY_NAME
  queryName: string;
  querySelect: ReactNode;
}

const UtilizationView = ({ queryName, querySelect }: UtilizationViewProps) => {
  const kind = UTILIZATION_KINDS[queryName];
  const [level, setLevel] = useState(kind.levels[0]);
  const [bucketLength, setBucketLength] = useState("1 hour");
  const [length, setLength] = useState("1 day");
  const [metric, setMetric] = useState(UTILIZATION);
  const [showGroups, setShowGroups] = useState(false);
  const { cluster_id } = useAppState().currentBackendSpec();
  // here rather than in Heatmap, which is replaced while new data loads
  const [multiColumn, setMultiColumn] = useState(false);
  const [axisTop, setAxisTop] = useState(true);
  const today = DateTime.utc().toISODate();
  const [range, setRange] = useState({ start: DateTime.utc().minus({ days: 7 }).toISODate(), end: today });

  // a custom range includes its end day
  const custom =
    length === CUSTOM ? { start: toUtc(range.start).toISO()!, end: toUtc(range.end).plus({ days: 1 }).toISO()! } : undefined;
  const customSeconds = (dates: typeof range) => toUtc(dates.end).plus({ days: 1 }).diff(toUtc(dates.start)).as("seconds");
  // Presets are limited to what fits the bucket length; with a custom range,
  // the bucket lengths are limited to what fits the range instead.
  const lengths = createListCollection<Option>({
    items: [
      ...LENGTHS.map((value) => ({ label: value, value, disabled: !isValidSpan(bucketLength, seconds(value)) })),
      { label: "Custom…", value: CUSTOM },
    ],
  });
  const bucketLengths = options(BUCKET_LENGTHS, (value) => custom !== undefined && !isValidSpan(value, customSeconds(range)));
  // the finest bucket length that fits a custom range, if the current one doesn't
  const fitBucketLength = (dates: typeof range) => {
    if (!isValidSpan(bucketLength, customSeconds(dates))) {
      setBucketLength(BUCKET_LENGTHS.find((value) => isValidSpan(value, customSeconds(dates))) ?? bucketLength);
    }
  };
  const changeLength = (value: string) => {
    setLength(value);
    if (value === CUSTOM) fitBucketLength(range);
  };
  const changeRange = (dates: typeof range) => {
    setRange(dates);
    fitBucketLength(dates);
  };
  const metrics = createListCollection<Option>({
    items: [
      ...kind.metrics.map(({ label, value }) => ({ label, value })),
      { label: kind.count.label, value: kind.count.column },
    ].map((item) => ({ ...item, disabled: !isValidMetric(kind, level, item.value) })),
  });
  const changeLevel = (value: string) => {
    setLevel(value);
    if (!isValidMetric(kind, value, metric)) setMetric(UTILIZATION);
  };
  // Keep the time range valid for a new bucket length by snapping it to the
  // nearest allowed range.
  const changeBucketLength = (value: string) => {
    setBucketLength(value);
    if (length !== CUSTOM && !isValidSpan(value, seconds(length))) {
      const valid = LENGTHS.filter((l) => isValidSpan(value, seconds(l)));
      setLength(seconds(length) > seconds(valid[valid.length - 1]) ? valid[valid.length - 1] : valid[0]);
    }
  };

  const { data, isLoading, error } = useDataFrameQuery(kind.queryName, {
    level,
    bucket_length: bucketLength,
    ...(custom ?? { length }),
  });

  // models or manufacturers can be blank for cards without sysinfo
  const labels = new Map(
    (data ?? []).map((row) => [String(row[kind.groupColumn]), String(row[kind.labelColumn ?? kind.groupColumn] || "unknown")]),
  );
  // Groups are listed in sections, e.g. cards by model, nodes by CPU model.
  const sections = new Map((data ?? []).map((row) => [String(row[kind.groupColumn]), kind.section(level, row) ?? ""]));
  // labels compared numerically so that e.g. "GPU 2" sorts before "GPU 10"
  const groups = [...labels.keys()].sort(
    (a, b) =>
      sections.get(a)!.localeCompare(sections.get(b)!) ||
      labels.get(a)!.localeCompare(labels.get(b)!, undefined, { numeric: true }),
  );
  // a header above the first group of each section, e.g. "NVIDIA · Tesla V100 (16 cards)"
  const headers = new Map<string, string>();
  if (data?.some((row) => kind.section(level, row) !== undefined)) {
    groups.forEach((group, i) => {
      const section = sections.get(group);
      if (i > 0 && sections.get(groups[i - 1]) === section) return;
      const count = groups.filter((other) => sections.get(other) === section).length;
      headers.set(group, `${section} (${count} ${kind.unit(level)}${count === 1 ? "" : "s"})`);
    });
  }

  let chart;
  if (isLoading)
    chart = (
      <div className="my-3" style={{ color: TEXT_SECONDARY }}>
        <BarLoader />
        Loading - long time ranges can take up to half a minute
      </div>
    );
  else if (error) chart = "Failed to load data";
  else if (!data?.length) chart = "No data available for this time range";
  else
    chart = (
      <Heatmap
        kind={kind}
        data={data}
        metric={metric}
        groups={groups}
        labels={labels}
        headers={headers}
        showGroups={level === kind.unitLevel && showGroups}
        bucketLength={bucketLength}
        length={length}
        start={custom?.start}
        end={custom?.end}
        multiColumn={multiColumn}
        onMultiColumn={setMultiColumn}
        axisTop={axisTop}
        onAxisTop={setAxisTop}
        // e.g. ex3.simula.no_gpu-utilization_card_utilization_1-hour
        fileName={[cluster_id, kind.queryName, level, metric, bucketLength.replace(/\s+/g, "-")].join("_")}
      />
    );

  return (
    <div className="my-3">
      <HStack alignItems="end" wrap="wrap">
        {querySelect}
        <ParamSelect label="Aggregation level" collection={options(kind.levels)} value={level} onChange={changeLevel} />
        <ParamSelect label="Bucket length" collection={bucketLengths} value={bucketLength} onChange={changeBucketLength} />
        <ParamSelect label="Time range" collection={lengths} value={length} onChange={changeLength} />
        {custom && (
          <>
            <DateInput label="From" value={range.start} max={range.end} onChange={(start) => changeRange({ ...range, start })} />
            <DateInput label="To" value={range.end} min={range.start} max={today} onChange={(end) => changeRange({ ...range, end })} />
          </>
        )}
        <ParamSelect label="Metric" collection={metrics} value={metric} onChange={setMetric} width="240px" />
        {kind.showGroupsLabel && level === kind.unitLevel && (
          <OptionSwitch label={kind.showGroupsLabel} checked={showGroups} onChange={setShowGroups} mb={2} />
        )}
        <InfoButton>{kind.info}</InfoButton>
      </HStack>
      {chart}
    </div>
  );
};

export default UtilizationView;
