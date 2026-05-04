"use client";

import { useAuth } from "@clerk/nextjs";
import {
  Cake,
  Check,
  Feather,
  Flame,
  Gift,
  GraduationCap,
  HandHeart,
  Heart,
  HeartHandshake,
  Palmtree,
  PartyPopper,
  PlusCircle,
  Sparkles,
  Trash2,
  User as UserIcon,
} from "lucide-react";
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
  | "JUST_BECAUSE"
  | "OTHER";


const TONE_ICONS: Record<CapsuleTone, React.ReactNode> = {
  CELEBRATION: <PartyPopper size={20} strokeWidth={1.5} />,
  GRATITUDE: <HandHeart size={20} strokeWidth={1.5} />,
  THINKING_OF_YOU: <Feather size={20} strokeWidth={1.5} />,
  ENCOURAGEMENT: <Flame size={20} strokeWidth={1.5} />,
  LOVE: <Heart size={20} strokeWidth={1.5} />,
  OTHER: <Sparkles size={20} strokeWidth={1.5} />,
};

const OCCASIONS: {
  value: OccasionType;
  label: string;
  icon: React.ReactNode;
}[] = [
  // Order matters — the screenshot shows Birthday + Anniversary
  // first as the most-common picks, then Graduation + Retirement
  // (life-stage milestones), then Wedding + Just Because. OTHER
  // is intentionally absent from the picker; capsules without an
  // occasion fall back to JUST_BECAUSE.
  { value: "BIRTHDAY", label: "Birthday", icon: <Cake size={20} strokeWidth={1.6} /> },
  { value: "ANNIVERSARY", label: "Anniversary", icon: <Heart size={20} strokeWidth={1.6} /> },
  { value: "GRADUATION", label: "Graduation", icon: <GraduationCap size={20} strokeWidth={1.6} /> },
  { value: "RETIREMENT", label: "Retirement", icon: <Palmtree size={20} strokeWidth={1.6} /> },
  { value: "WEDDING", label: "Wedding", icon: <HeartHandshake size={20} strokeWidth={1.6} /> },
  { value: "JUST_BECAUSE", label: "Just because", icon: <Gift size={20} strokeWidth={1.6} /> },
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

// Step layout (consolidated):
//   0 — date + tone + occasion (single screen, dividers between)
//   1 — title + recipients
//   2 — delivery time
//   3 — recipient emails
//   4 — review
const TOTAL_STEPS = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Visible tone picker — the four common ones the screenshot
// shows. Order chosen so the row wraps cleanly: a long word
// ("Encouraging") at the very end, with a shorter "Loving"
// pill ahead of it so row 2 starts with the shorter label.
// THINKING_OF_YOU + OTHER stay valid CapsuleTone values for
// legacy capsules created before this picker shrank, but new
// capsules pick from this short list.
const TONE_OPTIONS: CapsuleTone[] = [
  "CELEBRATION",
  "GRATITUDE",
  "LOVE",
  "ENCOURAGEMENT",
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
  // Wedding flow auto-locks tone (LOVE) + occasion (WEDDING),
  // so step 0's only purpose for non-wedding capsules — picking
  // those two — is empty for weddings. Skip it: weddings start
  // at step 1 (title + recipients + date), and the progress
  // bar shrinks accordingly via visibleStepCount.
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
  // Multi-recipient flow. Each row is a single person; the capsule
  // primary is recipients[0] and everyone past that lands in
  // additionalRecipients on the API. Wedding flow seeds two rows
  // (bride + groom); every other flow starts with one row and the
  // organiser taps "Add another person" to grow the list.
  type RecipientDraft = {
    key: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  const newRecipientKey = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [recipients, setRecipients] = useState<RecipientDraft[]>(() =>
    isWedding
      ? [
          { key: newRecipientKey(), firstName: "", lastName: "", email: "" },
          { key: newRecipientKey(), firstName: "", lastName: "", email: "" },
        ]
      : [{ key: newRecipientKey(), firstName: "", lastName: "", email: "" }],
  );
  function updateRecipient(key: string, patch: Partial<RecipientDraft>) {
    setRecipients((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeRecipient(key: string) {
    setRecipients((rs) => (rs.length <= 1 ? rs : rs.filter((r) => r.key !== key)));
  }
  function addRecipient() {
    setRecipients((rs) => [
      ...rs,
      { key: newRecipientKey(), firstName: "", lastName: "", email: "" },
    ]);
  }
  // Derived flag for downstream copy that already has a "couple"
  // shape (wedding hint text, contributor copy, etc.). Two rows =
  // couple-style display ("Margaret & Robert"); 3+ rows = list-
  // style display ("Margaret, Robert & Sarah").
  const isCouple = recipients.length === 2;
  const [occasionType, setOccasionType] = useState<OccasionType | null>(
    initialOccasion ?? null,
  );
  const [otherOccasion, setOtherOccasion] = useState("");
  const [revealDate, setRevealDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState(false);
  const [timezone, setTimezone] = useState(detectTimezone);
  const [dateAlert, setDateAlert] = useState(false);
  // Recipient emails now live on each `recipients[]` row, but
  // we keep two thin aliases so the rest of the flow (validate
  // step, submit body) reads the primary + secondary the way it
  // used to. recipient2Email is null for 0/1/3+ recipient
  // capsules; legacy couple consumers (cron + enterprise filter)
  // also fall through to additionalRecipients.
  const recipientEmail = recipients[0]?.email ?? "";
  const recipient2Email = recipients.length === 2 ? (recipients[1]?.email ?? "") : "";
  const [pickerOpen, setPickerOpen] = useState(false);

  function applyPickedEmployee(picks: PickedEmployee[]) {
    const p = picks[0];
    if (!p) return;
    // Replaces the first row with the picked employee. Multi-
    // recipient picking is left for a future iteration; for now
    // the database picker stays single-select and just seeds the
    // primary recipient so the rest of the flow can carry on.
    setRecipients((rs) => {
      const head = rs[0];
      const rest = rs.slice(1);
      return [
        {
          key: head?.key ?? newRecipientKey(),
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
        },
        ...rest,
      ];
    });
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

  // Gender removed — every capsule sends the gender-neutral
  // "them" so the API stamps a consistent value for back-compat
  // readers (lib/capsules.ts now hard-codes the same default
  // when reading old rows).
  const recipientPronoun = "them";

  // Display label derived from every recipient row. One person
  // reads as "Margaret Smith"; two read as "Margaret & Robert"
  // (couple shape preserved for back-compat); three+ read as
  // "Margaret, Robert & Sarah". Handles missing names gracefully
  // so the wizard preview stays readable mid-typing.
  const recipientName = (() => {
    const firsts = recipients
      .map((r) => r.firstName.trim())
      .filter((s) => s.length > 0);
    if (firsts.length === 0) return "";
    if (firsts.length === 1) {
      const last = recipients[0]?.lastName.trim() ?? "";
      return `${firsts[0]}${last ? ` ${last}` : ""}`;
    }
    if (firsts.length === 2) return `${firsts[0]} & ${firsts[1]}`;
    return `${firsts.slice(0, -1).join(", ")} & ${firsts[firsts.length - 1]}`;
  })();
  // Convenience accessors used by the rest of the flow's copy
  // (delivery-time hint, email step labels, review screen). The
  // primary recipient drives most of the per-name copy because
  // the form was originally single-recipient.
  const recipientFirstName = recipients[0]?.firstName ?? "";
  const recipient2FirstName = recipients[1]?.firstName ?? "";

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
      if (p.recipientFirstName || p.recipientLastName) {
        // Pre-fill the primary recipient's name fields from the
        // stash. Email is captured later in the flow, so we keep
        // it empty here.
        setRecipients((rs) => {
          const head = rs[0];
          return [
            {
              key: head?.key ?? newRecipientKey(),
              firstName: p.recipientFirstName ?? "",
              lastName: p.recipientLastName ?? "",
              email: "",
            },
            ...rs.slice(1),
          ];
        });
      }
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
      // Step 1 ("What's this for?") only requires occasion for
      // non-wedding capsules. Tone is optional — the picker has
      // a "Recommended" badge but the flow can move forward
      // without one. Wedding flow has occasion auto-locked.
      if (!isWedding && !occasionType) return "Please select an occasion";
      return null;
    }
    if (step === 1) {
      if (!title.trim()) return "Please add a title";
      // Every row needs at least a first name. Last name is
      // optional so a "Marketing Team" / "Mom & Dad" capsule
      // doesn't force surnames the organiser may not even know.
      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        if (!r) continue;
        if (!r.firstName.trim()) {
          return i === 0
            ? "Recipient first name is required"
            : `Recipient ${i + 1} first name is required`;
        }
      }
      return null;
    }
    if (step === 2) {
      // Date moved here from the recipients step so the
      // "When should we deliver?" screen owns both the date
      // and the time-of-day choice in one place.
      if (!revealDate) return "Please select a reveal date";
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
    if (step === 3) {
      // Every recipient row needs a valid email. Mirrors the API's
      // EMAIL_RE check so the wizard catches bad input before the
      // round-trip.
      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        if (!r) continue;
        const trimmed = r.email.trim();
        const label = r.firstName.trim() || `recipient ${i + 1}`;
        if (!trimmed) return `Email is required for ${label}`;
        if (!EMAIL_RE.test(trimmed))
          return `Please enter a valid email for ${label}`;
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
          recipientFirstName: recipients[0]?.firstName.trim() ?? "",
          recipientLastName: recipients[0]?.lastName.trim() ?? "",
          occasionType: occasionType ?? "OTHER",
          revealDate,
        }));
      } catch { /* */ }
      router.push(`/sign-up?redirect_url=${encodeURIComponent("/capsules/new")}`);
      return;
    }

    setSaving(true);
    try {
      // Build the human-readable display label from every row.
      // 1 person → "Margaret Smith", 2 → "Margaret & Robert",
      // 3+ → "Margaret, Robert & Sarah". Strips empty rows (the
      // validator enforces firstName above, but lastName may be
      // missing).
      const namedRecipients = recipients
        .map((r) => ({
          firstName: r.firstName.trim(),
          lastName: r.lastName.trim(),
          email: r.email.trim().toLowerCase(),
        }))
        .filter((r) => r.firstName.length > 0);
      const firstNames = namedRecipients.map((r) => r.firstName);
      const fullName =
        namedRecipients.length === 1
          ? `${namedRecipients[0]!.firstName}${namedRecipients[0]!.lastName ? ` ${namedRecipients[0]!.lastName}` : ""}`
          : namedRecipients.length === 2
            ? `${firstNames[0]} & ${firstNames[1]}`
            : `${firstNames.slice(0, -1).join(", ")} & ${firstNames[firstNames.length - 1]}`;
      // Primary recipient stays in recipientName + recipientEmail;
      // everyone past that goes into additionalRecipients. We also
      // populate recipient2Email when there are exactly two rows so
      // legacy back-compat readers (older code paths that still
      // peek at it) keep working.
      const primary = namedRecipients[0];
      const extras = namedRecipients.slice(1);

      const res = await fetch("/api/capsules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          recipientName: fullName,
          recipientPronoun,
          recipientEmail: primary?.email || null,
          recipient2Email: extras.length === 1 ? extras[0]!.email : null,
          additionalRecipients: extras,
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
          {/* ── Step 0 (visible 1): What's this for? ───── */}
          {step === 0 && (
            <div className="space-y-7">
              <div>
                <h1 className="text-[24px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
                  {isWedding ? "Wedding capsule" : "What’s this for?"}
                </h1>
                <p className="mt-2 text-[15px] text-ink-mid leading-[1.6]">
                  {isWedding
                    ? "Tone is auto-set for weddings. Pick a delivery date in the next step."
                    : "Choose the moment you’re creating this for."}
                </p>
              </div>

              {!isWedding && (
                <>
                  {/* Occasion grid — 2x3 of icon + label cards
                      on every breakpoint. Selected card shows
                      an inline tick on the right; matches the
                      screenshot. */}
                  <div className="grid grid-cols-2 gap-3">
                    {OCCASIONS.map((o) => {
                      const active = occasionType === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => {
                            setOccasionType(o.value);
                            setStepError(null);
                          }}
                          className={`relative flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${
                            active
                              ? "border-amber bg-amber-tint/40 shadow-[0_2px_8px_rgba(196,122,58,0.10)]"
                              : "border-navy/10 bg-white hover:border-amber/40"
                          }`}
                        >
                          <span
                            className={`shrink-0 ${active ? "text-amber" : "text-navy"}`}
                            aria-hidden="true"
                          >
                            {o.icon}
                          </span>
                          <span
                            className={`text-[15px] font-bold ${active ? "text-navy" : "text-navy"}`}
                          >
                            {o.label}
                          </span>
                          {active && (
                            <span
                              aria-hidden="true"
                              className="absolute -top-3 -right-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber text-white shadow-[0_2px_6px_rgba(196,122,58,0.25)]"
                            >
                              <Check size={12} strokeWidth={2.5} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tone — optional, with a "Recommended" badge
                      and a horizontal pill row of the four common
                      tones. Tapping a pill toggles its selection;
                      tapping it again clears the choice. */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-bold tracking-[0.14em] uppercase text-ink-mid">
                        Tone (optional)
                      </span>
                      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-[0.1em] text-amber-dark bg-amber-tint px-2 py-0.5 rounded-full">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[14px] text-ink-mid leading-[1.5] mb-3">
                      Choose how you want this to feel when they open it.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {TONE_OPTIONS.map((t) => {
                        const active = tone === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setTone(active ? null : t);
                              setStepError(null);
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                              active
                                ? "border-amber bg-amber-tint text-amber-dark"
                                : "border-navy/10 bg-white text-navy hover:border-amber/40"
                            }`}
                          >
                            <span
                              className={`shrink-0 ${active ? "text-amber" : "text-ink-light"}`}
                              aria-hidden="true"
                            >
                              {TONE_ICONS[t]}
                            </span>
                            {TONE_LABELS[t]}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-ink-mid">
                      <Sparkles
                        size={12}
                        strokeWidth={1.75}
                        className="text-amber"
                        aria-hidden="true"
                      />
                      We&rsquo;ll tailor prompts and emails to match.
                    </p>
                  </div>
                </>
              )}
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

              {organizationId && recipients.length === 1 && (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-amber-tint/40 border border-amber/40 text-amber-dark px-4 py-2 rounded-lg text-[13px] font-semibold hover:bg-amber-tint transition-colors"
                >
                  Add from database
                </button>
              )}

              {/* Recipients section — N (firstName, lastName) rows
                  with a trash control on every row past the first
                  and an "Add another person" pill at the bottom.
                  The wedding flow seeds two rows up front; every
                  other flow starts at one. */}
              <div>
                <Label>
                  <span className="inline-flex items-center gap-1.5">
                    <UserIcon size={12} strokeWidth={2.25} aria-hidden="true" />
                    Recipients
                  </span>
                </Label>
                <p className="-mt-1 mb-3 text-[13px] text-ink-mid leading-[1.5]">
                  Add one or more people who will receive this gift capsule.
                </p>
                <div className="space-y-3">
                  {recipients.map((r, i) => (
                    <div
                      key={r.key}
                      className="rounded-2xl bg-amber-tint/40 border border-amber/15 px-3 py-3 flex items-end gap-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-w-0">
                        <Field label="First name">
                          <input
                            type="text"
                            value={r.firstName}
                            onChange={(e) => {
                              updateRecipient(r.key, { firstName: e.target.value });
                              setStepError(null);
                            }}
                            placeholder={i === 0 ? "Margaret" : "Robert"}
                            className="account-input"
                          />
                        </Field>
                        <Field label="Last name">
                          <input
                            type="text"
                            value={r.lastName}
                            onChange={(e) =>
                              updateRecipient(r.key, { lastName: e.target.value })
                            }
                            placeholder="Smith"
                            className="account-input"
                          />
                        </Field>
                      </div>
                      {/* Wedding flow is fixed at two recipients
                          (the couple) so the trash + "Add another
                          person" controls are hidden there. */}
                      {!isWedding && recipients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRecipient(r.key)}
                          aria-label={`Remove recipient ${i + 1}`}
                          className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white border border-amber/25 text-amber hover:bg-amber/10 transition-colors"
                        >
                          <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {/* Wedding capsules are always exactly the couple
                    -- bride + groom seeded as the two starting
                    rows -- so the "Add another person" affordance
                    only shows on non-wedding flows. */}
                {!isWedding && (
                  <button
                    type="button"
                    onClick={addRecipient}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-dashed border-amber/40 bg-amber-tint/30 px-4 py-3 text-[13px] font-semibold text-amber-dark hover:bg-amber-tint/50 transition-colors"
                  >
                    <PlusCircle size={16} strokeWidth={1.75} aria-hidden="true" />
                    Add another person
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Date + delivery time ───────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
                When should we deliver?
              </h1>
              <p className="text-[15px] text-ink-mid leading-[1.6]">
                Choose the date and time {recipientFirstName.trim() || "they"} receives the capsule.
              </p>

              {/* Date picker — sits above the time presets so the
                  organiser picks the day first, then the slot.
                  Same wedding +1y copy + horizon validation that
                  was previously on the recipients step. */}
              <div>
                <Label>{isWedding ? "Wedding Date" : "Reveal date"}</Label>
                <input
                  type="date"
                  value={revealDate}
                  onChange={(e) => {
                    handleRevealDate(e.target.value);
                    setStepError(null);
                  }}
                  min={minDateIso}
                  max={maxDateIso}
                  className="account-input max-w-[220px]"
                />
                {dateAlert && (
                  <div className="mt-2 rounded-lg bg-amber-tint border border-amber/30 px-3 py-2">
                    <p className="text-xs text-navy font-semibold">
                      {isWedding
                        ? "Wedding Capsules reveal within 600 days."
                        : "Gift Capsules must open within 60 days."}
                    </p>
                    <p className="text-xs text-ink-mid mt-0.5">
                      {isWedding
                        ? "Most couples set this to their first anniversary."
                        : "Please check back closer to the reveal date."}
                    </p>
                  </div>
                )}
                <p className="mt-2 text-xs italic text-ink-light">
                  {isWedding
                    ? revealDate
                      ? `Capsule will send on ${formatIsoLong(addOneYearIsoUtc(revealDate))} (1 year from the wedding date).`
                      : "Capsule will send 1 year from the wedding date."
                    : "They’ll open everything at once on this day."}
                </p>
              </div>

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

          {/* ── Step 3: Recipient email(s) ──────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
                Where should we send it?
              </h1>
              <p className="text-[15px] text-ink-mid leading-[1.6]">
                On the reveal date, we&rsquo;ll email{" "}
                {recipients.length > 1
                  ? "every recipient"
                  : recipientFirstName.trim() || "the recipient"}{" "}
                a link to open the capsule. We&rsquo;ll only use these on the
                reveal date. Nothing is sent now.
              </p>

              <div className="space-y-3">
                {recipients.map((r) => {
                  const label = r.firstName.trim() || "Recipient";
                  return (
                    <Field key={r.key} label={`${label}'s email`}>
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={r.email}
                        onChange={(e) => {
                          updateRecipient(r.key, { email: e.target.value });
                          setStepError(null);
                        }}
                        placeholder={`${(r.firstName.trim() || "them").toLowerCase()}@example.com`}
                        className="account-input"
                      />
                    </Field>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 4: Review & create ────────────────── */}
          {step === 4 && (
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
                  label={recipients.length > 1 ? "Recipient emails" : "Recipient email"}
                  value={
                    recipients
                      .map((r) => r.email.trim())
                      .filter(Boolean)
                      .join(", ") || "—"
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
