import { DateTime } from "luxon";
import { createListCollection } from "@chakra-ui/react";
import useUrlParam from "../../hooks/useUrlParam";
import {
  BUCKET_LENGTHS,
  CUSTOM,
  formatDates,
  isValidSpan,
  LENGTHS,
  Option,
  options,
  parseDates,
  seconds,
  toUtc,
} from "./timeWindow";
import { DateInput, ParamSelect } from "./viewControls";

// The time window of a view, kept in the URL: a bucket length, and either a preset range up to now or a
// custom range of whole UTC days. Comes with its selects and date inputs, and the query parameters.
const useTimeWindow = () => {
  const today = DateTime.utc().toISODate();
  // A custom range is always written to the URL, as the default one moves with the date.
  const [dates, setDates] = useUrlParam("dates", "", (value) => parseDates(value) !== undefined);
  const range = parseDates(dates) ?? { start: DateTime.utc().minus({ days: 7 }).toISODate(), end: today };
  const [length, setLength] = useUrlParam("range", "1 day", (value) => LENGTHS.includes(value) || value === CUSTOM);
  const customSeconds = (dates: typeof range) => toUtc(dates.end).plus({ days: 1 }).diff(toUtc(dates.start)).as("seconds");
  const span = length === CUSTOM ? customSeconds(range) : seconds(length);
  const [urlBucketLength, setBucketLength] = useUrlParam("bucket", "1 hour", (value) => BUCKET_LENGTHS.includes(value));
  // the finest that fits, if a link pairs the range with a bucket length it doesn't allow
  const bucketLength = isValidSpan(urlBucketLength, span)
    ? urlBucketLength
    : (BUCKET_LENGTHS.find((value) => isValidSpan(value, span)) ?? urlBucketLength);
  // a custom range includes its end day
  const custom =
    length === CUSTOM ? { start: toUtc(range.start).toISO()!, end: toUtc(range.end).plus({ days: 1 }).toISO()! } : undefined;
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
    if (value === CUSTOM) {
      setDates(formatDates(range));
      fitBucketLength(range);
    }
  };
  const changeRange = (dates: typeof range) => {
    setDates(formatDates(dates));
    fitBucketLength(dates);
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

  const controls = (
    <>
      <ParamSelect label="Bucket length" collection={bucketLengths} value={bucketLength} onChange={changeBucketLength} />
      <ParamSelect label="Time range" collection={lengths} value={length} onChange={changeLength} />
      {custom && (
        <>
          <DateInput label="From" value={range.start} max={range.end} onChange={(start) => changeRange({ ...range, start })} />
          <DateInput label="To" value={range.end} min={range.start} max={today} onChange={(end) => changeRange({ ...range, end })} />
        </>
      )}
    </>
  );
  return {
    bucketLength,
    length,
    custom,
    controls,
    params: { bucket_length: bucketLength, ...(custom ?? { length }) } as Record<string, string>,
  };
};

export default useTimeWindow;
