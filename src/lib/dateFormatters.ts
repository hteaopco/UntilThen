// Shared date formatters. Centralised so every surface renders
// the same month / day / year shape.
//
// Timezone contract:
//   Date-only fields in this product (revealDate, contributor
//   deadlines, dateOfBirth, etc.) come in as one of:
//
//     1. A bare "YYYY-MM-DD" string from an <input type="date">.
//     2. A full ISO with a "T00:00:00.000Z" time portion,
//        produced when a server-side `DateTime` stored at UTC
//        midnight is serialised to JSON.
//
//   Both represent the user's intended calendar day — not a
//   moment in time. Running them through toLocaleDateString in
//   a timezone west of UTC rolls the day back one, which is the
//   off-by-one ("May 20 selected → May 19 displayed") bug users
//   have reported.
//
//   Fix: parse these as UTC and format in UTC. A value that
//   actually carries a non-midnight time portion is a real
//   timestamp and is formatted in local time as before.

function toDate(input: string | Date): Date {
  if (input instanceof Date) return input;
  return new Date(input);
}

function isDateOnlyUtc(d: Date): boolean {
  // UTC midnight with no sub-second offset looks like a
  // date-only value that's been padded to a DateTime on the
  // wire. Treating it as date-only means no timezone rollover.
  return (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

function format(
  input: string | Date,
  opts: Intl.DateTimeFormatOptions,
): string {
  const d = toDate(input);
  if (isDateOnlyUtc(d)) {
    return d.toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
  }
  return d.toLocaleDateString("en-US", opts);
}

export function formatShort(input: string | Date): string {
  return format(input, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatLong(input: string | Date): string {
  return format(input, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonthYear(input: string | Date): string {
  return format(input, {
    month: "long",
    year: "numeric",
  });
}
