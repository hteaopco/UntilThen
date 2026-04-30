"use client";

import { useAuth } from "@clerk/nextjs";
import { Check, Feather, Flame, HandHeart, Heart, PartyPopper, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  EmployeePickerModal,
  type PickedEmployee,
} from "@/components/enterprise/EmployeePickerModal";
import {
  CAPSULE_MAX_HORIZON_MS,
  WEDDING_MAX_HORIZON_MS,
} from "@/lib/capsules";
import {
  REVEAL_MIN_LEAD_MS,
  combineRevealMs,
} from "@/lib/reveal-schedule";
import {
  TONE_LABELS,
  TONE_DESCRIPTIONS,
  type CapsuleTone,
} from "@/lib/tone";

const PENDING_STEP1_KEY = "untilthen:capsule-pending-step1";

type OccasionType =
  | "BIRTHDAY"
  | "ANNIVERSARY"
  | "RETIREMENT"
  | "GRADUATION"
  | "WEDDING"
  | "OTHER";

type Gender = "female" | "male" | "couple";

const TONE_ICONS: Record<CapsuleTone, React.ReactNode> = {
  CELEBRATION: <PartyPopper size={20} strokeWidth={1.5} />,
  GRATITUDE: <HandHeart size={20} strokeWidth={1.5} />,
  THINKING_OF_YOU: <Feather size={20} strokeWidth={1.5} />,
  ENCOURAGEMENT: <Flame size={20} strokeWidth={1.5} />,
  LOVE: <Heart size={20} strokeWidth={1.5} />,
  OTHER: <Sparkles size={20} strokeWidth={1.5} />,
};

const OCCASIONS: { value: OccasionType; label: string }[] = [
  { value: "BIRTHDAY", label: "Birthday" },
  { value: "ANNIVERSARY", label: "Anniversary" },
  { value: "RETIREMENT", label: "Retirement" },
  { value: "GRADUATION", label: "Graduation" },
  { value: "WEDDING", label: "Wedding" },
  { value: "OTHER", label: "Other" },
];

const TIME_PRESETS = [
  { value: "09:00", label: "Morning (9:00 AM)" },
  { value: "14:00", label: "Afternoon (2:00 PM)" },
  { value: "19:00", label: "Evening (7:00 PM)" },
  { value: "00:00", label: "Midnight (12:00 AM)" },
] as const;

/** "09:00" → "9:00 AM", "14:00" → "2:00 PM", "00:00" → "12:00 AM" */
function formatTime12h(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  const min = m[2];
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${min} ${period}`;
}

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

const STEP_BLURBS = [
  "Take the next step",
  "Getting closer",
  "Almost there",
  "One more",
  "Last detail",
  "",
] as const;

const TOTAL_STEPS = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TONE_OPTIONS: CapsuleTone[] = [
  "CELEBRATION", "GRATITUDE", "THINKING_OF_YOU", "ENCOURAGEMENT", "LOVE", "OTHER",
];

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

// Add one year to a yyyy-mm-dd string in UTC. Used by the wedding
// flow to derive the actual reveal date (wedding + 1 year) without
// the local-timezone off-by-one that bites if you parse the ISO as
// local midnight on Jan 1 in a UTC- zone.
function addOneYearIsoUtc(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function formatIsoLong(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

const pillActive = "bg-amber text-white border-amber";
const pillInactive =
  "bg-white border-navy/15 text-ink-mid hover:border-amber/40 hover:text-navy";

export function CapsuleCreationFlow({
  initialOccasion,
  attribution = "personal",
  organizationId = null,
}: {
  /** Pre-select an occasion when the flow is reached from a
   *  product-specific landing (e.g. /weddings → ?occasion=WEDDING).
   *  Couple gender is pre-selected for WEDDING since wedding
   *  capsules are always for the couple. */
  initialOccasion?: OccasionType;
  /** Drives whether the API stamps organizationId on the new
   *  capsule. Defaults to "personal" — only set to "enterprise"
   *  when the user came through the /enterprise dashboard CTA
   *  (/capsules/new?source=enterprise). Org members visiting
   *  /capsules/new directly produce personal capsules even
   *  though they belong to an org. */
  attribution?: "personal" | "enterprise";
  /** When non-null, Step 1 surfaces an "Add from database" CTA
   *  that opens the single-select EmployeePickerModal scoped to
   *  this org. Resolved server-side in page.tsx — only ever
   *  populated for enterprise-attributed visitors. */
  organizationId?: string | null;
} = {}) {
  const router = useRouter();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();

  const isWedding = initialOccasion === "WEDDING";
  // Wedding flow skips Step 0 (tone — locked to LOVE) entirely.
  // The user picked WEDDING from the /weddings landing, so the
  // tone interstitial is just friction. Counter + back button
  // both clamp to firstStep below.
  const firstStep = isWedding ? 1 : 0;
  const visibleStepCount = TOTAL_STEPS - firstStep;

  const [step, setStep] = useState(firstStep);
  const [error, setError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [tone, setTone] = useState<CapsuleTone | null>(
    isWedding ? "LOVE" : null,
  );
  const [title, setTitle] = useState("");
  const [recipientFirstName, setRecipientFirstName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [recipient2FirstName, setRecipient2FirstName] = useState("");
  const [recipient2LastName, setRecipient2LastName] = useState("");
  const [recipientGender, setRecipientGender] = useState<Gender>(
    isWedding ? "couple" : "female",
  );
  const [occasionType, setOccasionType] = useState<OccasionType | null>(
    initialOccasion ?? null,
  );
  const [otherOccasion, setOtherOccasion] = useState("");
  const [revealDate, setRevealDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState(false);
  const [timezone, setTimezone] = useState(detectTimezone);
  const [dateAlert, setDateAlert] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipient2Email, setRecipient2Email] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  function applyPickedEmployee(picks: PickedEmployee[]) {
    const p = picks[0];
    if (!p) return;
    setRecipientFirstName(p.firstName);
    setRecipientLastName(p.lastName);
    setRecipientEmail(p.email);
    setStepError(null);
    setPickerOpen(false);
  }

  // Wedding capsules get the long horizon (600 days) so the
  // default 1-year-anniversary reveal works even when the
  // capsule is purchased months before the wedding.
  const horizonMs =
    occasionType === "WEDDING"
      ? WEDDING_MAX_HORIZON_MS
      : CAPSULE_MAX_HORIZON_MS;
  const maxDateIso = yyyymmdd(new Date(Date.now() + horizonMs));
  const minDateIso = yyyymmdd(new Date(Date.now() + 86400000));

  const isCouple = recipientGender === "couple";
  const recipientPronoun = isCouple ? "them" : recipientGender === "female" ? "her" : "him";

  const recipientName = isCouple
    ? `${recipientFirstName.trim()} & ${recipient2FirstName.trim()}`.trim()
    : `${recipientFirstName.trim()} ${recipientLastName.trim()}`.trim();

  useEffect(() => {
    // Consume-on-read: hydrate the form from the stash that was
    // written when a signed-out user got redirected to /sign-up
    // mid-flow, then immediately clear it. Without the clear, a
    // user who abandons the flow after signing up sees the old
    // values pre-filled the next time they start a new capsule.
    try {
      const raw = window.localStorage.getItem(PENDING_STEP1_KEY);
      if (!raw) return;
      window.localStorage.removeItem(PENDING_STEP1_KEY);
      const p = JSON.parse(raw) as Record<string, string>;
      if (p.title) setTitle(p.title);
      if (p.recipientFirstName) setRecipientFirstName(p.recipientFirstName);
      if (p.recipientLastName) setRecipientLastName(p.recipientLastName);
      if (p.occasionType) setOccasionType(p.occasionType as OccasionType);
      if (p.revealDate) setRevealDate(p.revealDate);
    } catch { /* ignore */ }
  }, []);

  function handleRevealDate(iso: string) {
    if (!iso) { setRevealDate(""); setDateAlert(false); return; }
    const picked = new Date(iso + "T00:00:00");
    if (picked > new Date(Date.now() + horizonMs)) {
      setDateAlert(true);
      setRevealDate("");
      return;
    }
    setDateAlert(false);
    setRevealDate(iso);
  }

  function validateStep(): string | null {
    if (step === 0) {
      if (!tone) return "Please select a tone";
      return null;
    }
    if (step === 1) {
      if (!title.trim()) return "Please add a title";
      if (!recipientFirstName.trim()) return "Recipient first name is required";
      if (isCouple && !recipient2FirstName.trim()) return "Second recipient first name is required";
      return null;
    }
    if (step === 2) {
      if (!occasionType) return "Please select an occasion";
      if (!revealDate) return "Please select a reveal date";
      return null;
    }
    if (step === 3) {
      if (!deliveryTime) return "Please select a delivery time";
      // Mirror the API's same-day buffer so a manually-typed
      // custom time can't slip past the picker. Wedding flow's
      // actual reveal is +1 year, so check against that to avoid
      // a false-positive on wedding-day picks.
      const checkIso =
        isWedding && revealDate ? addOneYearIsoUtc(revealDate) : revealDate;
      if (checkIso) {
        const ms = combineRevealMs(checkIso, deliveryTime, timezone);
        if (!Number.isNaN(ms) && ms < Date.now() + REVEAL_MIN_LEAD_MS) {
          return "Pick a time at least 2 hours from now";
        }
      }
      return null;
    }
    if (step === 4) {
      const trimmed = recipientEmail.trim();
      if (!trimmed) return "Recipient email is required";
      if (!EMAIL_RE.test(trimmed))
        return "Please enter a valid email address";
      if (isCouple) {
        const trimmed2 = recipient2Email.trim();
        if (!trimmed2) return "Second recipient email is required";
        if (!EMAIL_RE.test(trimmed2))
          return "Please enter a valid second recipient email";
      }
      return null;
    }
    return null;
  }

  const stepComplete = validateStep() === null;

  function goNext() {
    setStepError(null);
    const err = validateStep();
    if (err) { setStepError(err); return; }
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  }

  function goBack() {
    setStepError(null);
    if (step > firstStep) setStep(step - 1);
  }

  async function submit() {
    if (saving) return;
    setError(null);

    if (authLoaded && !isSignedIn) {
      try {
        window.localStorage.setItem(PENDING_STEP1_KEY, JSON.stringify({
          title: title.trim(),
          recipientFirstName: recipientFirstName.trim(),
          recipientLastName: recipientLastName.trim(),
          occasionType: occasionType ?? "OTHER",
          revealDate,
        }));
      } catch { /* */ }
      router.push(`/sign-up?redirect_url=${encodeURIComponent("/capsules/new")}`);
      return;
    }

    setSaving(true);
    try {
      const fullName = isCouple
        ? `${recipientFirstName.trim()} ${recipientLastName.trim()} & ${recipient2FirstName.trim()} ${recipient2LastName.trim()}`.replace(/\s+/g, " ").trim()
        : `${recipientFirstName.trim()} ${recipientLastName.trim()}`.trim();

      const res = await fetch("/api/capsules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          recipientName: fullName,
          recipientPronoun,
          recipientEmail: recipientEmail.trim() || null,
          recipient2Email: isCouple
            ? recipient2Email.trim() || null
            : null,
          occasionType: occasionType ?? "OTHER",
          tone: tone ?? "CELEBRATION",
          // Wedding flow: the date input collects the wedding day,
          // and the capsule sends one year later. Add the year here
          // (UTC-safe) so backend always receives the actual reveal
          // date regardless of the picker's local timezone.
          revealDate: isWedding && revealDate
            ? addOneYearIsoUtc(revealDate)
            : revealDate,
          deliveryTime,
          timezone,
          requiresApproval: false,
          attribution,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't save the capsule.");
      }
      const data = (await res.json()) as { id: string };
      try { window.localStorage.removeItem(PENDING_STEP1_KEY); } catch { /* */ }
      // ?welcome=1 prompts the capsule overview to open the
      // first-run "Add a cover photo" modal once. The flag is
      // stripped after the modal closes so a refresh doesn't
      // re-prompt.
      router.push(`/capsules/${data.id}?welcome=1`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const progress =
    ((step - firstStep + 1) / visibleStepCount) * 100;

  // Same-day reveal guard: combine the chosen date + each
  // delivery-time preset in the chosen timezone, then hide any
  // preset whose resulting moment is inside the 2-hour buffer.
  // Wedding flow's actual reveal is the picked date + 1 year, so
  // we use that for the comparison; for every other occasion the
  // raw revealDate is the moment.
  const effectiveRevealIso =
    isWedding && revealDate ? addOneYearIsoUtc(revealDate) : revealDate;
  const minRevealMs = Date.now() + REVEAL_MIN_LEAD_MS;
  function presetIsAvailable(presetTime: string): boolean {
    if (!effectiveRevealIso) return true;
    const ms = combineRevealMs(effectiveRevealIso, presetTime, timezone);
    return Number.isNaN(ms) || ms >= minRevealMs;
  }
  const availablePresets = TIME_PRESETS.filter((t) =>
    presetIsAvailable(t.value),
  );
  // Earliest valid HH:MM the custom <input type="time"> can accept
  // when the chosen date matches "today" (in the selected tz).
  // Returns undefined for future dates, where any time is fine.
  let customMinTime: string | undefined;
  if (effectiveRevealIso) {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const parts: Record<string, string> = {};
    for (const p of fmt.formatToParts(new Date(minRevealMs))) {
      if (p.type !== "literal") parts[p.type] = p.value;
    }
    const minDateInTz = `${parts.year}-${parts.month}-${parts.day}`;
    if (minDateInTz === effectiveRevealIso) {
      customMinTime = `${parts.hour}:${parts.minute}`;
    }
  }

  // Drop a previously-selected preset that's no longer available
  // — happens when the user goes back to step 2, picks today,
  // and returns to step 3 with the old "Morning (9am)" still
  // pinned even though it's now in the past. Custom times are
  // left alone (the user typed them deliberately and the input's
  // min attribute keeps them honest).
  useEffect(() => {
    if (!deliveryTime || customTime) return;
    if (!TIME_PRESETS.some((t) => t.value === deliveryTime)) return;
    if (!presetIsAvailable(deliveryTime)) {
      setDeliveryTime(null);
    }
    // presetIsAvailable closes over revealDate + timezone, both
    // listed below — eslint is OK with this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealDate, timezone, deliveryTime, customTime, isWedding]);

  return (
    <main className="min-h-screen bg-cream">
      {/* The page-level TopNav (rendered by /capsules/new/page.tsx)
          owns the back / home / settings / wordmark / avatar
          chrome — the wizard used to render a stripped-down
          version of that header here, which double-stacked once
          the page added the standard nav. */}

      {/* Progress bar */}
      <div className="mx-auto max-w-[560px] px-6 lg:px-10 pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-ink-light">
            Step {step - firstStep + 1} of {visibleStepCount}
          </span>
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-amber">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-navy/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-amber transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <section className="mx-auto max-w-[560px] px-6 lg:px-10 pt-8 pb-24 overflow-hidden">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] uppercase text-amber mb-4">
          <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
          {occasionType === "WEDDING" ? "Wedding Capsule" : "Gift Capsule"}
        </div>

        <div>
          {/* ── Step 0: Tone ───────────────────────────── */}
          {step === 0 && (
            <div className="space-y-5">
              <h1 className="text-[24px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
                What kind of moment is this?
              </h1>
              <p className="text-[15px] text-ink-mid leading-[1.6]">
                This shapes how it feels when they open it.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTone(t); setStepError(null); }}
                    className={`text-left rounded-xl border px-4 py-3.5 transition-all ${
                      tone === t
                        ? "border-amber bg-amber-tint/60 shadow-[0_2px_8px_rgba(196,122,58,0.12)]"
                        : "border-navy/10 bg-white hover:border-amber/30"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`shrink-0 ${tone === t ? "text-amber" : "text-ink-light"}`}>{TONE_ICONS[t]}</span>
                      <div>
                        <div className={`text-[14px] font-bold ${tone === t ? "text-amber" : "text-navy"}`}>
                          {TONE_LABELS[t]}
                        </div>
                        <div className="text-[12px] text-ink-light leading-[1.4]">
                          {TONE_DESCRIPTIONS[t]}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 1: Who's it for? ──────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
                Who&rsquo;s it for?
              </h1>
              <p className="text-[15px] text-ink-mid leading-[1.6]">
                More than a gift &mdash; words, voices and memories
                they&rsquo;ll return to for years to come.
              </p>

              <Field
                label={isWedding ? "Whose wedding?" : "What are you celebrating?"}
                hint={isWedding ? undefined : "This is what people will see when they're invited."}
              >
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setStepError(null);
                  }}
                  placeholder={isWedding ? "The Miller's Wedding" : "Mom's 60th Birthday"}
                  className="account-input"
                />
              </Field>

              {organizationId && !isCouple && (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-amber-tint/40 border border-amber/40 text-amber-dark px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-amber-tint transition-colors"
                >
                  Add from database
                </button>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Recipient first name">
                  <input type="text" value={recipientFirstName} onChange={(e) => { setRecipientFirstName(e.target.value); setStepError(null); }}
                    placeholder="Margaret" className="account-input" />
                </Field>
                <Field label="Recipient last name">
                  <input type="text" value={recipientLastName} onChange={(e) => setRecipientLastName(e.target.value)}
                    placeholder="Smith" className="account-input" />
                </Field>
              </div>

              {!isWedding && (
                <div>
                  <Label>Recipient gender</Label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { value: "female" as Gender, label: "Female" },
                      { value: "male" as Gender, label: "Male" },
                      { value: "couple" as Gender, label: "Couple" },
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
              )}

              {isCouple && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Recipient 2 first name">
                    <input type="text" value={recipient2FirstName} onChange={(e) => { setRecipient2FirstName(e.target.value); setStepError(null); }}
                      placeholder="Robert" className="account-input" />
                  </Field>
                  <Field label="Recipient 2 last name">
                    <input type="text" value={recipient2LastName} onChange={(e) => setRecipient2LastName(e.target.value)}
                      placeholder="Smith" className="account-input" />
                  </Field>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Occasion & date ────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
                {isWedding ? "Wedding Day" : "What’s the occasion?"}
              </h1>
              {!isWedding && (
                <p className="text-[15px] text-ink-mid leading-[1.6]">
                  Pick the occasion and the day they&rsquo;ll open everything.
                </p>
              )}

              {!isWedding && (
                <div>
                  <Label>Occasion &mdash; select one</Label>
                  <div className="flex flex-wrap gap-2">
                    {OCCASIONS.map((o) => (
                      <button key={o.value} type="button" onClick={() => { setOccasionType(o.value); setStepError(null); }}
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
              )}

              {occasionType && (
                <div>
                  <Label>{isWedding ? "Wedding Date" : "Reveal date"}</Label>
                  <input
                    type="date"
                    value={revealDate}
                    onChange={(e) => { handleRevealDate(e.target.value); setStepError(null); }}
                    min={minDateIso}
                    max={maxDateIso}
                    className="account-input max-w-[220px]"
                  />
                  {dateAlert && (
                    <div className="mt-2 rounded-lg bg-amber-tint border border-amber/30 px-3 py-2">
                      <p className="text-xs text-navy font-semibold">
                        {occasionType === "WEDDING"
                          ? "Wedding Capsules reveal within 600 days."
                          : "Gift Capsules must open within 60 days."}
                      </p>
                      <p className="text-xs text-ink-mid mt-0.5">
                        {occasionType === "WEDDING"
                          ? "Most couples set this to their first anniversary."
                          : "Please check back closer to the reveal date."}
                      </p>
                    </div>
                  )}
                  <p className="mt-2 text-xs italic text-ink-light">
                    {occasionType === "WEDDING"
                      ? revealDate
                        ? `Capsule will send on ${formatIsoLong(addOneYearIsoUtc(revealDate))} (1 year from the wedding date).`
                        : "Capsule will send 1 year from the wedding date."
                      : "They’ll open everything at once on this day."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Delivery time ──────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
                When should we deliver?
              </h1>
              <p className="text-[15px] text-ink-mid leading-[1.6]">
                Choose the time {recipientFirstName.trim() || "they"} receives the capsule.
              </p>

              <div>
                <Label>Delivery time</Label>
                <div className="flex flex-wrap gap-2">
                  {availablePresets.map((t) => (
                    <button key={t.value} type="button" onClick={() => { setDeliveryTime(t.value); setCustomTime(false); setStepError(null); }}
                      className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                        deliveryTime === t.value && !customTime ? pillActive : pillInactive
                      }`}>
                      {t.label}
                    </button>
                  ))}
                  <button type="button" onClick={() => { setCustomTime(true); setDeliveryTime(""); setStepError(null); }}
                    className={`rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                      customTime ? pillActive : pillInactive
                    }`}>
                    Custom
                  </button>
                </div>
                {availablePresets.length < TIME_PRESETS.length && (
                  <p className="mt-2 text-[12px] text-ink-mid">
                    {availablePresets.length === 0
                      ? "Today's slots have all passed — pick Custom for a later time, or change the date."
                      : "Earlier slots have passed for today — pick a later one or use Custom."}
                  </p>
                )}
                {customTime && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-[11px] font-bold tracking-[0.06em] uppercase text-ink-mid whitespace-nowrap">Reveal time:</span>
                    <input
                      type="time"
                      value={deliveryTime ?? ""}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      min={customMinTime}
                      className="account-input w-auto max-w-[140px]"
                    />
                  </div>
                )}
              </div>

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
            </div>
          )}

          {/* ── Step 4: Recipient email(s) ──────────────── */}
          {step === 4 && (
            <div className="space-y-5">
              <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
                Where should we send it?
              </h1>
              <p className="text-[15px] text-ink-mid leading-[1.6]">
                On the reveal date, we&rsquo;ll email{" "}
                {isCouple
                  ? "both recipients"
                  : recipientFirstName.trim() || "the recipient"}{" "}
                a link to open the capsule. We&rsquo;ll only use this on the reveal
                date. Nothing is sent now.
              </p>

              <Field
                label={
                  isCouple
                    ? `${recipientFirstName.trim() || "First recipient"}'s email`
                    : "Recipient email"
                }
              >
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={recipientEmail}
                  onChange={(e) => {
                    setRecipientEmail(e.target.value);
                    setStepError(null);
                  }}
                  placeholder="them@example.com"
                  className="account-input"
                />
              </Field>

              {isCouple ? (
                <Field
                  label={`${recipient2FirstName.trim() || "Second recipient"}'s email`}
                >
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={recipient2Email}
                    onChange={(e) => {
                      setRecipient2Email(e.target.value);
                      setStepError(null);
                    }}
                    placeholder="them@example.com"
                    className="account-input"
                  />
                </Field>
              ) : null}
            </div>
          )}

          {/* ── Step 5: Review & create ────────────────── */}
          {step === 5 && (
            <div className="space-y-5">
              <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
                Review your capsule
              </h1>
              <p className="text-[15px] text-ink-mid leading-[1.6]">
                Make sure everything looks right before we create it.
              </p>

              <div className="rounded-2xl border border-amber/20 bg-white px-5 py-5 space-y-3">
                {!isWedding && (
                  <ReviewRow label="Tone" value={TONE_LABELS[tone ?? "CELEBRATION"]} />
                )}
                <ReviewRow label="Title" value={title} />
                <ReviewRow label="For" value={recipientName} />
                <ReviewRow
                  label={isCouple ? "Recipient emails" : "Recipient email"}
                  value={
                    isCouple
                      ? [recipientEmail.trim(), recipient2Email.trim()]
                          .filter(Boolean)
                          .join(", ") || "—"
                      : recipientEmail.trim() || "—"
                  }
                />
                {!isWedding && (
                  <ReviewRow label="Occasion" value={OCCASIONS.find((o) => o.value === occasionType)?.label ?? "Other"} />
                )}
                <ReviewRow
                  label={isWedding ? "Wedding date" : "Reveal date"}
                  value={revealDate ? formatIsoLong(revealDate) : "—"}
                />
                {isWedding && (
                  <ReviewRow
                    label="Capsule sends on"
                    value={revealDate ? formatIsoLong(addOneYearIsoUtc(revealDate)) : "—"}
                  />
                )}
                <ReviewRow
                  label="Delivery time"
                  value={deliveryTime ? formatTime12h(deliveryTime) : "—"}
                />
                <ReviewRow label="Timezone" value={COMMON_TIMEZONES.find((tz) => tz.value === timezone)?.label ?? timezone} />
              </div>

              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            </div>
          )}

          {/* ── Navigation ─────────────────────────────── */}
          {stepError && (
            <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5" role="alert">
              <p className="text-xs font-semibold text-red-700">{stepError}</p>
            </div>
          )}

          <div className="mt-8 flex items-center gap-3">
            <button type="button" onClick={goBack}
              disabled={step === 0}
              className={`flex-1 py-3 rounded-lg text-[14px] font-semibold border transition-colors ${
                step === 0
                  ? "border-navy/10 text-ink-light/40 cursor-not-allowed"
                  : "border-navy/15 text-navy bg-white hover:border-navy/30"
              }`}>
              Back
            </button>

            {step < TOTAL_STEPS - 1 ? (
              <button type="button" onClick={goNext}
                disabled={!stepComplete}
                className={`flex-1 py-3 rounded-lg text-[14px] font-semibold border transition-colors ${
                  stepComplete
                    ? "border-amber/40 text-amber bg-amber/10 hover:bg-amber/20"
                    : "border-navy/10 text-ink-light/40 bg-white cursor-not-allowed"
                }`}>
                Next
              </button>
            ) : (
              <button type="button" onClick={() => submit()} disabled={saving}
                className={`flex-1 py-3 rounded-lg text-[14px] font-bold transition-colors ${
                  saving
                    ? "bg-green-800 text-white"
                    : "bg-green-700 text-white hover:bg-green-800"
                }`}>
                {saving ? "Creating\u2026" : "Create"}
              </button>
            )}
          </div>

          <p className="mt-2 text-center text-xs italic text-ink-light">
            {step < TOTAL_STEPS - 1
              ? STEP_BLURBS[step]
              : "No payment yet. Payment takes place prior to final recipient information entered or contributors invited."}
          </p>
        </div>
      </section>

      {pickerOpen && organizationId && (
        <EmployeePickerModal
          orgId={organizationId}
          mode="single"
          onClose={() => setPickerOpen(false)}
          onConfirm={applyPickedEmployee}
        />
      )}
    </main>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-navy/[0.04] last:border-b-0">
      <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-ink-light shrink-0">{label}</span>
      <span className="text-sm font-semibold text-navy text-right">{value}</span>
    </div>
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
