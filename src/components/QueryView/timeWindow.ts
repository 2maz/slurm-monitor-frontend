import { createListCollection } from "@chakra-ui/react";
import { DateTime, Duration, DurationLikeObject } from "luxon";

// Time windows and downloads shared by the utilization and allocation views.

export interface Option {
  label: string;
  value: string;
  disabled?: boolean;
}

export const options = (values: string[], isDisabled: (value: string) => boolean = () => false) =>
  createListCollection<Option>({ items: values.map((value) => ({ label: value, value, disabled: isDisabled(value) })) });

// Mirrors GPUUtilizationBucketLength / GPUUtilizationLength in slurm_monitor/db/query.py,
// which both utilization queries use - keep in sync with the backend enums.
export const BUCKET_LENGTHS = ["15 minutes", "1 hour", "1 day", "1 week", "1 month"];
export const LENGTHS = ["15 minutes", "1 hour", "1 day", "1 week", "1 month", "1 year"];
// a custom range of whole UTC days, picked with date inputs
export const CUSTOM = "custom";
export const DURATIONS: Record<string, DurationLikeObject> = {
  "15 minutes": { minutes: 15 },
  "1 hour": { hours: 1 },
  "1 day": { days: 1 },
  "1 week": { weeks: 1 },
  "1 month": { months: 1 },
  "1 year": { years: 1 },
};
export const seconds = (value: string) => Duration.fromObject(DURATIONS[value]).as("seconds");
// Caps the number of buckets (heatmap columns) to keep rendering fast, e.g. 1 hour
// buckets go up to 1 week, 1 day buckets up to 1 year. The backend enforces it too.
export const MAX_BUCKETS = 400;
export const isValidSpan = (bucketLength: string, spanSeconds: number) => {
  const buckets = spanSeconds / seconds(bucketLength);
  return buckets >= 1 && buckets <= MAX_BUCKETS;
};
export const toUtc = (ts: string) => DateTime.fromISO(ts, { zone: "utc" });

// All bucket starts in the time range, including those without data (e.g. downtime).
// Steps from a bucket in the data so they line up with the backend's time_bucket.
// The range is a custom start-end, or else `length` up to now; never past now.
export const bucketStarts = (first: string, bucketLength: string, length: string, start?: string, end?: string) => {
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

// A custom range of whole UTC days as written in the URL, from..to (both included),
// e.g. 2026-10-01..2026-10-21; undefined unless both are dates, in order, up to today.
export const parseDates = (value: string) => {
  const [start, end] = value.split("..");
  const isDate = (date?: string): date is string => /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") && toUtc(date!).isValid;
  if (!isDate(start) || !isDate(end) || start > end || end > DateTime.utc().toISODate()) return undefined;
  return { start, end };
};
export const formatDates = ({ start, end }: { start: string; end: string }) => `${start}..${end}`;

// Rasterizes an SVG document at `scale` times its size.
export const toPng = (svg: string, scale = 2) =>
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
export const saveFile = (blob: Blob, name: string) => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  // once the download has started
  setTimeout(() => URL.revokeObjectURL(link.href));
};

