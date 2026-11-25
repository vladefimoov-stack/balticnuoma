/**
 * tstzrange as returned by PostgREST: `["2026-11-27 22:00:00+00","2026-11-30 22:00:00+00")`.
 * Only bounded half-open ranges are used in this project.
 */
export type Range = { start: Date; end: Date };

const RANGE = /^[[(]"?([^",]+)"?,"?([^",)\]]+)"?[)\]]$/;

function parseTimestamp(value: string) {
  // "2026-11-27 22:00:00+00" → "2026-11-27T22:00:00+00:00"
  const iso = value.trim().replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid timestamp in range: ${value}`);
  return date;
}

export function parseRange(value: unknown): Range {
  if (typeof value !== "string") throw new Error("Range must be a string");
  const match = RANGE.exec(value.trim());
  if (!match) throw new Error(`Invalid range: ${value}`);
  return { start: parseTimestamp(match[1]), end: parseTimestamp(match[2]) };
}

export function rangeLiteral(start: Date | number, end: Date | number) {
  return `[${new Date(start).toISOString()},${new Date(end).toISOString()})`;
}
