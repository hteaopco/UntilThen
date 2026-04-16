"use client";

import { AlertCircle, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type RevealCategory =
  | "quick"
  | "birthday"
  | "graduation"
  | "wedding"
  | "anniversary"
  | null;

// Use local date parts to avoid UTC off-by-one.
function yyyymmdd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Parse a yyyy-mm-dd string as LOCAL midnight (not UTC).
function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d);
}

function addMonths(date: Date, months: number): Date {
  const r = new Date(date);
  r.setMonth(r.getMonth() + months);
  return r;
}

function ordinal(n: number): string {
  if (n === 21) return "21st";
  if (n === 22) return "22nd";
  if (n === 23) return "23rd";
  if (n === 31) return "31st";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0] ?? "th"}`;
}

const MIN_DAYS = 90;

// ── Pill styles ───────────────────────────────────────────────
const pillBase =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-[0.06em] transition-colors";
const pillPrimaryActive = "bg-amber text-white border-amber";
const pillPrimaryInactive =
  "bg-white border-navy/15 text-ink-mid hover:border-navy hover:text-navy";
const pillSecBase =
  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-[0.06em] transition-colors";
const pillSecActive = "bg-amber text-white border-amber";
const pillSecInactive =
  "bg-amber-tint border-amber/25 text-amber hover:border-amber";
const pillGreenActive = "bg-sage text-white border-sage";
const pillGreenInactive =
  "bg-white border-navy/15 text-ink-mid hover:border-sage hover:text-sage";
// Disabled / past milestone
const pillDisabled =
  "bg-[#f5f5f5] border-navy/8 text-ink-light cursor-not-allowed opacity-50";

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
  const [dateKnown, setDateKnown] = useState<boolean | null>(null);
  const [leaveBlank, setLeaveBlank] = useState(false);
  const [showWriteIn, setShowWriteIn] = useState(false);
  const [dateAlert, setDateAlert] = useState(false);

  // Reveal is "set" if a date is picked, or user explicitly chose
  // "leave blank" / "remind me later" / "fill in later".
  const revealResolved =
    revealDate.length > 0 || leaveBlank || dateKnown === false;

  const canSubmit = firstName.trim().length > 0 && revealResolved && !saving;

  const minDateIso = yyyymmdd(addMonths(new Date(), 3)); // 90 days ≈ 3 months

  function validateAndSetDate(iso: string) {
    if (!iso) { setRevealDate(""); return; }
    const picked = parseLocal(iso);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + MIN_DAYS);
    if (picked < cutoff) {
      setDateAlert(true);
      setRevealDate("");
      return;
    }
    setDateAlert(false);
    setRevealDate(iso);
  }

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
    setDateKnown(null);
    setLeaveBlank(false);
    setShowWriteIn(false);
    setDateAlert(false);
  }

  function pickBirthdayAge(age: number) {
    if (!dob) return;
    const d = parseLocal(dob);
    d.setFullYear(d.getFullYear() + age);
    setRevealDate(yyyymmdd(d));
    setShowWriteIn(false);
    setDateAlert(false);
  }

  function pickAnniversaryYear(years: number) {
    if (!weddingDate) return;
    const d = parseLocal(weddingDate);
    d.setFullYear(d.getFullYear() + years);
    setRevealDate(yyyymmdd(d));
    setLeaveBlank(false);
    setDateAlert(false);
  }

  const today = new Date();
  const quickPicks = [
    { label: "3 Months", iso: yyyymmdd(addMonths(today, 3)) },
    { label: "6 Months", iso: yyyymmdd(addMonths(today, 6)) },
    { label: "1 Year", iso: yyyymmdd(addMonths(today, 12)) },
  ];

  const gradOptions = ["Middle School", "High School", "College", "Med School"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[520px] max-h-[92vh] overflow-y-auto">
        <div className="px-7 py-5 border-b border-navy/[0.08] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-navy tracking-[-0.3px]">Add Another Time Capsule</h2>
            <p className="mt-1 text-sm text-ink-mid">Create a new capsule. Start writing as soon as it&rsquo;s made.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="text-ink-mid hover:text-navy" aria-label="Close">
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="px-7 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name">
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus required className="account-input" />
            </Field>
            <Field label="Last name">
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="account-input" />
            </Field>
          </div>

          <Field label="Date of birth (optional)">
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={yyyymmdd(today)} className="account-input" />
          </Field>

          {/* ── Reveal date ─────────────────────────────────── */}
          <div>
            <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-3">
              Reveal date
            </span>

            <div className="flex flex-wrap gap-2">
              {([
                ["quick", "Quick Pick"],
                ["birthday", "Birthday"],
                ["graduation", "Graduation"],
                ["wedding", "Wedding Date"],
                ["anniversary", "Anniversary"],
              ] as [RevealCategory, string][]).map(([cat, label]) => (
                <button key={cat} type="button" onClick={() => selectCategory(cat)}
                  className={`${pillBase} ${revealCategory === cat ? pillPrimaryActive : pillPrimaryInactive}`}>{label}</button>
              ))}
            </div>

            {revealCategory && <hr className="border-navy/[0.06] my-3" />}

            {/* 90-day alert */}
            {dateAlert && (
              <div className="rounded-lg bg-amber-tint border border-amber/30 px-3 py-2 mb-3">
                <p className="text-xs text-navy font-semibold">Time capsules must have a reveal date at least 90 days from today.</p>
                <p className="text-xs text-ink-mid mt-1">
                  Need something sooner?{" "}
                  <Link href="/capsules/new" className="text-amber font-semibold hover:text-amber-dark">
                    Use a Gift Capsule instead →
                  </Link>
                </p>
              </div>
            )}

            {/* ── Quick picks ────────────────────────────── */}
            {revealCategory === "quick" && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {quickPicks.map((q) => (
                    <button key={q.label} type="button"
                      onClick={() => { setRevealDate(q.iso); setLeaveBlank(false); setShowWriteIn(false); setDateAlert(false); }}
                      className={`${pillSecBase} ${revealDate === q.iso && !leaveBlank ? pillSecActive : pillSecInactive}`}>{q.label}</button>
                  ))}
                  <button type="button" onClick={() => { setShowWriteIn(true); setLeaveBlank(false); setRevealDate(""); setDateAlert(false); }}
                    className={`${pillSecBase} ${showWriteIn ? pillSecActive : pillSecInactive}`}>Write in Date</button>
                  <button type="button" onClick={() => { setLeaveBlank(true); setRevealDate(""); setShowWriteIn(false); setDateAlert(false); }}
                    className={`${pillSecBase} ${leaveBlank ? pillGreenActive : pillGreenInactive}`}>Leave Blank for Now</button>
                </div>
                {showWriteIn && (
                  <input type="date" value={revealDate} onChange={(e) => validateAndSetDate(e.target.value)} min={minDateIso} className="account-input" />
                )}
              </div>
            )}

            {/* ── Birthday ───────────────────────────────── */}
            {revealCategory === "birthday" && (
              <div className="space-y-2">
                {!dob && <p className="text-xs text-ink-light italic">Enter a date of birth above to calculate milestone ages.</p>}
                {dob && (
                  <div className="flex flex-wrap gap-2">
                    {[12, 18, 21, 30, 40, 50].map((age) => {
                      const d = parseLocal(dob);
                      d.setFullYear(d.getFullYear() + age);
                      const iso = yyyymmdd(d);
                      const inFuture = d.getTime() > Date.now();
                      return (
                        <button key={age} type="button"
                          onClick={() => inFuture && pickBirthdayAge(age)}
                          disabled={!inFuture}
                          className={`${pillSecBase} ${!inFuture ? pillDisabled : revealDate === iso && !showWriteIn ? pillSecActive : pillSecInactive}`}
                        >{ordinal(age)}</button>
                      );
                    })}
                    <button type="button" onClick={() => { setShowWriteIn(true); setRevealDate(""); setDateAlert(false); }}
                      className={`${pillSecBase} ${showWriteIn ? pillSecActive : pillSecInactive}`}>Write in Date</button>
                  </div>
                )}
                {showWriteIn && (
                  <input type="date" value={revealDate} onChange={(e) => validateAndSetDate(e.target.value)} min={minDateIso} className="account-input" />
                )}
              </div>
            )}

            {/* ── Graduation ─────────────────────────────── */}
            {revealCategory === "graduation" && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {gradOptions.map((g) => (
                    <button key={g} type="button"
                      onClick={() => { setGradSelection(g); setDateKnown(null); setRevealDate(""); setDateAlert(false); }}
                      className={`${pillSecBase} ${gradSelection === g ? pillSecActive : pillSecInactive}`}>{g}</button>
                  ))}
                </div>
                {gradSelection && dateKnown === null && (
                  <div className="space-y-2">
                    <p className="text-xs text-ink-mid">Do you know the {gradSelection.toLowerCase()} graduation date?</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setDateKnown(true)}
                        className={`${pillSecBase} ${pillGreenInactive}`}>Yes, enter date</button>
                      <button type="button" onClick={() => setDateKnown(false)}
                        className={`${pillSecBase} ${pillGreenInactive}`}>Not yet — remind me later</button>
                    </div>
                  </div>
                )}
                {gradSelection && dateKnown === true && (
                  <input type="date" value={revealDate} onChange={(e) => validateAndSetDate(e.target.value)} min={minDateIso} className="account-input" />
                )}
                {gradSelection && dateKnown === false && (
                  <p className="text-xs text-sage font-semibold">Got it — we&rsquo;ll remind you to set the exact date later.</p>
                )}
              </div>
            )}

            {/* ── Wedding Date ───────────────────────────── */}
            {revealCategory === "wedding" && (
              <div className="space-y-2">
                {dateKnown === null && (
                  <div className="space-y-2">
                    <p className="text-xs text-ink-mid">Do you know the wedding date?</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setDateKnown(true)}
                        className={`${pillSecBase} ${pillGreenInactive}`}>Yes, enter date</button>
                      <button type="button" onClick={() => setDateKnown(false)}
                        className={`${pillSecBase} ${pillGreenInactive}`}>Not yet — remind me later</button>
                    </div>
                  </div>
                )}
                {dateKnown === true && (
                  <input type="date" value={revealDate} onChange={(e) => validateAndSetDate(e.target.value)} min={minDateIso} className="account-input" />
                )}
                {dateKnown === false && (
                  <p className="text-xs text-sage font-semibold">Got it — we&rsquo;ll remind you to set the date later.</p>
                )}
              </div>
            )}

            {/* ── Anniversary ────────────────────────────── */}
            {revealCategory === "anniversary" && (
              <div className="space-y-3">
                <Field label="Wedding date">
                  <input type="date" value={weddingDate}
                    onChange={(e) => { setWeddingDate(e.target.value); setRevealDate(""); setLeaveBlank(false); setDateAlert(false); }}
                    max={yyyymmdd(today)} className="account-input" />
                </Field>
                {weddingDate && (
                  <div className="flex flex-wrap gap-2">
                    {[5, 10, 15, 20, 30, 40, 50].map((years) => {
                      const d = parseLocal(weddingDate);
                      d.setFullYear(d.getFullYear() + years);
                      const iso = yyyymmdd(d);
                      const inFuture = d.getTime() > Date.now();
                      return (
                        <button key={years} type="button"
                          onClick={() => inFuture && pickAnniversaryYear(years)}
                          disabled={!inFuture}
                          className={`${pillSecBase} ${!inFuture ? pillDisabled : revealDate === iso && !leaveBlank ? pillSecActive : pillSecInactive}`}
                        >{ordinal(years)}</button>
                      );
                    })}
                    <button type="button"
                      onClick={() => { setLeaveBlank(true); setRevealDate(""); setDateAlert(false); }}
                      className={`${pillSecBase} ${leaveBlank ? pillGreenActive : pillGreenInactive}`}>Fill in later</button>
                  </div>
                )}
              </div>
            )}

            {/* Date confirmation */}
            {revealDate && (
              <p className="text-xs text-ink-mid mt-2">
                Opens{" "}
                <span className="font-semibold text-navy">
                  {parseLocal(revealDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              </p>
            )}

            <p className="mt-1.5 text-xs italic text-ink-light whitespace-nowrap">
              The date the capsule will open. Change it any time from the capsule&rsquo;s edit page.
            </p>
          </div>

          {error && (
            <div role="alert" className="inline-flex items-start gap-2 text-sm text-red-600">
              <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" />
              {error}
            </div>
          )}
        </div>

        <div className="px-7 py-4 border-t border-navy/[0.08] flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} disabled={saving} className="text-sm font-semibold text-ink-mid hover:text-navy px-3 py-2 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={!canSubmit}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-colors ${canSubmit ? "bg-amber text-white hover:bg-amber-dark" : "bg-navy/10 text-ink-light cursor-not-allowed"}`}>
            {saving ? "Creating\u2026" : "Create Capsule"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">{label}</span>
      {children}
    </label>
  );
}
