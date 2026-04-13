"use client";

import { Eye, Gift } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { VaultDoor } from "@/components/dashboard/VaultDoor";

function daysUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.split("T")[0] ?? "";
}

export function VaultHero({
  childId,
  childFirstName,
  revealDate,
  entryCount,
}: {
  childId: string;
  childFirstName: string;
  revealDate: string | null;
  entryCount: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(revealDate === null);
  const [currentReveal, setCurrentReveal] = useState<string | null>(revealDate);

  const days =
    currentReveal !== null ? daysUntil(new Date(currentReveal)) : null;

  useEffect(() => {
    setCurrentReveal(revealDate);
  }, [revealDate]);

  return (
    <div className="relative rounded-3xl border border-navy/[0.06] px-6 py-10 lg:px-12 lg:py-14 overflow-hidden bg-gradient-to-br from-[#fdf3e9] via-[#fdf8f2] to-[#fdf6e3]">
      <div className="relative grid gap-10 lg:gap-14 lg:grid-cols-[auto,1fr] items-center">
        <div className="flex justify-center">
          <VaultDoor state="idle" />
        </div>

        <div className="text-center lg:text-left">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
            {childFirstName}&rsquo;s vault
          </p>
          <h1 className="text-[34px] lg:text-[44px] font-extrabold text-navy leading-[1.05] tracking-[-0.8px] mb-5">
            {entryCount === 0
              ? "Nothing sealed yet."
              : `${entryCount.toLocaleString()} ${
                  entryCount === 1 ? "moment" : "moments"
                } sealed.`}
          </h1>

          {currentReveal && !editing ? (
            <div>
              <p className="text-[17px] text-ink-mid leading-[1.5]">
                Opens{" "}
                <span className="font-semibold text-navy">
                  {formatLongDate(new Date(currentReveal))}
                </span>
              </p>
              {days != null && (
                <p className="text-base text-ink-mid mt-1">
                  in{" "}
                  <span className="font-extrabold text-navy tabular-nums">
                    {days.toLocaleString()}
                  </span>{" "}
                  {days === 1 ? "day" : "days"}
                </p>
              )}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-3 text-sm font-medium text-amber hover:text-navy transition-colors underline underline-offset-4"
              >
                Change reveal date
              </button>
            </div>
          ) : (
            <RevealDateForm
              initialDate={currentReveal}
              onSaved={(date) => {
                setCurrentReveal(date);
                setEditing(false);
                router.refresh();
              }}
              onCancel={() => {
                if (currentReveal !== null) setEditing(false);
              }}
              showCancel={currentReveal !== null}
            />
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 justify-center lg:justify-start">
            <Link
              href={`/vault/${childId}/child-view`}
              prefetch={false}
              className="inline-flex items-center gap-2 bg-white border border-navy/15 text-navy px-4 py-2.5 rounded-lg text-sm font-bold hover:border-navy transition-colors"
            >
              <Eye size={16} strokeWidth={1.5} aria-hidden="true" />
              View {childFirstName}&rsquo;s vault
            </Link>
            <Link
              href="/dashboard/preview"
              prefetch={false}
              className="inline-flex items-center gap-2 bg-amber text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
            >
              <Gift size={16} strokeWidth={1.5} aria-hidden="true" />
              See what {childFirstName} sees
            </Link>
          </div>
          <p className="mt-3 text-xs text-ink-light italic">
            <span className="font-semibold text-ink-mid">View</span> shows the
            locked countdown;{" "}
            <span className="font-semibold text-ink-mid">See</span> shows the
            reveal-day preview.
          </p>
        </div>
      </div>
    </div>
  );
}

function RevealDateForm({
  initialDate,
  onSaved,
  onCancel,
  showCancel,
}: {
  initialDate: string | null;
  onSaved: (date: string) => void;
  onCancel: () => void;
  showCancel: boolean;
}) {
  const [value, setValue] = useState(isoToDateInput(initialDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!value) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/vault", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revealDate: value }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't save. Try again?");
      }
      onSaved(new Date(value).toISOString());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
    >
      <div className="flex-1">
        <label className="block text-[10px] uppercase tracking-[0.1em] font-bold text-ink-mid mb-1.5">
          Reveal date
        </label>
        <input
          type="date"
          value={value}
          min={minDate}
          onChange={(e) => setValue(e.target.value)}
          disabled={saving}
          className="w-full px-4 py-2.5 border border-navy/15 rounded-lg text-sm text-navy bg-white outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 disabled:opacity-50"
        />
      </div>
      <div className="flex items-center gap-2 sm:self-end">
        <button
          type="submit"
          disabled={!value || saving}
          className="bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : initialDate ? "Save" : "Set date"}
        </button>
        {showCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-ink-mid hover:text-navy transition-colors px-2 py-2.5"
          >
            Cancel
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 sm:w-full" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
