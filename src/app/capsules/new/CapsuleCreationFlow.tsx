"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Home, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";
import { CAPSULE_MAX_HORIZON_MS } from "@/lib/capsules";

const PENDING_STEP1_KEY = "untilthen:capsule-pending-step1";

type PendingStep1 = {
  title: string;
  recipientFirstName: string;
  recipientLastName: string;
  occasionType: string;
  revealDate: string;
};

type OccasionType =
  | "BIRTHDAY"
  | "ANNIVERSARY"
  | "RETIREMENT"
  | "GRADUATION"
  | "WEDDING"
  | "OTHER";

const OCCASIONS: { value: OccasionType; label: string }[] = [
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "ANNIVERSARY", label: "Anniversary" },
  { value: "RETIREMENT", label: "Retirement" },
  { value: "GRADUATION", label: "Graduation" },
  { value: "WEDDING", label: "Wedding" },
  { value: "OTHER", label: "Other" },
];

const TIME_PRESETS = [
  { value: "09:00", label: "Morning (9am)" },
  { value: "14:00", label: "Afternoon (2pm)" },
  { value: "19:00", label: "Evening (7pm)" },
  { value: "00:00", label: "Midnight" },
] as const;

const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (ET)" },
  { value: "America/Chicago", label: "Central (CT)" },
  { value: "America/Denver", label: "Mountain (MT)" },
  { value: "America/Los_Angeles", label: "Pacific (PT)" },
  { value: "America/Anchorage", label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Central Europe (CET)" },
] as const;

function yyyymmdd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}

const pillActive = "bg-amber text-white border-amber";
const pillInactive =
  "bg-white border-navy/15 text-ink-mid hover:border-amber/40 hover:text-navy";

export function CapsuleCreationFlow() {
  const router = useRouter();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const [title, setTitle] = useState("");
  const [recipientFirstName, setRecipientFirstName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [recipientGender, setRecipientGender] = useState<"male" | "female">("female");
  const [occasionType, setOccasionType] = useState<OccasionType | null>(null);
  const [otherOccasion, setOtherOccasion] = useState("");
  const [revealDate, setRevealDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState(false);
  const [timezone, setTimezone] = useState(detectTimezone);
  const [dateAlert, setDateAlert] = useState(false);

  const maxDateIso = yyyymmdd(new Date(Date.now() + CAPSULE_MAX_HORIZON_MS));
  const minDateIso = yyyymmdd(new Date(Date.now() + 86400000));

  const recipientPronoun = recipientGender === "female" ? "her" : "him";
  const recipientName = `${recipientFirstName.trim()} ${recipientLastName.trim()}`.trim();

  useEffect(() => {
    try {
      const pendingRaw = window.localStorage.getItem(PENDING_STEP1_KEY);
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw) as Partial<PendingStep1>;
        if (pending.title) setTitle(pending.title);
        if (pending.recipientFirstName) setRecipientFirstName(pending.recipientFirstName);
        if (pending.recipientLastName) setRecipientLastName(pending.recipientLastName);
        if (pending.occasionType) setOccasionType(pending.occasionType as OccasionType);
        if (pending.revealDate) setRevealDate(pending.revealDate);
      }
    } catch { /* ignore */ }
  }, []);

  function handleRevealDate(iso: string) {
    if (!iso) { setRevealDate(""); setDateAlert(false); return; }
    const picked = new Date(iso + "T00:00:00");
    const maxDate = new Date(Date.now() + CAPSULE_MAX_HORIZON_MS);
    if (picked > maxDate) {
      setDateAlert(true);
      setRevealDate("");
      return;
    }
    setDateAlert(false);
    setRevealDate(iso);
  }

  function validate(): string[] {
    const errors: string[] = [];
    if (!title.trim()) errors.push("Title is required");
    if (!recipientFirstName.trim()) errors.push("Recipient first name is required");
    if (!occasionType) errors.push("Please select an occasion");
    if (!revealDate) errors.push("Please select a reveal date");
    if (!deliveryTime) errors.push("Please select a delivery time");
    return errors;
  }

  async function submitStep1(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setValidationErrors([]);

    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (authLoaded && !isSignedIn) {
      const snapshot: PendingStep1 = {
        title: title.trim(),
        recipientFirstName: recipientFirstName.trim(),
        recipientLastName: recipientLastName.trim(),
        occasionType: occasionType ?? "OTHER",
        revealDate,
      };
      try { window.localStorage.setItem(PENDING_STEP1_KEY, JSON.stringify(snapshot)); } catch { /* */ }
      router.push(`/sign-up?redirect_url=${encodeURIComponent("/capsules/new")}`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/capsules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          recipientName,
          recipientPronoun,
          occasionType: occasionType ?? "OTHER",
          revealDate,
          deliveryTime,
          timezone,
          requiresApproval: false,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't save the capsule.");
      }
      const data = (await res.json()) as { id: string };
      try { window.localStorage.removeItem(PENDING_STEP1_KEY); } catch { /* */ }
      router.push(`/capsules/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-navy/[0.06]">
        <div className="mx-auto max-w-[720px] px-6 lg:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.back()}
              className="w-9 h-9 rounded-full border border-navy/15 flex items-center justify-center text-ink-mid hover:text-navy hover:border-navy transition-colors"
              aria-label="Go back">
              <ArrowLeft size={16} strokeWidth={1.75} />
            </button>
            <Link href="/dashboard"
              className="w-9 h-9 rounded-full border border-navy/15 flex items-center justify-center text-ink-mid hover:text-navy hover:border-navy transition-colors"
              aria-label="Home">
              <Home size={16} strokeWidth={1.75} />
            </Link>
          </div>
          <LogoSvg variant="dark" width={110} height={22} />
        </div>
      </header>

      <section className="mx-auto max-w-[560px] px-6 lg:px-10 pt-10 pb-24 overflow-hidden">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] uppercase text-amber mb-4">
          <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
          Gift Capsule
        </div>

        <form onSubmit={submitStep1} className="space-y-5">
          <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
            Create a Gift Capsule
          </h1>
          <p className="text-[15px] text-ink-mid leading-[1.6]">
            A one-time gift they&rsquo;ll open on a day that matters. Filled with messages from the people who love them.
          </p>

          <Field label="What are you celebrating?" hint="This is what people will see when they&rsquo;re invited.">
            <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); setValidationErrors([]); }}
              placeholder="Mom's 60th Birthday" className="account-input" />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Recipient first name">
              <input type="text" value={recipientFirstName} onChange={(e) => { setRecipientFirstName(e.target.value); setValidationErrors([]); }}
                placeholder="Margaret" className="account-input" />
            </Field>
            <Field label="Recipient last name">
              <input type="text" value={recipientLastName} onChange={(e) => setRecipientLastName(e.target.value)}
                placeholder="Smith" className="account-input" />
            </Field>
          </div>

          <div>
            <Label>Recipient gender</Label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: "female" as const, label: "Female" },
                { value: "male" as const, label: "Male" },
              ]).map((g) => (
                <button key={g.value} type="button" onClick={() => setRecipientGender(g.value)}
                  className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                    recipientGender === g.value ? pillActive : pillInactive
                  }`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Occasion &mdash; select one</Label>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => (
                <button key={o.value} type="button" onClick={() => { setOccasionType(o.value); setValidationErrors([]); }}
                  className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                    occasionType === o.value ? pillActive : pillInactive
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>
            {occasionType === "OTHER" && (
              <div className="mt-3">
                <input type="text" value={otherOccasion} onChange={(e) => setOtherOccasion(e.target.value)}
                  placeholder="Describe the occasion..." className="account-input" />
              </div>
            )}
          </div>

          {occasionType && (
            <div>
              <Label>Reveal date</Label>
              <input
                type="date"
                value={revealDate}
                onChange={(e) => { handleRevealDate(e.target.value); setValidationErrors([]); }}
                min={minDateIso}
                max={maxDateIso}
                className="account-input max-w-[220px]"
              />
              {dateAlert && (
                <div className="mt-2 rounded-lg bg-amber-tint border border-amber/30 px-3 py-2">
                  <p className="text-xs text-navy font-semibold">
                    Gift Capsules must open within 60 days.
                  </p>
                  <p className="text-xs text-ink-mid mt-0.5">
                    Please check back closer to the reveal date to create this capsule.
                  </p>
                </div>
              )}
              <p className="mt-2 text-xs italic text-ink-light">
                They&rsquo;ll open everything at once on this day.
              </p>
            </div>
          )}

          {revealDate && (
            <div>
              <Label>What time should we deliver this?</Label>
              <div className="flex flex-wrap gap-2">
                {TIME_PRESETS.map((t) => (
                  <button key={t.value} type="button" onClick={() => { setDeliveryTime(t.value); setCustomTime(false); setValidationErrors([]); }}
                    className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                      deliveryTime === t.value && !customTime ? pillActive : pillInactive
                    }`}>
                    {t.label}
                  </button>
                ))}
                <button type="button" onClick={() => { setCustomTime(true); setDeliveryTime(""); setValidationErrors([]); }}
                  className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                    customTime ? pillActive : pillInactive
                  }`}>
                  Custom
                </button>
              </div>
              {customTime && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-ink-mid whitespace-nowrap">Reveal time:</span>
                  <input type="time" value={deliveryTime ?? ""} onChange={(e) => setDeliveryTime(e.target.value)}
                    className="account-input w-auto max-w-[140px]" />
                </div>
              )}
            </div>
          )}

          {deliveryTime && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-ink-mid whitespace-nowrap">Timezone:</span>
              <select
                value={COMMON_TIMEZONES.some((tz) => tz.value === timezone) ? timezone : "__other"}
                onChange={(e) => setTimezone(e.target.value)}
                className="account-input w-auto"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
                {!COMMON_TIMEZONES.some((tz) => tz.value === timezone) && (
                  <option value={timezone}>{timezone}</option>
                )}
              </select>
            </div>
          )}

          {validationErrors.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3" role="alert">
              <p className="text-xs font-bold text-red-700 mb-1">Please complete the following:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {validationErrors.map((err) => (
                  <li key={err} className="text-xs text-red-600">{err}</li>
                ))}
              </ul>
            </div>
          )}
          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

          <button type="submit"
            disabled={saving}
            className="w-full bg-amber text-white py-3.5 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60">
            {saving ? "Saving\u2026" : "Continue"}
          </button>
          <p className="text-center text-xs italic text-ink-light">
            {authLoaded && !isSignedIn
              ? "No payment yet. We\u2019ll ask you to create a free account to save your capsule."
              : "No payment yet. Payment takes place prior to final recipient information entered or contributors invited."}
          </p>
        </form>
      </section>
    </main>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      {children}
      {hint && <p className="mt-1.5 text-xs italic text-ink-light">{hint}</p>}
    </label>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
      {children}
    </span>
  );
}
