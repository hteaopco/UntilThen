"use client";

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

type Step = 1 | 2 | 3;

export function CapsuleCreationFlow() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [capsuleId, setCapsuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Step 1 fields
  const [title, setTitle] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
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

  // Rehydrate any previously-saved title so an expired draft
  // doesn't feel like starting from nothing.
  useEffect(() => {
    try {
      const remembered = window.localStorage.getItem(DRAFT_TITLE_KEY);
      if (remembered && !title) {
        setTitle(remembered);
        setShowExpiredNotice(true);
      }
    } catch {
      /* storage unavailable — skip */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitStep1(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/capsules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          recipientName: recipientName.trim(),
          recipientEmail: recipientEmail.trim(),
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

  async function goToPayment(e: FormEvent) {
    e.preventDefault();
    if (!capsuleId) return;
    setError(null);
    setSaving(true);
    try {
      // Persist step 2 settings (approval toggle + deadline) on
      // the capsule record before we take payment. Invitees are
      // sent as part of the activation call.
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
      setStep(3);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function confirmPayment() {
    if (!capsuleId) return;
    setSaving(true);
    setError(null);
    try {
      // TODO: Square payment — $9.99 one-time. For now the
      // activation endpoint trusts the client and flips the
      // capsule to ACTIVE + isPaid. Once Square is wired up,
      // this will POST a receipt id and the server will verify.
      const act = await fetch(`/api/capsules/${capsuleId}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: "placeholder-square-receipt" }),
      });
      if (!act.ok) {
        const data = (await act.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Payment couldn't be confirmed.");
      }
      const invites = await fetch(`/api/capsules/${capsuleId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invites: invitees.map((i) => ({ name: i.name, email: i.email })),
        }),
      });
      if (!invites.ok) {
        const data = (await invites.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't send invites.");
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

            <Field
              label="Recipient email"
              hint="We'll send them a link on reveal day."
            >
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="margaret@email.com"
                className="account-input"
                required
              />
            </Field>

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
                !recipientEmail.trim() ||
                !revealDate
              }
              className="w-full bg-amber text-white py-3.5 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Continue →"}
            </button>
            <p className="text-center text-xs italic text-ink-light">
              No payment yet. We save your capsule as a draft.
            </p>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={goToPayment} className="space-y-6">
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

            <div className="rounded-2xl border border-amber/25 bg-amber-tint/40 px-5 py-5 space-y-3">
              <h2 className="text-lg font-bold text-navy">
                Ready to send invites?
              </h2>
              <p className="text-sm text-ink-mid leading-[1.6]">
                Unlock your Memory Capsule for{" "}
                <span className="font-bold text-navy">$9.99</span> to send
                invites and activate your capsule.
              </p>
              <button
                type="submit"
                disabled={saving || invitees.length === 0}
                className="w-full bg-amber text-white py-3.5 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
              >
                {saving ? "Saving…" : "Pay $9.99 and send invites →"}
              </button>
              <p className="text-center text-xs italic text-ink-light">
                One-time payment. No subscription.
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

        {step === 3 && (
          <div className="space-y-6">
            <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
              Confirm payment
            </h1>
            <p className="text-[15px] text-ink-mid leading-[1.6]">
              One-time payment of{" "}
              <span className="font-bold text-navy">$9.99</span>. We&rsquo;ll
              send invites to{" "}
              <span className="font-semibold text-navy">
                {invitees.length}
              </span>{" "}
              {invitees.length === 1 ? "contributor" : "contributors"}{" "}
              and activate your capsule.
            </p>

            <div className="rounded-2xl border border-navy/[0.08] bg-white px-5 py-5 space-y-2">
              <Row label="Capsule">{title}</Row>
              <Row label="For">{recipientName}</Row>
              <Row label="Contributors">{invitees.length}</Row>
              <Row label="Total">$9.99</Row>
            </div>

            {/* TODO: Square payment — $9.99 one-time. The button
                currently skips straight to activation with a
                placeholder receipt id. Swap for the Square SDK
                checkout call when it lands. */}
            <button
              type="button"
              onClick={confirmPayment}
              disabled={saving}
              className="w-full bg-amber text-white py-3.5 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
            >
              {saving ? "Activating…" : "Confirm $9.99 →"}
            </button>

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm font-medium text-ink-mid hover:text-navy underline underline-offset-4"
            >
              ← Back
            </button>
          </div>
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

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[11px] uppercase tracking-[0.1em] font-bold text-ink-light">
        {label}
      </span>
      <span className="text-sm font-semibold text-navy">{children}</span>
    </div>
  );
}
