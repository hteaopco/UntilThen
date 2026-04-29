/**
 * Date + delivery-time + timezone helpers shared between the
 * capsule-creation wizard and the create-capsule API. Both need
 * to know the actual UTC moment a capsule will reveal so they
 * can enforce / display the same lead-time rule (the wizard
 * hides presets that fall inside the buffer; the API rejects
 * combinations that do).
 *
 * Storing the date and the delivery time separately on the
 * capsule (instead of a single timestamp) is intentional — it
 * keeps the cron's per-recipient-tz scheduling logic simple and
 * lets the organiser change the time without rebuilding the
 * date. These helpers fold the two back together when the
 * combined moment matters.
 */

/** Minimum lead time between "now" and a scheduled reveal, in
 *  ms. Two hours gives the organiser room to finish staging the
 *  capsule and invite contributors before it goes out. Same
 *  value the wizard uses to grey out presets. */
export const REVEAL_MIN_LEAD_MS = 2 * 60 * 60 * 1000;

/**
 * Returns ms-since-epoch for the wall-clock moment
 * `${dateIso}T${timeIso}` in the given IANA timezone. Handles
 * DST correctly via Intl.DateTimeFormat (the formatter respects
 * the tz database, so spring/fall transitions land on the right
 * UTC instant).
 *
 * Returns NaN if the date or time string can't be parsed; the
 * caller should treat NaN as "ineligible".
 *
 *   combineRevealMs("2026-04-29", "09:00", "America/Chicago")
 *   → ms for 2026-04-29 14:00:00 UTC (CT is UTC-5 during DST)
 */
export function combineRevealMs(
  dateIso: string,
  timeIso: string,
  tz: string,
): number {
  // First pass: treat the wall-clock components as UTC to get a
  // baseline Date we can introspect with Intl.
  const naive = new Date(`${dateIso}T${timeIso}:00Z`);
  if (Number.isNaN(naive.getTime())) return NaN;

  // Ask Intl what wall-clock that UTC instant *would* show in
  // the target tz, then back out the offset.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(naive)) {
    if (p.type !== "literal") parts[p.type] = p.value;
  }
  const tzWallMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  // tzWallMs - naive = offset between UTC and target tz at this
  // instant. The actual UTC instant whose wall clock in `tz`
  // matches our intended `${date}T${time}` is naive - offset.
  const offsetMs = tzWallMs - naive.getTime();
  return naive.getTime() - offsetMs;
}
