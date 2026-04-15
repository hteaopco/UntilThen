"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { RevealDatePicker } from "@/components/ui/RevealDatePicker";
import { LogoSvg } from "@/components/ui/LogoSvg";
import {
  CAPSULE_MAX_HORIZON_DAYS,
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

type Step = 1 | 2;

export function CapsuleCreationFlow() {
  const router = useRouter();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const [capsuleId, setCapsuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Step 1 fields. Recipient contact (email / phone) is now
  // collected at the activation paywall — the creation form
  // stays minimal so the organiser can see the draft state
  // quickly and start writing their own message.
  const [title, setTitle] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [occasionType, setOccasionType] = useState<OccasionType>("BIRTHDAY");
  const [revealDate, setRevealDate] = useState("");
  const [showExpiredNotice, setShowExpiredNotice] = useState(false);

  // Step 2 fields
  const [invitees, setInvitees] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [contributorDeadline, setContributorDeadline] = useState("");

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
          // Recipient contact is captured at activation.
          occasionType,
          revealDate,
          requiresApproval: false, // collected in step 2
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't save the capsule.");
      }
      const data = (await res.json()) as { id: string };
      setCapsuleId(data.id);
      try {
        window.localStorage.setItem(DRAFT_TITLE_KEY, title.trim());
        window.localStorage.removeItem(PENDING_STEP1_KEY);
      } catch {
        /* ignore */
      }
      setStep(2);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function addInvitee(e: FormEvent) {
    e.preventDefault();
    const email = draftEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    if (invitees.some((i) => i.email === email)) {
      setError("Already added.");
      return;
    }
    setInvitees((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        name: draftName.trim(),
        email,
      },
    ]);
    setDraftName("");
    setDraftEmail("");
    setError(null);
  }

  function removeInvitee(id: string) {
    setInvitees((prev) => prev.filter((i) => i.id !== id));
  }

  async function saveAndOpenDashboard(e: FormEvent) {
    e.preventDefault();
    if (!capsuleId) return;
    setError(null);
    setSaving(true);
    try {
      // Persist step 2 settings (approval toggle + deadline) on
      // the capsule record. Then save any contributors the
      // organiser entered — they'll land as STAGED because the
      // capsule is still DRAFT. Activation is now triggered from
      // the capsule dashboard, not here.
      const res = await fetch(`/api/capsules/${capsuleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requiresApproval,
          contributorDeadline: contributorDeadline || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't save your changes.");
      }
      if (invitees.length > 0) {
        const inv = await fetch(`/api/capsules/${capsuleId}/invites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invites: invitees.map((i) => ({ name: i.name, email: i.email })),
          }),
        });
        if (!inv.ok) {
          const data = (await inv.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? "Couldn't save contributors.");
        }
      }
      try {
        window.localStorage.removeItem(DRAFT_TITLE_KEY);
      } catch {
        /* ignore */
      }
      router.push(`/capsules/${capsuleId}`);
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

        {showExpiredNotice && step === 1 && (
          <div className="mb-6 rounded-xl border border-amber/30 bg-amber-tint/60 px-4 py-3 text-sm text-navy">
            <p className="font-semibold">Your last draft expired.</p>
            <p className="mt-0.5 text-ink-mid">
              Drafts are cleared after seven days. We pre-filled the title
              so you can start again.
            </p>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={submitStep1} className="space-y-5">
            <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
              Create a Memory Capsule
            </h1>
            <p className="text-[15px] text-ink-mid leading-[1.6]">
              A one-time keepsake full of messages from the people who
              love them.
            </p>

            <Field label="Who is this for?" hint="Shown to contributors when they're invited.">
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
                Capsules reveal within {CAPSULE_MAX_HORIZON_DAYS} days.
                For longer timeframes, write into a child Vault.
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
        )}

        {step === 2 && (
          <form onSubmit={saveAndOpenDashboard} className="space-y-6">
            <div>
              <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
                Invite contributors
              </h1>
              <p className="mt-1 text-[15px] text-ink-mid leading-[1.6]">
                Add the people you want to hear from for{" "}
                <span className="font-semibold text-navy">{title}</span>.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[140px]">
                  <Label>Name (optional)</Label>
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="Sarah"
                    className="account-input"
                  />
                </div>
                <div className="flex-[2] min-w-[200px]">
                  <Label>Email</Label>
                  <input
                    type="email"
                    value={draftEmail}
                    onChange={(e) => setDraftEmail(e.target.value)}
                    placeholder="sarah@email.com"
                    className="account-input"
                  />
                </div>
                <button
                  type="button"
                  onClick={addInvitee}
                  disabled={!draftEmail.trim()}
                  className="shrink-0 inline-flex items-center gap-1.5 bg-navy text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-navy/90 transition-colors disabled:opacity-50 min-h-[48px]"
                >
                  + Add
                </button>
              </div>

              {invitees.length > 0 && (
                <ul className="space-y-2">
                  {invitees.map((i) => (
                    <li
                      key={i.id}
                      className="flex items-center gap-3 rounded-xl border border-navy/[0.08] bg-white px-4 py-2.5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-navy truncate">
                          {i.name || i.email}
                        </div>
                        {i.name && (
                          <div className="text-xs text-ink-light truncate">
                            {i.email}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeInvitee(i.id)}
                        aria-label={`Remove ${i.email}`}
                        className="text-ink-light hover:text-red-600"
                      >
                        <X size={16} strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="mt-1 accent-amber"
              />
              <span className="text-sm text-navy leading-[1.5]">
                <span className="font-semibold">
                  Approve contributions before reveal
                </span>
                <span className="block text-ink-mid italic text-xs mt-0.5">
                  (You&rsquo;ll review each one before {recipientName} sees it.)
                </span>
              </span>
            </label>

            <Field label="Contributor deadline (optional)">
              <input
                type="date"
                value={contributorDeadline}
                onChange={(e) => setContributorDeadline(e.target.value)}
                min={new Date(Date.now() + 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0]}
                max={revealDate || undefined}
                className="account-input"
              />
            </Field>

            {/* Activation moved to the capsule dashboard. This
                step just stages everything as a draft so the
                organiser can write their own contribution and
                preview before paying. */}
            <div className="rounded-2xl border border-amber/25 bg-amber-tint/40 px-5 py-5 space-y-3">
              <h2 className="text-lg font-bold text-navy">
                Almost there.
              </h2>
              <p className="text-sm text-ink-mid leading-[1.6]">
                We&rsquo;ll save your capsule as a draft. You can write your
                own message, preview, and add more contributors before you
                activate.
              </p>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-amber text-white py-3.5 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
              >
                {saving ? "Saving…" : "Open my capsule →"}
              </button>
              <p className="text-center text-xs italic text-ink-light">
                No payment yet. Activate from the capsule page when
                you&rsquo;re ready.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm font-medium text-ink-mid hover:text-navy underline underline-offset-4"
            >
              ← Edit capsule details
            </button>
          </form>
        )}
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

