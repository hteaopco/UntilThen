"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Home, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";
import { CAPSULE_MAX_HORIZON_MS } from "@/lib/capsules";

const DRAFT_TITLE_KEY = "untilthen:capsule-draft-title";
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

function yyyymmdd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CapsuleCreationFlow() {
  const router = useRouter();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [recipientFirstName, setRecipientFirstName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [recipientGender, setRecipientGender] = useState<"male" | "female">("female");
  const [occasionType, setOccasionType] = useState<OccasionType>("BIRTHDAY");
  const [otherOccasion, setOtherOccasion] = useState("");
  const [revealDate, setRevealDate] = useState("");
  const [showExpiredNotice, setShowExpiredNotice] = useState(false);
  const [dateAlert, setDateAlert] = useState(false);

  const maxDateIso = yyyymmdd(new Date(Date.now() + CAPSULE_MAX_HORIZON_MS));
  const minDateIso = yyyymmdd(new Date(Date.now() + 86400000));

  // Map gender to pronoun for the API
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
        return;
      }
    } catch { /* ignore */ }
    try {
      const remembered = window.localStorage.getItem(DRAFT_TITLE_KEY);
      if (remembered && !title) {
        setTitle(remembered);
        setShowExpiredNotice(true);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function submitStep1(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);

    if (authLoaded && !isSignedIn) {
      const snapshot: PendingStep1 = {
        title: title.trim(),
        recipientFirstName: recipientFirstName.trim(),
        recipientLastName: recipientLastName.trim(),
        occasionType,
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
          occasionType,
          revealDate,
          requiresApproval: false,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't save the capsule.");
      }
      const data = (await res.json()) as { id: string };
      try {
        window.localStorage.setItem(DRAFT_TITLE_KEY, title.trim());
        window.localStorage.removeItem(PENDING_STEP1_KEY);
      } catch { /* */ }
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

      <section className="mx-auto max-w-[560px] px-6 lg:px-10 pt-10 pb-24">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] uppercase text-amber mb-4">
          <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
          Gift Capsule
        </div>

        {showExpiredNotice && (
          <div className="mb-6 rounded-xl border border-amber/30 bg-amber-tint/60 px-4 py-3 text-sm text-navy">
            <p className="font-semibold">Your last draft expired.</p>
            <p className="mt-0.5 text-ink-mid">
              Drafts are cleared after seven days. We pre-filled the title so you can start again.
            </p>
          </div>
        )}

        <form onSubmit={submitStep1} className="space-y-5">
          <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
            Create a Gift Capsule
          </h1>
          <p className="text-[15px] text-ink-mid leading-[1.6]">
            A one-time gift they&rsquo;ll open on a day that matters. Filled with messages from the people who love them.
          </p>

          <Field label="What are you celebrating?" hint="This is what people will see when they&rsquo;re invited.">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Mom's 60th Birthday" className="account-input" required />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Recipient first name">
              <input type="text" value={recipientFirstName} onChange={(e) => setRecipientFirstName(e.target.value)}
                placeholder="Margaret" className="account-input" required />
            </Field>
            <Field label="Recipient last name">
              <input type="text" value={recipientLastName} onChange={(e) => setRecipientLastName(e.target.value)}
                placeholder="Smith" className="account-input" />
            </Field>
          </div>

          <div>
            <Label>Gender</Label>
            <div className="flex flex-wrap gap-2">
              {([
                { value: "female" as const, label: "Female" },
                { value: "male" as const, label: "Male" },
              ]).map((g) => (
                <button key={g.value} type="button" onClick={() => setRecipientGender(g.value)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                    recipientGender === g.value
                      ? "bg-amber text-white border-amber"
                      : "bg-white border-navy/15 text-ink-mid hover:border-navy hover:text-navy"
                  }`}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Occasion</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {OCCASIONS.map((o) => (
                <button key={o.value} type="button" onClick={() => setOccasionType(o.value)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                    occasionType === o.value
                      ? "bg-amber text-white border-amber"
                      : "bg-white border-navy/15 text-ink-mid hover:border-navy hover:text-navy"
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

          <div>
            <Label>Reveal date</Label>
            <input type="date" value={revealDate} onChange={(e) => handleRevealDate(e.target.value)}
              min={minDateIso} max={maxDateIso} className="account-input" required />
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

          {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

          <button type="submit"
            disabled={saving || !title.trim() || !recipientFirstName.trim() || !revealDate}
            className="w-full bg-amber text-white py-3.5 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60">
            {saving ? "Saving\u2026" : "Continue \u2192"}
          </button>
          <p className="text-center text-xs italic text-ink-light">
            {authLoaded && !isSignedIn
              ? "No payment yet. We\u2019ll ask you to create a free account to save your capsule."
              : "No payment yet. We save your capsule as a draft."}
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
