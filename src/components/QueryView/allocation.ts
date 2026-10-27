import { Row } from "../../hooks/useDataFrameQuery";
import { Option } from "./timeWindow";

// What the allocation queries return, split into bands that partition each node's capacity.

export const GPU_ALLOCATION_QUERY_NAME = "gpu-allocation";
export const CPU_ALLOCATION_QUERY_NAME = "cpu-allocation";
export const ALLOCATION_QUERIES = [GPU_ALLOCATION_QUERY_NAME, CPU_ALLOCATION_QUERY_NAME];

export type BandKey = "busy" | "occupiedIdle" | "allocatedIdle" | "outsideSlurm" | "unavailable" | "notAllocated";

export interface Band {
  key: BandKey;
  label: string;
  color: string;
}

export interface AllocationKind {
  queryName: string;
  resource: "GPU" | "CPU";
  // the columns' prefix, e.g. gpus_installed
  prefix: "gpus" | "cpus";
  // stacked from the bottom
  bands: Band[];
  // what rows can be grouped by: each node, or the nodes of a model or manufacturer, and their labels
  levels: Option[];
  // Rows grow by `step` px each time their capacity grows by `factor`, as nodes range from 1 to 16 GPUs but
  // from 8 to 384 CPUs; `growth` says so in the caption, e.g. "doubling".
  rowScale: { factor: number; step: number; growth: string };
}

export const SlurmStatusColors = {
  BUSY: "#184f95",
  OCCUPIED_IDLE: "#3987e5",
  ALLOCATED_IDLE: "#6da7ec",
  NOT_ALLOCATED: "#e4edfa",
  OUTSIDE_SLURM: "#df9201",
  UNAVAILABLE: "#a9a7a1",
};

// The bands that mean the same for GPUs and CPUs
const BUSY: Band = { key: "busy", label: "Busy", color: SlurmStatusColors.BUSY };
const UNAVAILABLE: Band = { key: "unavailable", label: "Unavailable", color: SlurmStatusColors.UNAVAILABLE };
const NOT_ALLOCATED: Band = { key: "notAllocated", label: "Not allocated", color: SlurmStatusColors.NOT_ALLOCATED };

export const GPU_ALLOCATION: AllocationKind = {
  queryName: GPU_ALLOCATION_QUERY_NAME,
  resource: "GPU",
  prefix: "gpus",
  bands: [
    BUSY,
    { key: "occupiedIdle", label: "Job process, idle", color: SlurmStatusColors.OCCUPIED_IDLE },
    { key: "allocatedIdle", label: "Allocated, no process", color: SlurmStatusColors.ALLOCATED_IDLE },
    // a card held by a process outside Slurm, busy or not
    { key: "outsideSlurm", label: "Process outside Slurm", color: SlurmStatusColors.OUTSIDE_SLURM },
    UNAVAILABLE,
    NOT_ALLOCATED,
  ],
  levels: [
    { label: "Node", value: "node" },
    { label: "GPU model", value: "model" },
    { label: "Manufacturer", value: "manufacturer" },
  ],
  rowScale: { factor: 2, step: 12, growth: "doubling" },
};

export const CPU_ALLOCATION: AllocationKind = {
  queryName: CPU_ALLOCATION_QUERY_NAME,
  resource: "CPU",
  prefix: "cpus",
  // no occupiedIdle: CPUs aren't tied to jobs
  bands: [
    BUSY,
    { key: "allocatedIdle", label: "Allocated, idle", color: SlurmStatusColors.ALLOCATED_IDLE },
    { key: "outsideSlurm", label: "Busy outside allocations", color: SlurmStatusColors.OUTSIDE_SLURM },
    UNAVAILABLE,
    NOT_ALLOCATED,
  ],
  levels: [
    { label: "Node", value: "node" },
    { label: "CPU model", value: "model" },
  ],
  rowScale: { factor: 10, step: 24, growth: "tenfold" },
};

export const ALLOCATION_KINDS: Record<string, AllocationKind> = Object.fromEntries(
  [GPU_ALLOCATION, CPU_ALLOCATION].map((kind) => [kind.queryName, kind]),
);

export type Split = Record<BandKey, number>;

const EMPTY: Split = { busy: 0, occupiedIdle: 0, allocatedIdle: 0, outsideSlurm: 0, unavailable: 0, notAllocated: 0 };

const toNumber = (row: Row, column: string) => {
  const raw = row[column];
  return raw === null || raw === undefined || raw === "" ? 0 : Number(raw);
};

export const installed = (kind: AllocationKind, row: Row) => toNumber(row, `${kind.prefix}_installed`);
export const allocated = (kind: AllocationKind, row: Row) => toNumber(row, `${kind.prefix}_allocated`);

/**
 * Splits a node's capacity in a bucket into the bands, which add up to what is installed. The layers
 * nest (busy within occupied within allocated within installed), so each is capped by the one around
 * it: averages over a bucket need not nest exactly, e.g. when a job's last sample comes late.
 * Unavailability takes what is left after allocations, as a draining node keeps its jobs.
 */
export const splitRow = (kind: AllocationKind, row: Row): Split => {
  const capacity = installed(kind, row);
  if (capacity <= 0) return { ...EMPTY };
  const inAllocation = Math.min(Math.max(allocated(kind, row), 0), capacity);
  const busyAll = Math.max(toNumber(row, `${kind.prefix}_busy`), 0);
  let busy, occupiedIdle, outsideSlurm;
  if (kind.resource === "GPU") {
    const occupied = Math.min(toNumber(row, "gpus_occupied"), inAllocation);
    busy = Math.min(busyAll, occupied);
    occupiedIdle = occupied - busy;
    outsideSlurm = Math.min(toNumber(row, "gpus_occupied_outside_slurm"), capacity - inAllocation);
  } else {
    // CPUs aren't tied to jobs: what is busy beyond the allocations is outside them
    busy = Math.min(busyAll, inAllocation);
    occupiedIdle = 0;
    outsideSlurm = Math.min(busyAll - busy, capacity - inAllocation);
  }
  const rest = capacity - inAllocation - outsideSlurm;
  const unavailable = Math.min(rest, (toNumber(row, "percent_time_unavailable") / 100) * capacity);
  return {
    busy,
    occupiedIdle,
    allocatedIdle: inAllocation - busy - occupiedIdle,
    outsideSlurm,
    unavailable,
    notAllocated: rest - unavailable,
  };
};

export const addSplits = (a: Split, b: Split, weight = 1): Split => {
  const sum = { ...a };
  (Object.keys(EMPTY) as BandKey[]).forEach((key) => (sum[key] += weight * b[key]));
  return sum;
};

export const emptySplit = (): Split => ({ ...EMPTY });

export const total = (split: Split) => Object.values(split).reduce((sum, v) => sum + v, 0);

export interface NodeSeries {
  // the node, or the model or manufacturer of a group of nodes
  node: string;
  model?: string;
  manufacturer?: string;
  // the nodes of a group
  members?: string[];
  // the most installed in any bucket, which sets the row's height
  capacity: number;
  // per period, in the order of the periods
  splits: Split[];
  // averages over the time shown, of what was allocated even where nothing is monitored
  allocated: number[];
  notCounted?: string;
}

export interface AllocationData {
  // bucket starts, in ms since the epoch
  periods: number[];
  nodes: NodeSeries[];
}

// Groups rows by node, one split per period; nodes miss no periods, as the queries return every bucket.
export const toSeries = (kind: AllocationKind, rows: Row[]): AllocationData => {
  const periods = [...new Set(rows.map((row) => Date.parse(String(row.period_start))))].sort((a, b) => a - b);
  const index = new Map(periods.map((period, i) => [period, i]));
  const nodes = new Map<string, NodeSeries>();
  for (const row of rows) {
    const name = String(row.node);
    let node = nodes.get(name);
    if (!node) {
      node = {
        node: name,
        capacity: 0,
        splits: periods.map(() => emptySplit()),
        allocated: periods.map(() => 0),
      };
      nodes.set(name, node);
    }
    const i = index.get(Date.parse(String(row.period_start)))!;
    node.capacity = Math.max(node.capacity, installed(kind, row));
    node.splits[i] = splitRow(kind, row);
    node.allocated[i] = allocated(kind, row);
    if (row.not_counted) node.notCounted = String(row.not_counted);
    if (row.model) node.model = String(row.model);
    if (row.manufacturer) node.manufacturer = String(row.manufacturer);
  }
  return { periods, nodes: [...nodes.values()] };
};

// Adds up nodes by model or manufacturer ("node" leaves them as they are), into rows like a node's.
export const groupSeries = (nodes: NodeSeries[], level: string): NodeSeries[] => {
  if (level !== "model" && level !== "manufacturer") return nodes;
  const groups = new Map<string, NodeSeries>();
  for (const node of nodes) {
    const name = node[level] ?? "unknown";
    const group = groups.get(name);
    if (!group) {
      groups.set(name, { ...node, node: name, splits: [...node.splits], allocated: [...node.allocated], members: [node.node] });
      continue;
    }
    group.capacity += node.capacity;
    group.splits = group.splits.map((split, i) => addSplits(split, node.splits[i]));
    group.allocated = group.allocated.map((value, i) => value + node.allocated[i]);
    group.members!.push(node.node);
  }
  return [...groups.values()];
};

// The periods' lengths in ms, to weight them by; the last, which may still be running, ends at `end`.
export const periodWeights = (periods: number[], end: number) =>
  periods.map((period, i) => Math.max(0, (i + 1 < periods.length ? periods[i + 1] : end) - period));

export interface Summary {
  // capacity-time per band, and its total
  bands: Split;
  capacity: number;
  allocated: number;
}

export const summarize = (splits: Split[], weights: number[], from: number, to: number): Summary => {
  let bands = emptySplit();
  for (let i = from; i < to; i++) bands = addSplits(bands, splits[i], weights[i]);
  const capacity = total(bands);
  const allocatedTime = bands.busy + bands.occupiedIdle + bands.allocatedIdle;
  return { bands, capacity, allocated: allocatedTime };
};

export const share = (part: number, whole: number) => (whole > 0 ? part / whole : undefined);
