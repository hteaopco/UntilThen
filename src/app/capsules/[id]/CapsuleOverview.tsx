"use client";

import {
  ArrowLeft,
  Check,
  Copy,
  Mail,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";
import { formatLong } from "@/lib/dateFormatters";
import { OCCASION_LABELS } from "@/lib/capsules";

type CapsuleSummary = {
  id: string;
  title: string;
  recipientName: string;
  recipientEmail: string;
  occasionType: keyof typeof OCCASION_LABELS;
  revealDate: string;
  contributorDeadline: string | null;
  status: "DRAFT" | "ACTIVE" | "SEALED" | "REVEALED";
  isPaid: boolean;
  requiresApproval: boolean;
  accessToken: string;
};

type ContributionRow = {
  id: string;
  authorName: string;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  body: string | null;
  approvalStatus: "PENDING_REVIEW" | "AUTO_APPROVED" | "APPROVED" | "REJECTED";
  createdAt: string;
};

type InviteRow = {
  id: string;
  email: string;
  name: string | null;
  status: "PENDING" | "ACTIVE" | "REVOKED";
  inviteToken: string;
};

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function CapsuleOverview({
  capsule,
  contributions,
  invites,
}: {
  capsule: CapsuleSummary;
  contributions: ContributionRow[];
  invites: InviteRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const pending = contributions.filter(
    (c) => c.approvalStatus === "PENDING_REVIEW",
  );
  const live = contributions.filter(
    (c) =>
      c.approvalStatus === "AUTO_APPROVED" ||
      c.approvalStatus === "APPROVED",
  );

  const revealDays = daysUntil(capsule.revealDate);
  const deadlineDays = capsule.contributorDeadline
    ? daysUntil(capsule.contributorDeadline)
    : null;

  const contributedEmails = new Set(
    contributions
      .map((c) => c.authorName.toLowerCase())
      // invites map by email, but we don't expose contribution email
      // on the list — so just match ACTIVE invites by status.
      .filter(Boolean),
  );
  void contributedEmails; // reserved for future matching — silence unused

  async function copyInviteBaseUrl() {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    // Copy the capsule's title-level share message. Individual
    // invites each have their own contributor token; this link
    // is the organiser's quick-share for adding someone on the
    // fly (they'll still need to be added as an invite to fire
    // the email).
    await navigator.clipboard.writeText(
      `${origin}/contribute/capsule/SHARE — (add ${capsule.title} contributors via Invite more)`,
    );
  }

  async function approve(contributionId: string) {
    setBusy(contributionId);
    setError(null);
    try {
      const res = await fetch(
        `/api/capsules/${capsule.id}/contributions/${contributionId}/approve`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Couldn't approve.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function reject(contributionId: string) {
    setBusy(contributionId);
    setError(null);
    try {
      const res = await fetch(
        `/api/capsules/${capsule.id}/contributions/${contributionId}/reject`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Couldn't reject.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-navy/[0.06]">
        <div className="mx-auto max-w-[840px] px-6 lg:px-10 py-4 flex items-center justify-between">
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

      <section className="mx-auto max-w-[840px] px-6 lg:px-10 pt-10 pb-4">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] uppercase text-amber mb-3">
          <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
          Memory Capsule · {OCCASION_LABELS[capsule.occasionType]}
        </div>

        <h1 className="text-balance text-[32px] lg:text-[40px] font-extrabold text-navy leading-[1.05] tracking-[-0.8px]">
          {capsule.title}
        </h1>

        <p className="mt-2 text-[15px] text-ink-mid">
          For {capsule.recipientName} · {capsule.recipientEmail}
        </p>

        <div className="mt-4 text-sm text-ink-light leading-[1.7]">
          <div>
            Opens{" "}
            <span className="font-semibold text-navy">
              {formatLong(capsule.revealDate)}
            </span>{" "}
            — in{" "}
            <span className="font-bold text-navy tabular-nums">
              {revealDays}
            </span>{" "}
            {revealDays === 1 ? "day" : "days"}
          </div>
          {capsule.contributorDeadline && deadlineDays !== null && (
            <div>
              Contributions close{" "}
              <span className="font-semibold text-navy">
                {formatLong(capsule.contributorDeadline)}
              </span>{" "}
              — in{" "}
              <span className="font-bold text-navy tabular-nums">
                {deadlineDays}
              </span>{" "}
              {deadlineDays === 1 ? "day" : "days"}
            </div>
          )}
        </div>

        {capsule.status === "DRAFT" && (
          <div className="mt-5 rounded-xl border border-amber/30 bg-amber-tint/60 px-4 py-3 text-sm text-navy">
            <p className="font-semibold">
              This capsule is still a draft — invites haven&rsquo;t been
              sent.
            </p>
            <p className="mt-1 text-ink-mid">
              Activate to send invites and collect contributions.
            </p>
            <Link
              href={`/capsules/new?continue=${capsule.id}`}
              className="inline-flex mt-3 items-center gap-2 bg-amber text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
            >
              Finish setup →
            </Link>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            disabled={capsule.status === "DRAFT"}
            className="inline-flex items-center gap-2 bg-amber text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-50"
          >
            <UserPlus size={14} strokeWidth={1.75} aria-hidden="true" />
            Invite more
          </button>
          <button
            type="button"
            onClick={copyInviteBaseUrl}
            disabled={capsule.status === "DRAFT"}
            className="inline-flex items-center gap-2 bg-white border border-navy/15 text-navy px-4 py-2 rounded-lg text-sm font-semibold hover:border-navy transition-colors disabled:opacity-50"
          >
            <Copy size={14} strokeWidth={1.75} aria-hidden="true" />
            Copy invite link
          </button>
          <Link
            href={`/capsule/${capsule.id}/open?t=${capsule.accessToken}&preview=1`}
            className="inline-flex items-center gap-2 text-sm font-medium text-ink-mid hover:text-navy transition-colors ml-auto"
          >
            Preview capsule →
          </Link>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </section>

      {capsule.requiresApproval && pending.length > 0 && (
        <section className="mx-auto max-w-[840px] px-6 lg:px-10 pt-6">
          <div className="rounded-2xl border border-gold/25 bg-gold-tint/40 px-5 py-5">
            <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-gold mb-3">
              Pending approval · {pending.length}
            </h2>
            <ul className="space-y-3">
              {pending.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl bg-white border border-gold/20 px-4 py-3"
                >
                  <div className="text-xs text-ink-light uppercase tracking-[0.1em] font-bold">
                    {c.type.toLowerCase()} · {c.authorName}
                  </div>
                  {c.body && (
                    <p className="mt-1.5 text-sm text-ink-mid line-clamp-3">
                      {c.body.replace(/<[^>]+>/g, " ").slice(0, 240)}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => approve(c.id)}
                      disabled={busy === c.id}
                      className="inline-flex items-center gap-1.5 bg-amber text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-amber-dark transition-colors disabled:opacity-50"
                    >
                      <Check size={12} strokeWidth={2} aria-hidden="true" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => reject(c.id)}
                      disabled={busy === c.id}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-mid hover:text-red-600 transition-colors disabled:opacity-50 px-2 py-1.5"
                    >
                      <X size={12} strokeWidth={2} aria-hidden="true" />
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[840px] px-6 lg:px-10 pt-8">
        <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-mid mb-3">
          Contributors · {invites.length}
        </h2>
        {invites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-navy/10 bg-warm-surface/60 px-4 py-6 text-center text-sm text-ink-mid">
            No invites yet — activate the capsule to start inviting.
          </div>
        ) : (
          <ul className="space-y-2">
            {invites.map((i) => (
              <li
                key={i.id}
                className="rounded-xl border border-navy/[0.08] bg-white px-4 py-3 flex items-center gap-3"
              >
                <Mail
                  size={16}
                  strokeWidth={1.5}
                  className="text-ink-light shrink-0"
                  aria-hidden="true"
                />
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
                <span
                  className={`text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded ${
                    i.status === "ACTIVE"
                      ? "text-green-700 bg-green-50"
                      : "text-gold bg-gold-tint"
                  }`}
                >
                  {i.status === "ACTIVE" ? "Contributed" : "Invited"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mx-auto max-w-[840px] px-6 lg:px-10 pt-8 pb-24">
        <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-mid mb-3">
          Contributions · {live.length}
        </h2>
        {live.length === 0 ? (
          <div className="rounded-xl border border-dashed border-navy/10 bg-warm-surface/60 px-4 py-8 text-center text-sm text-ink-mid">
            Nothing in the capsule yet. As contributors submit, you&rsquo;ll
            see their messages here.
          </div>
        ) : (
          <ul className="space-y-3">
            {live.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-navy/[0.08] bg-white px-5 py-4"
              >
                <div className="text-xs text-ink-light uppercase tracking-[0.1em] font-bold">
                  {c.type.toLowerCase()} · {c.authorName}
                </div>
                {c.body && (
                  <p className="mt-2 text-sm text-ink-mid leading-[1.6] line-clamp-4">
                    {c.body.replace(/<[^>]+>/g, " ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {addOpen && (
        <InviteMoreModal
          capsuleId={capsule.id}
          onClose={() => setAddOpen(false)}
        />
      )}
    </main>
  );
}

function InviteMoreModal({
  capsuleId,
  onClose,
}: {
  capsuleId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/capsules/${capsuleId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invites: [{ name: name.trim() || null, email: email.trim() }],
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't send invite.");
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

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
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[420px]"
      >
        <div className="px-6 py-5 border-b border-navy/[0.08] flex items-start justify-between gap-3">
          <h2 className="text-lg font-extrabold text-navy tracking-[-0.3px]">
            Invite someone
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-mid hover:text-navy"
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <label className="block">
            <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
              Name (optional)
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="account-input"
              placeholder="Sarah"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="account-input"
              placeholder="sarah@email.com"
              required
            />
          </label>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="px-6 py-4 border-t border-navy/[0.08] flex items-center justify-end gap-3">
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
            disabled={saving || !email.trim()}
            className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
          >
            {saving ? "Sending…" : "Send invite →"}
          </button>
        </div>
      </form>
    </div>
  );
}
