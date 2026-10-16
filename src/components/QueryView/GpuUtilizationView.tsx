import { memo, ReactNode, RefCallback, useCallback, useMemo, useRef, useState } from "react";
import { DateTime, Duration, DurationLikeObject, DurationUnit } from "luxon";
import { BarLoader } from "react-spinners";
import { createListCollection, Field, HStack, Input, ListCollection, Switch } from "@chakra-ui/react";
import useDataFrameQuery, { Row } from "../../hooks/useDataFrameQuery";
import {
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "../ui/select";

export const GPU_UTILIZATION_QUERY_NAME = "gpu-utilization";

interface Option {
  label: string;
  value: string;
  disabled?: boolean;
}

const options = (values: string[], isDisabled: (value: string) => boolean = () => false) =>
  createListCollection<Option>({ items: values.map((value) => ({ label: value, value, disabled: isDisabled(value) })) });

// Mirrors GPUUtilizationAggregationLevel / GPUUtilizationBucketLength / GPUUtilizationLength
// in slurm_monitor/db/query.py - keep in sync with the backend enums.
const levels = options(["card", "model", "manufacturer"]);
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
const UTILIZATION = "utilization";
const GPUS = "gpus_reporting";
// Metrics shown on a 0-100% color scale, with a box sized by time online:
// the column holding each, and its legend label.
const PERCENT_METRICS: Record<string, { column: string; label: string }> = {
  [UTILIZATION]: { column: "avg_utilization_percent_while_online", label: "Utilization while online" },
  power: { column: "power_percent_of_limit", label: "Power while online (% of limit)" },
};
const METRICS: Option[] = [
  { label: "Utilization & time online", value: UTILIZATION },
  { label: "Power & time online", value: "power" },
  { label: "GPUs reporting", value: GPUS },
];
// At card level every group is a single card, so GPUs reporting is always 1.
const isValidMetric = (level: string, metric: string) => level !== "card" || metric !== GPUS;

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
// default, amber for power. Both checked for colour-blind safety.
const BLUE = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
const AMBER = ["#ffeab1", "#ffcc5f", "#f5af20", "#df9201", "#bd7200", "#985704", "#743c01"];
const rampFor = (metric: string) => (metric === "power" ? AMBER : BLUE);
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
// rough tooltip height, for placing it below cells near the top
const TOOLTIP_HEIGHT = 100;
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
// A cell with a centered box whose area is `percent` of the cell, on the offline color.
const fill = (color: string, percent: number) => {
  const side = 100 * Math.sqrt(Math.min(percent, 100) / 100);
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
// or rows beneath the floating axis ("top" of the axis).
const scrollShadow = (side: "left" | "right" | "top", offset: number, visible: boolean) => (
  <div
    style={{
      position: "absolute",
      // the side shadows start below the scroll container's 2px top padding
      ...(side === "top" ? { left: offset, right: 0, bottom: "100%", height: 16 } : { top: 2, bottom: 0, [side]: offset, width: 16 }),
      background: `linear-gradient(to ${{ left: "right", right: "left", top: "top" }[side]}, rgba(0, 0, 0, 0.15), transparent)`,
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

const Legend = ({ metric, max }: { metric: string; max: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
    {metric === GPUS ? "GPUs reporting: 0" : `${PERCENT_METRICS[metric].label}: 0%`}
    {rampFor(metric).map((step) => (
      <span key={step} style={{ background: step, width: 24, height: 12 }} />
    ))}
    {metric === GPUS ? max : "100%"}
    {metric !== GPUS && (
      <>
        <span style={{ background: fill(rampFor(metric)[3], 25), width: CELL_SIZE, height: CELL_SIZE, marginLeft: 16 }} />
        <span style={{ background: fill(rampFor(metric)[3], 100), width: CELL_SIZE, height: CELL_SIZE }} />
        box area = time online
        <span style={{ background: fill(NOT_REPORTED, 100), width: 24, height: 12, marginLeft: 16 }} />
        not reported
      </>
    )}
    <span style={{ background: OFFLINE, width: 24, height: 12, marginLeft: 16 }} />
    offline / no data
  </div>
);

// narrow columns drop their gaps, so that a year of days still fits the width
const columnGapFor = (pitch: number) => (pitch >= 6 ? 2 : pitch >= 3 ? 1 : 0);
// the cell columns of the heatmap and its axis, after the label column
const columnsFor = (count: number, pitch: number) => `repeat(${count}, ${pitch - columnGapFor(pitch)}px)`;

interface GridProps extends ChartProps {
  periods: string[];
  max: number;
  // distance between columns
  pitch: number;
  // measures the label column
  labelRef: RefCallback<HTMLDivElement>;
}

// One row per group, one cell per period. Percentage metric cells are colored by
// the metric while online, with a centered box sized by time online. Memoized
// so hovering, which only re-renders the tooltip in Heatmap, doesn't re-render
// every cell.
const HeatmapGrid = memo(function HeatmapGrid({
  data,
  metric,
  groups,
  labels,
  headers,
  showGroups,
  periods,
  max,
  pitch,
  labelRef,
}: GridProps) {
  // memoized so a new pitch (resizing, fit to width) only changes the columns
  const cells = useMemo(() => {
    const rows = new Map(data.map((row) => [`${row.gpu_group}|${toUtc(String(row.period_start)).toISO()}`, row]));
    const cell = (group: string, period: string) => {
      const row = rows.get(`${group}|${period}`);
      const online = toNumber(row?.percent_time_online);
      const gpus = toNumber(row?.gpus_reporting);
      const percent = metric === GPUS ? undefined : toNumber(row?.[PERCENT_METRICS[metric].column]);
      const value = metric === GPUS ? gpus : percent;
      const color = value === undefined ? undefined : ramp(rampFor(metric), value / (metric === GPUS ? max : 100));
      return (
        <div
          key={`${group}|${period}`}
          data-group={group}
          data-label={labels.get(group)}
          data-period={period}
          data-color={color}
          data-percent={percent}
          data-watts={row?.avg_power_watts ?? undefined}
          data-limit={row?.avg_power_limit_watts ?? undefined}
          data-online={online}
          data-gpus={gpus}
          style={{
            background: online === undefined ? OFFLINE : fill(color ?? NOT_REPORTED, metric === GPUS ? 100 : online),
            height: CELL_SIZE,
          }}
        />
      );
    };
    // labels and headers stay in view when scrolling sideways, above the scroll shadows
    const sticky = { position: "sticky", left: 0, background: SURFACE, zIndex: 2 } as const;
    return groups.map((group, i) => [
      headers.has(group) && (
        // covers the scroll shadows, which only belong beside cell rows
        <div
          key={`header|${group}`}
          style={{ gridColumn: "1 / -1", paddingTop: i ? 12 : 0, position: "relative", zIndex: 2, background: SURFACE }}
        >
          <span style={{ ...sticky, display: "inline-block", color: TEXT_PRIMARY, fontWeight: 600 }}>
            {headers.get(group)}
          </span>
        </div>
      ),
      <div
        key={group}
        ref={i === 0 ? labelRef : undefined}
        style={{ ...sticky, paddingRight: 8, whiteSpace: "nowrap", lineHeight: `${CELL_SIZE}px` }}
      >
        {showGroups ? group : labels.get(group)}
      </div>,
      ...periods.map((period) => cell(group, period)),
    ]);
  }, [data, metric, groups, labels, headers, showGroups, periods, max, labelRef]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `max-content ${columnsFor(periods.length, pitch)}`,
        columnGap: columnGapFor(pitch),
        rowGap: 2,
        width: "max-content",
      }}
    >
      {cells}
    </div>
  );
});

interface AxisProps {
  periods: string[];
  bucketLength: string;
  pitch: number;
  labelWidth: number;
}

// Minor ticks per column and major bands below them, laid out in the heatmap's
// columns.
const Axis = ({ periods, bucketLength, pitch, labelWidth }: AxisProps) => {
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
  const bands: { period: string; span: number }[] = [];
  const ticks = periods.map((period) => {
    const band = bands[bands.length - 1];
    if (band && formatTime(band.period, majorFormat) === formatTime(period, majorFormat)) {
      return { band, index: band.span++ };
    }
    bands.push({ period, span: 1 });
    return { band: bands[bands.length - 1], index: 0 };
  });
  const showTick = (i: number) => {
    const { band, index } = ticks[i];
    return calendarOffset(periods[i]) % minorEvery === 0 && index + fit <= band.span;
  };

  // the label column covers ticks and bands scrolling sideways beneath it, like the cells
  const mask = <div style={{ position: "sticky", left: 0, zIndex: 1, background: SURFACE }} />;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${labelWidth}px ${columnsFor(periods.length, pitch)}`,
        columnGap: columnGapFor(pitch),
        rowGap: 2,
        width: "max-content",
        borderTop: `1px solid ${BORDER}`,
        paddingTop: 2,
      }}
    >
      {mask}
      {periods.map((period, i) => (
        <div
          key={period}
          // a bar under the labelled column, as wide as its cells
          style={{
            borderTop: `2px solid ${showTick(i) ? TEXT_PRIMARY : "transparent"}`,
            paddingTop: 2,
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {showTick(i) ? formatTime(period, minorFormat) : ""}
        </div>
      ))}
      {mask}
      {bands.map(({ period, span }, i) => (
        <div
          key={period}
          style={{
            gridColumn: `span ${span}`,
            borderLeft: `1px solid ${TEXT_SECONDARY}`,
            paddingLeft: 4,
            color: TEXT_PRIMARY,
            whiteSpace: "nowrap",
            // clip rather than hidden, which would stop the label sticking
            overflow: "clip",
            textOverflow: "ellipsis",
            minWidth: 0,
          }}
        >
          {/* stays in view, beside the label column, while its band scrolls past */}
          <span style={{ position: "sticky", left: labelWidth + 4, display: "inline-block" }}>
            {formatTime(period, bandFormat(period, span, i === 0))}
          </span>
        </div>
      ))}
    </div>
  );
};

// Outlines the hovered cell and shows its exact values above it, shifted
// horizontally by the cell's position so it stays within the heatmap.
const CellTooltip = ({ cell, metric, bucketLength }: { cell: HTMLElement; metric: string; bucketLength: string }) => {
  // the cell may have been removed by a refetch while hovered
  if (!cell.offsetParent) return null;
  const { group, label, period, color, percent, watts, limit, online, gpus } = cell.dataset;
  const x = cell.offsetLeft + cell.offsetWidth / 2;
  const shift = (100 * x) / (cell.offsetParent as HTMLElement).scrollWidth;
  const line = { display: "flex", alignItems: "center", gap: 6 };
  // below the cell near the top, as the scroll container clips anything above it
  const below = cell.offsetTop < TOOLTIP_HEIGHT;
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: cell.offsetLeft - 2,
          top: cell.offsetTop - 2,
          width: cell.offsetWidth + 4,
          height: cell.offsetHeight + 4,
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
          top: below ? cell.offsetTop + cell.offsetHeight + 6 : cell.offsetTop - 6,
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
        ) : metric !== GPUS ? (
          <>
            <div style={line}>
              <Swatch background={color ?? NOT_REPORTED} />
              {PERCENT_METRICS[metric].label}: <strong>{percent === undefined ? "not reported" : `${percent}%`}</strong>
              {metric === "power" && watts !== undefined && ` (${watts} W of ${limit} W)`}
            </div>
            <div style={line}>
              <Swatch background={fill(color ?? NOT_REPORTED, Number(online))} />
              Time online: <strong>{online}%</strong>
            </div>
          </>
        ) : (
          <div style={line}>
            <Swatch background={color!} />
            GPUs reporting: <strong>{gpus}</strong>
          </div>
        )}
      </div>
    </>
  );
};

const Heatmap = (props: ChartProps) => {
  const { data, metric, bucketLength, length, start, end } = props;
  const [cell, setCell] = useState<HTMLElement | null>(null);
  const [fitToWidth, setFitToWidth] = useState(true);
  const [containerRef, { width: containerWidth }, container] = useSize();
  const [labelRef, { width: labelWidth }] = useSize();
  const [axisRef, { height: axisHeight }] = useSize();
  const axis = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });
  // Whether the axis floats over rows: the end of the grid is behind it or below
  // the window, rather than above it or scrolled past.
  const [floating, setFloating] = useState(false);
  const gridEnd = useCallback(
    (element: HTMLDivElement | null) => {
      if (!element) return;
      const observer = new IntersectionObserver(
        ([entry]) => setFloating(!entry.isIntersecting && entry.boundingClientRect.top > 0),
        { rootMargin: `0px 0px -${axisHeight}px 0px` },
      );
      observer.observe(element);
      return () => observer.disconnect();
    },
    [axisHeight],
  );
  const periods = useMemo(
    () => bucketStarts(String(data[0].period_start), bucketLength, length, start, end),
    [data, bucketLength, length, start, end],
  );
  const max = Math.max(...data.map((row) => Number(row.gpus_reporting)));
  // the pitch that fits the width (less a pixel against rounding, at least 1px); full size until measured
  const fitPitch = containerWidth ? Math.max(1, (containerWidth - labelWidth - 1) / periods.length) : CELL_SIZE + 2;
  const pitch = Math.min(CELL_SIZE + 2, fitToWidth ? fitPitch : Math.max(fitPitch, MIN_PITCH));
  const scrollable = !fitToWidth && fitPitch < MIN_PITCH;
  // The heatmap and the axis scroll together, whichever is scrolled; only the
  // axis shows a scrollbar, as it stays at the bottom of the window.
  const syncScroll = (from: HTMLDivElement, to: HTMLDivElement | null) => {
    if (to && to.scrollLeft !== from.scrollLeft) to.scrollLeft = from.scrollLeft;
    const atStart = from.scrollLeft <= 0;
    const atEnd = from.scrollLeft + from.clientWidth >= from.scrollWidth - 1;
    if (atStart !== edges.atStart || atEnd !== edges.atEnd) setEdges({ atStart, atEnd });
  };
  return (
    <div className="my-3" style={{ fontSize: 12, color: TEXT_SECONDARY }}>
      <HStack gap={8} mb={2} wrap="wrap">
        <Legend metric={metric} max={max} />
        {fitPitch < MIN_PITCH && (
          <Switch.Root size="sm" checked={fitToWidth} onCheckedChange={(event) => setFitToWidth(event.checked)}>
            <Switch.HiddenInput />
            <Switch.Control />
            <Switch.Label>Fit to width</Switch.Label>
          </Switch.Root>
        )}
      </HStack>
      <div style={{ position: "relative" }}>
        {/* the tooltip lives in the scroll container, so it scrolls along with the cells */}
        <div
          ref={containerRef}
          // room for the hover outline of the first row
          style={{ position: "relative", overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", paddingTop: 2 }}
          onScroll={(event) => syncScroll(event.currentTarget, axis.current)}
          onMouseMove={(event) => {
            const target = event.target as HTMLElement;
            setCell(target.dataset.period ? target : null);
          }}
          onMouseLeave={() => setCell(null)}
        >
          <HeatmapGrid {...props} periods={periods} max={max} pitch={pitch} labelRef={labelRef} />
          {cell && <CellTooltip cell={cell} metric={metric} bucketLength={bucketLength} />}
        </div>
        {scrollShadow("left", labelWidth, scrollable && !edges.atStart)}
        {scrollShadow("right", 0, scrollable && !edges.atEnd)}
      </div>
      <div ref={gridEnd} style={{ height: 1 }} />
      {/* Floats at the bottom of the window while rows run past it, so it's outside the
          scroll container (sticky only follows the window from there), above the sticky
          labels (2) and below the tooltip (4). Its shadow is outside the axis' own scroll
          container, which would clip it. */}
      <div ref={axisRef} style={{ position: "sticky", bottom: 0, zIndex: 3, background: SURFACE }}>
        {scrollShadow("top", labelWidth, floating)}
        <div
          ref={axis}
          style={{ overflowX: "auto", paddingBottom: 4 }}
          onScroll={(event) => syncScroll(event.currentTarget, container.current)}
        >
          <Axis periods={periods} bucketLength={bucketLength} pitch={pitch} labelWidth={labelWidth} />
        </div>
      </div>
    </div>
  );
};

const GpuUtilizationView = ({ querySelect }: { querySelect: ReactNode }) => {
  const [level, setLevel] = useState("card");
  const [bucketLength, setBucketLength] = useState("1 hour");
  const [length, setLength] = useState("1 day");
  const [metric, setMetric] = useState(METRICS[0].value);
  const [showUuids, setShowUuids] = useState(false);
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
    items: METRICS.map((item) => ({ ...item, disabled: !isValidMetric(level, item.value) })),
  });
  const changeLevel = (value: string) => {
    setLevel(value);
    if (!isValidMetric(value, metric)) setMetric(UTILIZATION);
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

  const { data, isLoading, error } = useDataFrameQuery(GPU_UTILIZATION_QUERY_NAME, {
    level,
    bucket_length: bucketLength,
    ...(custom ?? { length }),
  });

  // models or manufacturers can be blank for cards without sysinfo
  const labels = new Map((data ?? []).map((row) => [String(row.gpu_group), String(row.gpu_label || "unknown")]));
  // Groups are listed in sections: cards by model, models by manufacturer.
  const sections = new Map(
    (data ?? []).map((row) => [
      String(row.gpu_group),
      level === "card"
        ? `${row.manufacturer || "unknown"} · ${row.model || "unknown model"}`
        : level === "model"
          ? String(row.manufacturer || "unknown")
          : "",
    ]),
  );
  // labels compared numerically so that e.g. "GPU 2" sorts before "GPU 10"
  const groups = [...labels.keys()].sort(
    (a, b) =>
      sections.get(a)!.localeCompare(sections.get(b)!) ||
      labels.get(a)!.localeCompare(labels.get(b)!, undefined, { numeric: true }),
  );
  // a header above the first group of each section, e.g. "NVIDIA · Tesla V100 (16 cards)"
  const headers = new Map<string, string>();
  if (level !== "manufacturer") {
    groups.forEach((group, i) => {
      const section = sections.get(group);
      if (i > 0 && sections.get(groups[i - 1]) === section) return;
      const count = groups.filter((other) => sections.get(other) === section).length;
      headers.set(group, `${section} (${count} ${level === "card" ? "card" : "model"}${count === 1 ? "" : "s"})`);
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
        data={data}
        metric={metric}
        groups={groups}
        labels={labels}
        headers={headers}
        showGroups={level === "card" && showUuids}
        bucketLength={bucketLength}
        length={length}
        start={custom?.start}
        end={custom?.end}
      />
    );

  return (
    <div className="my-3">
      <HStack alignItems="end" wrap="wrap">
        {querySelect}
        <ParamSelect label="Aggregation level" collection={levels} value={level} onChange={changeLevel} />
        <ParamSelect label="Bucket length" collection={bucketLengths} value={bucketLength} onChange={changeBucketLength} />
        <ParamSelect label="Time range" collection={lengths} value={length} onChange={changeLength} />
        {custom && (
          <>
            <DateInput label="From" value={range.start} max={range.end} onChange={(start) => changeRange({ ...range, start })} />
            <DateInput label="To" value={range.end} min={range.start} max={today} onChange={(end) => changeRange({ ...range, end })} />
          </>
        )}
        <ParamSelect label="Metric" collection={metrics} value={metric} onChange={setMetric} width="240px" />
        {level === "card" && (
          <Switch.Root size="sm" mb={2} checked={showUuids} onCheckedChange={(event) => setShowUuids(event.checked)}>
            <Switch.HiddenInput />
            <Switch.Control />
            <Switch.Label>Show UUIDs</Switch.Label>
          </Switch.Root>
        )}
      </HStack>
      {chart}
    </div>
  );
};

export default GpuUtilizationView;
