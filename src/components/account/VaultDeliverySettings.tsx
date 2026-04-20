"use client";

import { AlertCircle, Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type SaveState = "idle" | "saving" | "saved" | "error";

// Curated set of common timezones. Users on edge cases can pick the
// closest match — every option here is a valid IANA name accepted by
// the cron-side delivery comparator.
const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
  { value: "America/Toronto", label: "Toronto" },
  { value: "America/Vancouver", label: "Vancouver" },
  { value: "America/Mexico_City", label: "Mexico City" },
  { value: "America/Sao_Paulo", label: "S\u00e3o Paulo" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Europe/Madrid", label: "Madrid" },
  { value: "Europe/Rome", label: "Rome" },
  { value: "Europe/Amsterdam", label: "Amsterdam" },
  { value: "Africa/Johannesburg", label: "Johannesburg" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Kolkata", label: "Mumbai / Kolkata" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Hong_Kong", label: "Hong Kong" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Seoul", label: "Seoul" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "Pacific/Auckland", label: "Auckland" },
];

export function VaultDeliverySettings({
  childId,
  deliveryTime: initialDeliveryTime,
  timezone: initialTimezone,
}: {
  childId: string;
  deliveryTime: string;
  timezone: string;
}) {
  const router = useRouter();
  const [deliveryTime, setDeliveryTime] = useState(initialDeliveryTime);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Make sure the persisted timezone is selectable even if it's not
  // in our curated list (e.g., older accounts on a less-common zone).
  const options = TIMEZONES.some((tz) => tz.value === timezone)
    ? TIMEZONES
    : [{ value: timezone, label: timezone }, ...TIMEZONES];

  async function save(e: FormEvent) {
    e.preventDefault();
    setState("saving");
    setError(null);
    try {
      const res = await fetch(`/api/account/children/${childId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryTime, timezone }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't save.");
      }
      setState("saved");
      router.refresh();
      setTimeout(() => setState("idle"), 2200);
    } catch (err) {
      setError((err as Error).message);
      setState("error");
    }
  }

  return (
    <section>
      <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-2">
        Reveal delivery
      </p>
      <p className="text-sm text-ink-mid mb-5">
        On the reveal date, the capsule unlocks at this local time.
      </p>

      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
              Time
            </span>
            <input
              type="time"
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              className="account-input"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
              Timezone
            </span>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="account-input"
            >
              {options.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={state === "saving"}
            className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
          >
            {state === "saving" ? "Saving\u2026" : "Save changes"}
          </button>
          {state === "saved" && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sage">
              <Check size={16} strokeWidth={2} aria-hidden="true" /> Saved
            </span>
          )}
          {state === "error" && error && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
              <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" /> {error}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
