"use client";

/**
 * Shared reveal-date picker used for vault reveal, collection
 * reveal, and per-entry reveal overrides. Gives parents a one-tap
 * path to common milestones (months-from-now and age-based
 * birthdays when the child's DOB is known), while still allowing
 * a free-form date.
 */

import { formatShort } from "@/lib/dateFormatters";

function yyyymmdd(d: Date): string {
  return d.toISOString().split("T")[0] ?? "";
}

function addMonths(date: Date, months: number): Date {
  const r = new Date(date);
  r.setMonth(r.getMonth() + months);
  return r;
}

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0] ?? "th";
}

export type QuickPick = { label: string; iso: string };

/**
 * Build the default chip list: three month-based quick picks,
 * plus a few age-based birthday chips when the child's DOB is
 * known and that birthday hasn't already happened.
 */
export function buildQuickPicks(
  childFirstName: string | null,
  childDateOfBirth: string | null,
): QuickPick[] {
  const today = new Date();
  const picks: QuickPick[] = [
    { label: "3 months", iso: yyyymmdd(addMonths(today, 3)) },
    { label: "6 months", iso: yyyymmdd(addMonths(today, 6)) },
    { label: "1 year", iso: yyyymmdd(addMonths(today, 12)) },
  ];
  if (childDateOfBirth && childFirstName) {
    const dob = new Date(childDateOfBirth);
    for (const age of [3, 6, 12, 18]) {
      const birthday = new Date(dob);
      birthday.setFullYear(birthday.getFullYear() + age);
      if (birthday.getTime() > today.getTime()) {
        picks.push({
          label: `${childFirstName}'s ${age}${ordinalSuffix(age)}`,
          iso: yyyymmdd(birthday),
        });
      }
    }
  }
  return picks;
}

export function RevealDatePicker({
  value,
  onChange,
  childFirstName = null,
  childDateOfBirth = null,
  disabled = false,
  minDate,
  maxDate,
  showConfirmation = true,
  id,
}: {
  value: string;
  onChange: (iso: string) => void;
  childFirstName?: string | null;
  childDateOfBirth?: string | null;
  disabled?: boolean;
  minDate?: string;
  /**
   * Optional ceiling — used by Memory Capsules to enforce the
   * 60-day reveal horizon so users can't short-circuit the
   * child-vault product via a long-horizon capsule.
   */
  maxDate?: string;
  /**
   * Render a small "Unlocks Month D, YYYY" line under the input.
   * Off for tiny surfaces where the confirmation would wrap awkwardly.
   */
  showConfirmation?: boolean;
  id?: string;
}) {
  const effectiveMin =
    minDate ?? yyyymmdd(new Date(Date.now() + 24 * 60 * 60 * 1000));
  // Quick picks are filtered against the optional ceiling so
  // we never surface a chip the native input would reject.
  const allPicks = buildQuickPicks(childFirstName, childDateOfBirth);
  const picks = maxDate
    ? allPicks.filter((p) => p.iso <= maxDate)
    : allPicks;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {picks.map((q) => {
          const active = value === q.iso;
          return (
            <button
              key={q.label}
              type="button"
              disabled={disabled}
              onClick={() => onChange(q.iso)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-[0.06em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                active
                  ? "bg-amber text-white border-amber"
                  : "bg-white border-navy/15 text-ink-mid hover:border-navy hover:text-navy"
              }`}
            >
              {q.label}
            </button>
          );
        })}
      </div>

      <div>
        <input
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={effectiveMin}
          max={maxDate}
          disabled={disabled}
          style={{
            WebkitAppearance: "none",
            appearance: "none",
            boxSizing: "border-box",
          }}
          className="block w-full min-h-[48px] px-4 py-3 text-[15px] text-navy bg-white border-[1.5px] border-navy/[0.12] rounded-lg outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 placeholder-ink-light disabled:opacity-50"
        />
        {showConfirmation && value && (
          <p className="mt-2 text-xs italic text-ink-light">
            Opens {formatShort(value)}
          </p>
        )}
      </div>
    </div>
  );
}
