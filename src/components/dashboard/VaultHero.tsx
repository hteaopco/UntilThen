"use client";

import { Eye, Gift } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { TimeVault } from "@/components/ui/TimeVault";
import { RevealDatePicker } from "@/components/ui/RevealDatePicker";

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
  childDateOfBirth,
  vaultId,
  revealDate,
}: {
  childId: string;
  childFirstName: string;
  childDateOfBirth: string | null;
  vaultId: string;
  revealDate: string | null;
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
    <div className="relative rounded-3xl border border-navy/[0.06] px-6 py-7 lg:px-10 lg:py-9 overflow-hidden bg-gradient-to-br from-[#fdf3e9] via-[#fdf8f2] to-[#fdf6e3]">
      <div className="relative grid gap-8 lg:gap-12 lg:grid-cols-[auto,1fr] items-center">
        <div className="flex justify-center">
          <TimeVault
            state="sealed"
            size="compact"
            ariaLabel={`${childFirstName}'s time vault`}
          />
        </div>

        {/* min-w-0 keeps the native date input from pushing its
            intrinsic min-width past the grid column and poking out
            the right side of the card. */}
        <div className="text-center lg:text-left min-w-0">
          <h2 className="text-balance text-[24px] lg:text-[30px] font-extrabold text-navy leading-[1.1] tracking-[-0.5px] mb-4">
            {childFirstName} will open this one day.
          </h2>

          {currentReveal && !editing ? (
            <p className="text-[17px] text-ink-mid leading-[1.5]">
              Opens{" "}
              <span className="font-semibold text-navy">
                {formatLongDate(new Date(currentReveal))}
              </span>
              {days != null && (
                <>
                  {" · "}
                  <span className="font-extrabold text-navy tabular-nums">
                    {days.toLocaleString()}
                  </span>{" "}
                  {days === 1 ? "day" : "days"}
                </>
              )}
              {" · "}
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-sm text-ink-light hover:text-amber underline underline-offset-[3px] transition-colors"
              >
                change
              </button>
            </p>
          ) : (
            <RevealDateForm
              vaultId={vaultId}
              initialDate={currentReveal}
              childFirstName={childFirstName}
              childDateOfBirth={childDateOfBirth}
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

          {/* Two supporting actions — View countdown and Preview
              reveal day. Writing is covered by the editor spark
              at the top of the page. */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 justify-center lg:justify-start text-sm">
            <Link
              href={`/vault/${childId}/child-view`}
              prefetch={false}
              className="inline-flex items-center gap-1.5 font-semibold text-ink-mid hover:text-amber transition-colors"
            >
              <Eye size={15} strokeWidth={1.5} aria-hidden="true" />
              View countdown
            </Link>
            <Link
              href={`/dashboard/preview?vault=${childId}`}
              prefetch={false}
              className="inline-flex items-center gap-1.5 font-semibold text-ink-mid hover:text-amber transition-colors"
            >
              <Gift size={15} strokeWidth={1.5} aria-hidden="true" />
              Preview reveal day
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function RevealDateForm({
  vaultId,
  initialDate,
  childFirstName,
  childDateOfBirth,
  onSaved,
  onCancel,
  showCancel,
}: {
  vaultId: string;
  initialDate: string | null;
  childFirstName: string;
  childDateOfBirth: string | null;
  onSaved: (date: string) => void;
  onCancel: () => void;
  showCancel: boolean;
}) {
  const [value, setValue] = useState(isoToDateInput(initialDate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!value) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/vault", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultId, revealDate: value }),
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
    <form onSubmit={submit} className="space-y-4 text-left">
      <div>
        <label className="block text-[10px] uppercase tracking-[0.1em] font-bold text-ink-mid mb-2">
          Reveal date
        </label>
        <RevealDatePicker
          value={value}
          onChange={setValue}
          childFirstName={childFirstName}
          childDateOfBirth={childDateOfBirth}
          disabled={saving}
        />
      </div>
      <div className="flex items-center gap-3">
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
            disabled={saving}
            className="text-sm font-medium text-ink-mid hover:text-navy transition-colors px-2 py-2.5 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
