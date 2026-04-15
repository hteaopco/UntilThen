"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { RevealDatePicker } from "@/components/ui/RevealDatePicker";
import { LogoSvg } from "@/components/ui/LogoSvg";
import {
  CAPSULE_MAX_HORIZON_MS,
} from "@/lib/capsules";

// localStorage key for remembering the last draft title — if the
// user's draft is auto-deleted after 7 days, we pre-fill the
// title when they come back (per spec v1.1 clarification #3).
const DRAFT_TITLE_KEY = "untilthen:capsule-draft-title";

// A full step-1 snapshot is stashed here when an anonymous
// visitor clicks "Continue →" and we hand them off to sign-up.
// After they land back on /capsules/new signed-in, we rehydrate
// the form so they don't lose the emotional investment of
// filling it out (per the brief's "don't gate the flow early"
// principle).
const PENDING_STEP1_KEY = "untilthen:capsule-pending-step1";

type PendingStep1 = {
  title: string;
  recipientName: string;
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

export function CapsuleCreationFlow() {
  const router = useRouter();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Creation collects the capsule shell only. Recipient contact
  // is captured at the activation paywall; contributors are
  // invited from the capsule dashboard. Once saved we redirect
  // straight to /capsules/[id] — no wizard step 2.
  const [title, setTitle] = useState("");
  const [recipientName, setRecipientName] = useState("");
  // Object-form pronoun used in warm copy on the dashboard
  // ("Send this to everyone who loves her"). Defaults to "them"
  // — gender-neutral, always correct, and the organiser can
  // upgrade to "her" / "him" if they'd rather.
  const [recipientPronoun, setRecipientPronoun] = useState<
    "them" | "her" | "him"
  >("them");
  const [occasionType, setOccasionType] = useState<OccasionType>("BIRTHDAY");
  const [revealDate, setRevealDate] = useState("");
  const [showExpiredNotice, setShowExpiredNotice] = useState(false);

  // Rehydrate on mount:
  //   1. A pending step-1 snapshot (anonymous visitor bounced
  //      through sign-up) takes priority — those fields are the
  //      freshest user intent.
  //   2. Failing that, a remembered title from an auto-expired
  //      draft shows an "expired — start again" banner.
  useEffect(() => {
    try {
      const pendingRaw = window.localStorage.getItem(PENDING_STEP1_KEY);
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw) as Partial<PendingStep1>;
        if (pending.title) setTitle(pending.title);
        if (pending.recipientName) setRecipientName(pending.recipientName);
        if (pending.occasionType)
          setOccasionType(pending.occasionType as OccasionType);
        if (pending.revealDate) setRevealDate(pending.revealDate);
        return;
      }
    } catch {
      /* ignore */
    }
    try {
      const remembered = window.localStorage.getItem(DRAFT_TITLE_KEY);
      if (remembered && !title) {
        setTitle(remembered);
        setShowExpiredNotice(true);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitStep1(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);

    // Anonymous path: stash the full form snapshot and hand off
    // to Clerk sign-up. Once the new account lands back here
    // (Clerk's afterSignUpUrl), the rehydrate effect replays
    // step 1 into the fields and submitStep1 fires cleanly on
    // the next click.
    if (authLoaded && !isSignedIn) {
      const snapshot: PendingStep1 = {
        title: title.trim(),
        recipientName: recipientName.trim(),
        occasionType,
        revealDate,
      };
      try {
        window.localStorage.setItem(
          PENDING_STEP1_KEY,
          JSON.stringify(snapshot),
        );
      } catch {
        /* storage unavailable — sign-up still works, form just
           resets. */
      }
      const redirect = encodeURIComponent("/capsules/new");
      router.push(`/sign-up?redirect_url=${redirect}`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/capsules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          recipientName: recipientName.trim(),
          recipientPronoun,
          // Recipient contact is captured at activation.
          occasionType,
          revealDate,
          requiresApproval: false,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't save the capsule.");
      }
      const data = (await res.json()) as { id: string };
      try {
        window.localStorage.setItem(DRAFT_TITLE_KEY, title.trim());
        window.localStorage.removeItem(PENDING_STEP1_KEY);
      } catch {
        /* ignore */
      }
      // Creation now ends here: the organiser is handed straight
      // to the capsule dashboard where the "Your contribution"
      // editor and the contributor panel live. Contributors +
      // approval toggles are collected there, not in a wizard.
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
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-ink-mid hover:text-navy transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>Back to Dashboard</span>
          </Link>
          <LogoSvg variant="dark" width={110} height={22} />
        </div>
      </header>

      <section className="mx-auto max-w-[560px] px-6 lg:px-10 pt-10 pb-24">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] uppercase text-amber mb-4">
          <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
          Memory Capsule
        </div>

        {showExpiredNotice && (
          <div className="mb-6 rounded-xl border border-amber/30 bg-amber-tint/60 px-4 py-3 text-sm text-navy">
            <p className="font-semibold">Your last draft expired.</p>
            <p className="mt-0.5 text-ink-mid">
              Drafts are cleared after seven days. We pre-filled the title
              so you can start again.
            </p>
          </div>
        )}

        <form onSubmit={submitStep1} className="space-y-5">
            <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
              Create a Memory Capsule
            </h1>
            <p className="text-[15px] text-ink-mid leading-[1.6]">
              A one-time gift they&rsquo;ll open on a day that matters.
              Filled with messages from the people who love them.
            </p>

            <Field
              label="What are you celebrating?"
              hint="This is what people will see when they&rsquo;re invited."
            >
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Mum's 60th Birthday"
                className="account-input"
                required
              />
            </Field>

            <Field label="Recipient name">
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Margaret"
                className="account-input"
                required
              />
            </Field>

            {/* Object-form pronoun — drives the activation
                headline ("Send this to everyone who loves her").
                Defaults to "them"; organiser can switch. */}
            <div>
              <Label>Pronoun</Label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "them", label: "them" },
                    { value: "her", label: "her" },
                    { value: "him", label: "him" },
                  ] as const
                ).map((p) => {
                  const active = recipientPronoun === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setRecipientPronoun(p.value)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-amber text-white border-amber"
                          : "bg-white border-navy/15 text-ink-mid hover:border-navy hover:text-navy"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipient contact (email / phone) is captured at
                the activation paywall so the creation form stays
                minimal. */}

            <div>
              <Label>Occasion</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {OCCASIONS.map((o) => {
                  const active = occasionType === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setOccasionType(o.value)}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors ${
                        active
                          ? "bg-amber text-white border-amber"
                          : "bg-white border-navy/15 text-ink-mid hover:border-navy hover:text-navy"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Reveal date</Label>
              <RevealDatePicker
                value={revealDate}
                onChange={setRevealDate}
                childFirstName={recipientName || null}
                childDateOfBirth={null}
                maxDate={
                  new Date(Date.now() + CAPSULE_MAX_HORIZON_MS)
                    .toISOString()
                    .split("T")[0]
                }
              />
              <p className="mt-2 text-xs italic text-ink-light">
                They&rsquo;ll open everything at once on this day.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={
                saving ||
                !title.trim() ||
                !recipientName.trim() ||
                !revealDate
              }
              className="w-full bg-amber text-white py-3.5 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Continue →"}
            </button>
            <p className="text-center text-xs italic text-ink-light">
              {authLoaded && !isSignedIn
                ? "No payment yet. We'll ask you to create a free account to save your capsule."
                : "No payment yet. We save your capsule as a draft."}
            </p>
          </form>
      </section>
    </main>
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

