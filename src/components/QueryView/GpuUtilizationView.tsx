import { memo, useCallback, useMemo, useState } from "react";
import { DateTime, Duration, DurationLikeObject } from "luxon";
import { BarLoader } from "react-spinners";
import { createListCollection, HStack, ListCollection, Switch } from "@chakra-ui/react";
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
const bucketLengths = options(["15 minutes", "1 hour", "1 day", "1 week", "1 month"]);
const LENGTHS = ["15 minutes", "1 hour", "1 day", "1 week", "1 month", "1 year"];
const DURATIONS: Record<string, DurationLikeObject> = {
  "15 minutes": { minutes: 15 },
  "1 hour": { hours: 1 },
  "1 day": { days: 1 },
  "1 week": { weeks: 1 },
  "1 month": { months: 1 },
  "1 year": { years: 1 },
};
const seconds = (value: string) => Duration.fromObject(DURATIONS[value]).as("seconds");
// Caps the number of buckets (heatmap columns) to keep rendering fast,
// e.g. 1 hour buckets go up to 1 week, 1 day buckets up to 1 year.
const MAX_BUCKETS = 400;
const isValidLength = (bucketLength: string, length: string) => {
  const buckets = seconds(length) / seconds(bucketLength);
  return buckets >= 1 && buckets <= MAX_BUCKETS;
};
const UTILIZATION = "utilization";
const METRICS: Option[] = [
  { label: "Utilization & time online", value: UTILIZATION },
  { label: "GPUs reporting", value: "gpus_reporting" },
];
// At card level every group is a single card, so GPUs reporting is always 1.
const isValidMetric = (level: string, metric: string) => level !== "card" || metric !== "gpus_reporting";

interface ParamSelectProps {
  label: string;
  collection: ListCollection<Option>;
  value: string;
  onChange: (value: string) => void;
}

const ParamSelect = ({ label, collection, value, onChange }: ParamSelectProps) => (
  <SelectRoot
    collection={collection}
    size="sm"
    width="240px"
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

// Single-hue ramp (light = low, dark = high) for heatmap magnitude.
const SEQUENTIAL = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
const OFFLINE = "#f0efec";
// Cells are at most this wide, so they are square unless there are many buckets.
const CELL_SIZE = 20;
const TEXT_PRIMARY = "#1f1e1c";
const TEXT_SECONDARY = "#52514e";
const TOOLTIP_STYLE = {
  background: "#fff",
  border: "1px solid #e4e3df",
  borderRadius: 6,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.12)",
  padding: "6px 10px",
  fontSize: 12,
  color: TEXT_PRIMARY,
};

const toUtc = (ts: string) => DateTime.fromISO(ts, { zone: "utc" });
const formatTime = (ts: string, format: string) => toUtc(ts).toFormat(format);
// Per bucket length: the minor axis tick format, the major axis band (format and
// calendar unit), the steps (in buckets) minor ticks may be spaced by, and the
// tooltip format. Minor ticks count from the start of their band's calendar unit
// (e.g. days 1, 8, 15 of a month), and formats leave out what the bucket makes
// redundant (e.g. the hour of a day bucket).
const AXES: Record<
  string,
  { minor: string; major: string; majorUnit: "day" | "month" | "year"; steps: number[]; tooltip: string }
> = {
  "15 minutes": { minor: "HH:mm", major: "ccc dd.MM", majorUnit: "day", steps: [1, 2, 4, 8, 16, 24], tooltip: "dd.MM.yyyy HH:mm" },
  "1 hour": { minor: "HH", major: "ccc dd.MM", majorUnit: "day", steps: [1, 2, 3, 6, 12], tooltip: "dd.MM.yyyy HH:mm" },
  "1 day": { minor: "d", major: "MMMM yyyy", majorUnit: "month", steps: [1, 2, 7, 14], tooltip: "ccc dd.MM.yyyy" },
  "1 week": { minor: "d", major: "MMMM yyyy", majorUnit: "month", steps: [1, 2], tooltip: "'Week of' dd.MM.yyyy" },
  "1 month": { minor: "MMM", major: "yyyy", majorUnit: "year", steps: [1, 3, 6], tooltip: "MMMM yyyy" },
};
const toNumber = (value?: string | number | null) => (value === null || value === undefined ? undefined : Number(value));
const ramp = (fraction: number) => SEQUENTIAL[Math.min(SEQUENTIAL.length - 1, Math.floor(fraction * SEQUENTIAL.length))];
// A cell with a centered box whose area is `percent` of the cell, on the offline color.
const fill = (color: string, percent: number) => {
  const side = 100 * Math.sqrt(Math.min(percent, 100) / 100);
  return `linear-gradient(${color}, ${color}) center / ${side}% ${side}% no-repeat, ${OFFLINE}`;
};

// All bucket starts in the time range, including those without data (e.g. downtime).
// Steps from a bucket in the data so they line up with the backend's time_bucket.
const bucketStarts = (first: string, bucketLength: string, length: string) => {
  const step = DURATIONS[bucketLength];
  const now = DateTime.utc();
  const from = now.minus(DURATIONS[length]);
  let start = toUtc(first);
  while (start > from) start = start.minus(step);
  const periods = [];
  for (; start <= now; start = start.plus(step)) periods.push(start.toISO()!);
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
}

const Swatch = ({ background }: { background: string }) => (
  <span style={{ background, width: 12, height: 12, borderRadius: 2, flexShrink: 0 }} />
);

const Legend = ({ metric, max }: { metric: string; max: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
    {metric === UTILIZATION ? "Utilization while online: 0%" : "GPUs reporting: 0"}
    {SEQUENTIAL.map((step) => (
      <span key={step} style={{ background: step, width: 24, height: 12 }} />
    ))}
    {metric === UTILIZATION ? "100%" : max}
    {metric === UTILIZATION && (
      <>
        <span style={{ background: fill(SEQUENTIAL[3], 25), width: CELL_SIZE, height: CELL_SIZE, marginLeft: 16 }} />
        <span style={{ background: fill(SEQUENTIAL[3], 100), width: CELL_SIZE, height: CELL_SIZE }} />
        box area = time online
      </>
    )}
    <span style={{ background: OFFLINE, width: 24, height: 12, marginLeft: 16 }} />
    offline / no data
  </div>
);

// One row per group, one cell per period. Utilization cells are colored by
// utilization while online, with a centered box sized by time online. Memoized
// so hovering, which only re-renders the tooltip in Heatmap, doesn't re-render
// every cell.
const HeatmapGrid = memo(function HeatmapGrid({
  data,
  metric,
  groups,
  labels,
  headers,
  showGroups,
  bucketLength,
  length,
}: ChartProps) {
  const periods = useMemo(
    () => bucketStarts(String(data[0].period_start), bucketLength, length),
    [data, bucketLength, length],
  );
  const max = Math.max(...data.map((row) => Number(row.gpus_reporting)));
  // Distance between columns, measured from the first cell as it changes size
  // (window resizes, range changes, wider labels), to space the minor ticks.
  const [pitch, setPitch] = useState(0);
  const measure = useCallback((cell: HTMLDivElement) => {
    const observer = new ResizeObserver(() => setPitch(cell.offsetWidth + 2));
    observer.observe(cell);
    return () => observer.disconnect();
  }, []);
  const { minor: minorFormat, major: majorFormat, majorUnit, steps } = AXES[bucketLength];
  const [[unit, amount]] = Object.entries(DURATIONS[bucketLength]) as [["minutes" | "hours" | "days" | "weeks" | "months", number]];
  // buckets since the start of the period's major unit, e.g. 6 for the 7th day of a month
  const calendarOffset = (period: string) => {
    const time = toUtc(period);
    return Math.floor(time.diff(time.startOf(majorUnit), unit).as(unit) / amount + 1e-9);
  };
  // columns a minor tick label needs, at roughly 7px per character (none until measured)
  const labelLength = Math.max(...periods.map((period) => formatTime(period, minorFormat).length));
  const fit = pitch ? Math.ceil((7 * labelLength + 4) / pitch) : Infinity;
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

  // memoized so re-measuring the pitch only re-renders the axis
  const cells = useMemo(() => {
    const rows = new Map(data.map((row) => [`${row.gpu_group}|${toUtc(String(row.period_start)).toISO()}`, row]));
    const cell = (group: string, period: string) => {
      const row = rows.get(`${group}|${period}`);
      const utilization = toNumber(row?.avg_utilization_percent_while_online);
      const online = toNumber(row?.percent_time_online);
      const gpus = toNumber(row?.gpus_reporting);
      const color =
        metric === UTILIZATION
          ? utilization === undefined ? undefined : ramp(utilization / 100)
          : gpus === undefined ? undefined : ramp(gpus / max);
      const area = metric === UTILIZATION ? (online ?? 0) : 100;
      return (
        <div
          key={`${group}|${period}`}
          data-group={group}
          data-label={labels.get(group)}
          data-period={period}
          data-color={color}
          data-utilization={utilization}
          data-online={online}
          data-gpus={gpus}
          style={{ background: color ? fill(color, area) : OFFLINE, height: CELL_SIZE }}
          ref={group === groups[0] && period === periods[0] ? measure : undefined}
        />
      );
    };
    return groups.map((group, i) => [
      headers.has(group) && (
        <div
          key={`header|${group}`}
          style={{ gridColumn: "1 / -1", paddingTop: i ? 12 : 0, color: TEXT_PRIMARY, fontWeight: 600 }}
        >
          {headers.get(group)}
        </div>
      ),
      <div key={group} style={{ paddingRight: 8, whiteSpace: "nowrap", lineHeight: `${CELL_SIZE}px` }}>
        {showGroups ? group : labels.get(group)}
      </div>,
      ...periods.map((period) => cell(group, period)),
    ]);
  }, [data, metric, groups, labels, headers, showGroups, periods, max, measure]);

  return (
    <div className="my-3" style={{ fontSize: 12, color: TEXT_SECONDARY }}>
      <Legend metric={metric} max={max} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `max-content repeat(${periods.length}, minmax(2px, ${CELL_SIZE}px))`,
          gap: 2,
        }}
      >
        {cells}
        <div />
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
        <div />
        {bands.map(({ period, span }) => (
          <div
            key={period}
            style={{
              gridColumn: `span ${span}`,
              borderLeft: `1px solid ${TEXT_SECONDARY}`,
              paddingLeft: 4,
              color: TEXT_PRIMARY,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
          >
            {formatTime(period, majorFormat)}
          </div>
        ))}
      </div>
    </div>
  );
});

// Outlines the hovered cell and shows its exact values above it, shifted
// horizontally by the cell's position so it stays within the heatmap.
const CellTooltip = ({ cell, metric, bucketLength }: { cell: HTMLElement; metric: string; bucketLength: string }) => {
  // the cell may have been removed by a refetch while hovered
  if (!cell.offsetParent) return null;
  const { group, label, period, color, utilization, online, gpus } = cell.dataset;
  const x = cell.offsetLeft + cell.offsetWidth / 2;
  const shift = (100 * x) / (cell.offsetParent as HTMLElement).offsetWidth;
  const line = { display: "flex", alignItems: "center", gap: 6 };
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
        }}
      />
      <div
        style={{
          ...TOOLTIP_STYLE,
          position: "absolute",
          left: x,
          top: cell.offsetTop - 6,
          transform: `translate(-${shift}%, -100%)`,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: 1,
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
        ) : metric === UTILIZATION ? (
          <>
            <div style={line}>
              <Swatch background={color ?? OFFLINE} />
              Utilization while online: <strong>{utilization === undefined ? "–" : `${utilization}%`}</strong>
            </div>
            <div style={line}>
              <Swatch background={fill(color ?? TEXT_SECONDARY, Number(online))} />
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
  const [cell, setCell] = useState<HTMLElement | null>(null);
  return (
    <div
      style={{ position: "relative" }}
      onMouseMove={(event) => {
        const target = event.target as HTMLElement;
        setCell(target.dataset.period ? target : null);
      }}
      onMouseLeave={() => setCell(null)}
    >
      <HeatmapGrid {...props} />
      {cell && <CellTooltip cell={cell} metric={props.metric} bucketLength={props.bucketLength} />}
    </div>
  );
};

const GpuUtilizationView = () => {
  const [level, setLevel] = useState("card");
  const [bucketLength, setBucketLength] = useState("1 hour");
  const [length, setLength] = useState("1 day");
  const [metric, setMetric] = useState(METRICS[0].value);
  const [showUuids, setShowUuids] = useState(false);

  const lengths = options(LENGTHS, (value) => !isValidLength(bucketLength, value));
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
    if (!isValidLength(value, length)) {
      const valid = LENGTHS.filter((l) => isValidLength(value, l));
      setLength(seconds(length) > seconds(valid[valid.length - 1]) ? valid[valid.length - 1] : valid[0]);
    }
  };

  const { data, isLoading, error } = useDataFrameQuery(GPU_UTILIZATION_QUERY_NAME, {
    level,
    bucket_length: bucketLength,
    length,
  });

  const labels = new Map((data ?? []).map((row) => [String(row.gpu_group), String(row.gpu_label)]));
  // Groups are listed in sections: cards by model, models by manufacturer.
  const sections = new Map(
    (data ?? []).map((row) => [
      String(row.gpu_group),
      level === "card" ? `${row.manufacturer} · ${row.model}` : level === "model" ? String(row.manufacturer) : "",
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
  if (isLoading) chart = <BarLoader />;
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
      />
    );

  return (
    <div className="my-5">
      <HStack alignItems="end">
        <ParamSelect label="Aggregation level" collection={levels} value={level} onChange={changeLevel} />
        <ParamSelect label="Bucket length" collection={bucketLengths} value={bucketLength} onChange={changeBucketLength} />
        <ParamSelect label="Time range" collection={lengths} value={length} onChange={setLength} />
        <ParamSelect label="Metric" collection={metrics} value={metric} onChange={setMetric} />
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
