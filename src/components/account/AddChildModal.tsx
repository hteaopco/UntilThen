"use client";

import { AlertCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type RevealCategory =
  | "quick"
  | "birthday"
  | "graduation"
  | "wedding"
  | "anniversary"
  | null;

function yyyymmdd(d: Date): string {
  return d.toISOString().split("T")[0] ?? "";
}

function addMonths(date: Date, months: number): Date {
  const r = new Date(date);
  r.setMonth(r.getMonth() + months);
  return r;
}

function ordinal(n: number): string {
  if (n === 21) return "21st";
  if (n === 12) return "12th";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0] ?? "th"}`;
}

export function AddChildModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [revealDate, setRevealDate] = useState("");
  const [revealCategory, setRevealCategory] = useState<RevealCategory>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weddingDate, setWeddingDate] = useState("");
  const [gradSelection, setGradSelection] = useState<string | null>(null);
  const [showGradDate, setShowGradDate] = useState(false);

  const canSubmit = firstName.trim().length > 0 && !saving;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/account/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: dob || null,
          revealDate: revealDate || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't create capsule.");
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  function selectCategory(cat: RevealCategory) {
    setRevealCategory(cat === revealCategory ? null : cat);
    setRevealDate("");
    setGradSelection(null);
    setShowGradDate(false);
  }

  function pickBirthdayAge(age: number) {
    if (!dob) return;
    const d = new Date(dob);
    d.setFullYear(d.getFullYear() + age);
    setRevealDate(yyyymmdd(d));
  }

  function pickAnniversaryYear(years: number) {
    if (!weddingDate) return;
    const d = new Date(weddingDate);
    d.setFullYear(d.getFullYear() + years);
    setRevealDate(yyyymmdd(d));
  }

  const today = new Date();
  const quickPicks = [
    { label: "3 Months", iso: yyyymmdd(addMonths(today, 3)) },
    { label: "6 Months", iso: yyyymmdd(addMonths(today, 6)) },
    { label: "1 Year", iso: yyyymmdd(addMonths(today, 12)) },
  ];

  const gradOptions = ["Middle School", "High School", "College", "Med School"];

  // ── Pill styles ─────────────────────────────────────────────
  const pillBase =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-[0.06em] transition-colors";
  const pillActive = "bg-amber text-white border-amber";
  const pillSecondary =
    "bg-amber-tint border-amber/25 text-amber hover:border-amber hover:bg-amber-tint";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[520px] max-h-[92vh] overflow-y-auto"
      >
        <div className="px-7 py-5 border-b border-navy/[0.08] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-navy tracking-[-0.3px]">
              Add Another Time Capsule
            </h2>
            <p className="mt-1 text-sm text-ink-mid">
              Create a new capsule. Start writing as soon as it&rsquo;s made.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-ink-mid hover:text-navy"
            aria-label="Close"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="px-7 py-5 space-y-5">
          {/* Name fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
                required
                className="account-input"
              />
            </Field>
            <Field label="Last name">
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="account-input"
              />
            </Field>
          </div>

          {/* DOB */}
          <Field label="Date of birth (optional)">
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="account-input"
            />
          </Field>

          {/* ── Divider ─────────────────────────────────────── */}
          <hr className="border-navy/[0.06]" />

          {/* Reveal date */}
          <div>
            <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-3">
              Reveal date (optional)
            </span>

            {/* Primary category pills */}
            <div className="flex flex-wrap gap-2 mb-3">
              {(
                [
                  ["quick", "Quick Pick"],
                  ["birthday", "Birthday"],
                  ["graduation", "Graduation"],
                  ["wedding", "Wedding Date"],
                  ["anniversary", "Anniversary"],
                ] as [RevealCategory, string][]
              ).map(([cat, label]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => selectCategory(cat)}
                  className={`${pillBase} ${
                    revealCategory === cat ? pillActive : pillSecondary
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Quick picks ──────────────────────────────── */}
            {revealCategory === "quick" && (
              <div className="flex flex-wrap gap-2 mb-3">
                {quickPicks.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => setRevealDate(q.iso)}
                    className={`${pillBase} ${
                      revealDate === q.iso ? pillActive : pillSecondary
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRevealDate("")}
                  className={`${pillBase} ${
                    revealCategory === "quick" && !quickPicks.some((q) => q.iso === revealDate) && revealDate
                      ? pillActive
                      : pillSecondary
                  }`}
                >
                  Write in Date
                </button>
                {/* Show date picker if "Write in Date" or no quick pick matched */}
                <div className="w-full mt-2">
                  <input
                    type="date"
                    value={quickPicks.some((q) => q.iso === revealDate) ? "" : revealDate}
                    onChange={(e) => setRevealDate(e.target.value)}
                    min={yyyymmdd(new Date(Date.now() + 86400000))}
                    className="account-input"
                  />
                </div>
              </div>
            )}

            {/* ── Birthday ─────────────────────────────────── */}
            {revealCategory === "birthday" && (
              <div className="space-y-2 mb-3">
                {!dob && (
                  <p className="text-xs text-ink-light italic">
                    Enter a date of birth above to calculate milestone ages.
                  </p>
                )}
                {dob && (
                  <div className="flex flex-wrap gap-2">
                    {[12, 18, 21, 30, 40, 50].map((age) => {
                      const d = new Date(dob);
                      d.setFullYear(d.getFullYear() + age);
                      const iso = yyyymmdd(d);
                      return (
                        <button
                          key={age}
                          type="button"
                          onClick={() => pickBirthdayAge(age)}
                          className={`${pillBase} ${
                            revealDate === iso ? pillActive : pillSecondary
                          }`}
                        >
                          {ordinal(age)}
                        </button>
                      );
                    })}
                  </div>
                )}
                <input
                  type="date"
                  value={revealDate}
                  onChange={(e) => setRevealDate(e.target.value)}
                  min={yyyymmdd(new Date(Date.now() + 86400000))}
                  className="account-input"
                />
              </div>
            )}

            {/* ── Graduation ───────────────────────────────── */}
            {revealCategory === "graduation" && (
              <div className="space-y-2 mb-3">
                <div className="flex flex-wrap gap-2">
                  {gradOptions.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setGradSelection(g);
                        setShowGradDate(false);
                        setRevealDate("");
                      }}
                      className={`${pillBase} ${
                        gradSelection === g ? pillActive : pillSecondary
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                {gradSelection && !showGradDate && (
                  <div className="space-y-2">
                    <p className="text-xs text-ink-mid">
                      Do you know the {gradSelection.toLowerCase()} graduation date?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowGradDate(true)}
                        className={`${pillBase} ${pillSecondary}`}
                      >
                        Yes, enter date
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRevealDate("");
                          setShowGradDate(false);
                        }}
                        className={`${pillBase} ${pillSecondary}`}
                      >
                        Not yet — remind me later
                      </button>
                    </div>
                  </div>
                )}
                {gradSelection && showGradDate && (
                  <input
                    type="date"
                    value={revealDate}
                    onChange={(e) => setRevealDate(e.target.value)}
                    min={yyyymmdd(new Date(Date.now() + 86400000))}
                    className="account-input"
                  />
                )}
              </div>
            )}

            {/* ── Wedding Date ─────────────────────────────── */}
            {revealCategory === "wedding" && (
              <div className="space-y-2 mb-3">
                <input
                  type="date"
                  value={revealDate}
                  onChange={(e) => setRevealDate(e.target.value)}
                  min={yyyymmdd(new Date(Date.now() + 86400000))}
                  className="account-input"
                />
                <button
                  type="button"
                  onClick={() => setRevealDate("")}
                  className={`${pillBase} ${pillSecondary}`}
                >
                  Fill in later
                </button>
              </div>
            )}

            {/* ── Anniversary ──────────────────────────────── */}
            {revealCategory === "anniversary" && (
              <div className="space-y-3 mb-3">
                <Field label="Wedding date">
                  <input
                    type="date"
                    value={weddingDate}
                    onChange={(e) => {
                      setWeddingDate(e.target.value);
                      setRevealDate("");
                    }}
                    max={new Date().toISOString().split("T")[0]}
                    className="account-input"
                  />
                </Field>
                {weddingDate && (
                  <div className="flex flex-wrap gap-2">
                    {[10, 15, 20, 30, 40, 50].map((years) => {
                      const d = new Date(weddingDate);
                      d.setFullYear(d.getFullYear() + years);
                      const iso = yyyymmdd(d);
                      if (d.getTime() <= Date.now()) return null;
                      return (
                        <button
                          key={years}
                          type="button"
                          onClick={() => pickAnniversaryYear(years)}
                          className={`${pillBase} ${
                            revealDate === iso ? pillActive : pillSecondary
                          }`}
                        >
                          {ordinal(years)}
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setRevealDate("");
                    setWeddingDate("");
                  }}
                  className={`${pillBase} ${pillSecondary}`}
                >
                  Fill in later
                </button>
              </div>
            )}

            {/* Date confirmation */}
            {revealDate && (
              <p className="text-xs text-ink-mid mt-1">
                Opens{" "}
                <span className="font-semibold text-navy">
                  {new Date(revealDate).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </p>
            )}

            <p className="mt-1.5 text-xs italic text-ink-light whitespace-nowrap">
              The date the capsule will open. Change it any time from the capsule&rsquo;s edit page.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="inline-flex items-start gap-2 text-sm text-red-600"
            >
              <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" />
              {error}
            </div>
          )}
        </div>

        {/* ── Divider + footer ──────────────────────────────── */}
        <div className="px-7 py-4 border-t border-navy/[0.08] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-sm font-semibold text-ink-mid hover:text-navy px-3 py-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
          >
            {saving ? "Creating\u2026" : "Create Capsule"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
        {label}
      </span>
      {children}
      {hint && <p className="mt-1.5 text-xs italic text-ink-light">{hint}</p>}
    </label>
  );
}
