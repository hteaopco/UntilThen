"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Mail,
  Pencil,
  Sparkles,
  Trash2,
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
  /** The persisted status, before the temporal SEALED derivation. */
  rawStatus: "DRAFT" | "ACTIVE" | "SEALED" | "REVEALED";
  isPaid: boolean;
  requiresApproval: boolean;
  accessToken: string;
};

type ContributionRow = {
  id: string;
  authorName: string;
  clerkUserId: string | null;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  body: string | null;
  approvalStatus: "PENDING_REVIEW" | "AUTO_APPROVED" | "APPROVED" | "REJECTED";
  createdAt: string;
};

type InviteRow = {
  id: string;
  email: string;
  name: string | null;
  status: "STAGED" | "PENDING" | "ACTIVE" | "REVOKED";
  inviteToken: string;
};

function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function CapsuleOverview({
  capsule,
  currentUserClerkId,
  contributions,
  invites,
}: {
  capsule: CapsuleSummary;
  currentUserClerkId: string;
  contributions: ContributionRow[];
  invites: InviteRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isDraft = capsule.rawStatus === "DRAFT";
  const pending = contributions.filter(
    (c) => c.approvalStatus === "PENDING_REVIEW",
  );
  const live = contributions.filter(
    (c) =>
      c.approvalStatus === "AUTO_APPROVED" ||
      c.approvalStatus === "APPROVED",
  );

  // The organiser's own contribution is the one stamped with
  // their clerkUserId. There can only ever be one (we don't
  // expose multi-message authoring for the organiser yet).
  const ownContribution = contributions.find(
    (c) => c.clerkUserId === currentUserClerkId,
  );

  const revealDays = daysUntil(capsule.revealDate);
  const deadlineDays = capsule.contributorDeadline
    ? daysUntil(capsule.contributorDeadline)
    : null;

  async function activate() {
    if (activating) return;
    setActivating(true);
    setError(null);
    try {
      // TODO: Square payment — $9.99 one-time. Until the SDK
      // lands, the activation endpoint trusts the client. Once
      // we have a real receipt id we'll pass it through here so
      // the server can verify before flipping isPaid.
      const res = await fetch(`/api/capsules/${capsule.id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: "placeholder-square-receipt" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't activate.");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActivating(false);
    }
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

  async function removeInvite(inviteId: string) {
    if (!window.confirm("Remove this contributor?")) return;
    setBusy(inviteId);
    setError(null);
    try {
      const res = await fetch(
        `/api/capsules/${capsule.id}/invites/${inviteId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Couldn't remove.");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function deleteCapsule() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/capsules/${capsule.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Couldn't delete capsule.");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
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

      <section className="mx-auto max-w-[840px] px-6 lg:px-10 pt-10 pb-2">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] uppercase text-amber">
            <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
            Memory Capsule · {OCCASION_LABELS[capsule.occasionType]}
          </span>
          {isDraft && (
            // Non-blocking pill. Click jumps the page down to the
            // activate panel so the organiser knows where to go
            // when they're ready.
            <a
              href="#activate"
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] font-bold text-amber bg-amber-tint px-2 py-0.5 rounded hover:bg-amber/30 transition-colors"
            >
              Draft · invites not sent
            </a>
          )}
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

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </section>

      {/* Your contribution — the first thing the organiser does.
          Inline editor (collapsed) → preview card after writing. */}
      <section className="mx-auto max-w-[840px] px-6 lg:px-10 pt-8">
        <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-mid mb-3">
          Your contribution
        </h2>
        <OwnContribution
          capsuleId={capsule.id}
          recipientName={capsule.recipientName}
          contribution={ownContribution ?? null}
        />
      </section>

      {/* Contributors. STAGED rows show a "Will send when you
          activate" hint. PENDING / ACTIVE rows behave as today. */}
      <section className="mx-auto max-w-[840px] px-6 lg:px-10 pt-8">
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-mid">
            Contributors · {invites.length}
          </h2>
        </div>

        <ContributorsPanel
          capsuleId={capsule.id}
          invites={invites}
          isDraft={isDraft}
          busyId={busy}
          onRemove={removeInvite}
        />
      </section>

      {capsule.requiresApproval && pending.length > 0 && (
        <section className="mx-auto max-w-[840px] px-6 lg:px-10 pt-8">
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

      {/* Activate panel — only shown for drafts. Sits at the
          bottom so it never blocks the rest of the page. */}
      {isDraft && (
        <section
          id="activate"
          className="mx-auto max-w-[840px] px-6 lg:px-10 pt-10"
        >
          <div className="rounded-2xl border border-amber/25 bg-amber-tint/40 px-6 py-6 space-y-3">
            <h2 className="text-lg font-extrabold text-navy">
              Ready to go live?
            </h2>
            <p className="text-sm text-ink-mid leading-[1.6]">
              Activating sends invites to your contributors and schedules
              the reveal day email to {capsule.recipientName}.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={activate}
                disabled={activating}
                className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
              >
                {activating ? "Activating…" : "Pay $9.99 and activate →"}
              </button>
              <Link
                href={`/capsule/${capsule.id}/open?t=${capsule.accessToken}&preview=1`}
                className="text-sm font-medium text-ink-mid hover:text-navy transition-colors"
              >
                Preview capsule →
              </Link>
            </div>
            <p className="text-xs italic text-ink-light">
              One-time payment · No subscription
            </p>
          </div>
        </section>
      )}

      {/* Live capsule summary (post-activation): contributions
          land here. Replaces the activate panel once isPaid. */}
      {!isDraft && (
        <section className="mx-auto max-w-[840px] px-6 lg:px-10 pt-10 pb-6">
          <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-mid mb-3">
            Contributions · {live.length}
          </h2>
          {live.length === 0 ? (
            <div className="rounded-xl border border-dashed border-navy/10 bg-warm-surface/60 px-4 py-8 text-center text-sm text-ink-mid">
              Nothing in the capsule yet. As contributors submit,
              you&rsquo;ll see their messages here.
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
      )}

      {/* Quiet preview link in the bottom band — visible regardless
          of state so the organiser can sanity-check what the
          recipient will see. */}
      <section className="mx-auto max-w-[840px] px-6 lg:px-10 pt-8 text-center">
        <Link
          href={`/capsule/${capsule.id}/open?t=${capsule.accessToken}&preview=1`}
          className="text-sm font-medium text-ink-mid hover:text-navy transition-colors"
        >
          Preview capsule →
        </Link>
      </section>

      <section className="mx-auto max-w-[840px] px-6 lg:px-10 pt-12 pb-20 text-center opacity-60">
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          disabled={deleting}
          className="text-[10px] uppercase tracking-[0.12em] text-ink-light hover:text-red-600 transition-colors underline underline-offset-[3px] disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete capsule"}
        </button>
      </section>

      {deleteOpen && (
        <ConfirmDelete
          title={capsule.title}
          deleting={deleting}
          onCancel={() => {
            if (!deleting) setDeleteOpen(false);
          }}
          onConfirm={deleteCapsule}
        />
      )}
    </main>
  );
}

// ── Your contribution ──────────────────────────────────────

function OwnContribution({
  capsuleId,
  recipientName,
  contribution,
}: {
  capsuleId: string;
  recipientName: string;
  contribution: ContributionRow | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(contribution?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      // Tiptap isn't wired in here — the inline editor is a
      // textarea so the page stays light. Saved value goes into
      // the same body column the rich editor would use later.
      const url = contribution
        ? `/api/capsules/${capsuleId}/contributions/${contribution.id}`
        : `/api/capsules/${capsuleId}/contributions`;
      const method = contribution ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TEXT",
          body: draft,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't save.");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!contribution) return;
    if (!window.confirm("Delete your contribution?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/capsules/${capsuleId}/contributions/${contribution.id}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Couldn't delete.");
      setDraft("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (contribution && !editing) {
    return (
      <div className="rounded-2xl border border-amber/25 bg-white px-5 py-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] font-bold text-amber mb-2">
          <Check size={12} strokeWidth={2} aria-hidden="true" />
          Your message is ready
        </div>
        {contribution.body && (
          <p className="text-sm text-navy leading-[1.7] line-clamp-6 whitespace-pre-wrap">
            {contribution.body.replace(/<[^>]+>/g, " ")}
          </p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(contribution.body ?? "");
              setEditing(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-mid hover:text-navy transition-colors"
          >
            <Pencil size={12} strokeWidth={1.75} aria-hidden="true" />
            Edit
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-light hover:text-red-600 transition-colors disabled:opacity-50"
          >
            <Trash2 size={12} strokeWidth={1.75} aria-hidden="true" />
            Delete
          </button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (editing) {
    return (
      <form
        onSubmit={save}
        className="rounded-2xl border border-amber/40 bg-white px-5 py-5 shadow-[0_4px_18px_rgba(196,122,58,0.08)]"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Dear ${recipientName},`}
          rows={8}
          autoFocus
          className="account-input min-h-[180px] leading-[1.7] resize-y"
        />
        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={!draft.trim() || saving}
            className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : contribution ? "Save changes" : "Save my message →"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDraft(contribution?.body ?? "");
              setError(null);
            }}
            disabled={saving}
            className="text-sm font-medium text-ink-mid hover:text-navy transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
        {/* TODO: media uploads (photo / voice / video) for the
            organiser's contribution. Schema already supports
            mediaUrls/mediaTypes; the editor needs the existing
            R2 signing path wired in. */}
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full rounded-2xl border border-dashed border-amber/40 bg-amber-tint/30 px-5 py-6 text-left hover:bg-amber-tint/50 hover:border-amber transition-colors"
    >
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className="shrink-0 w-10 h-10 rounded-xl bg-white border border-amber/20 text-amber flex items-center justify-center"
        >
          <Pencil size={18} strokeWidth={1.5} />
        </div>
        <div>
          <div className="text-[15px] font-bold text-navy">
            Write something for {recipientName} →
          </div>
          <div className="text-xs text-ink-mid italic mt-0.5">
            Your own message, ready to seal alongside everyone else&rsquo;s.
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Contributors panel ────────────────────────────────────

function ContributorsPanel({
  capsuleId,
  invites,
  isDraft,
  busyId,
  onRemove,
}: {
  capsuleId: string;
  invites: InviteRow[];
  isDraft: boolean;
  busyId: string | null;
  onRemove: (id: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || adding) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/capsules/${capsuleId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invites: [
            { name: name.trim() || null, email: email.trim().toLowerCase() },
          ],
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't add.");
      }
      setName("");
      setEmail("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="rounded-2xl border border-navy/[0.07] bg-white px-5 py-5">
      {isDraft && (
        <p className="mb-4 text-xs italic text-ink-light">
          Add contributors now — invites will send when you activate the
          capsule.
        </p>
      )}

      <form
        onSubmit={add}
        className="flex flex-wrap items-end gap-2 mb-4"
      >
        <div className="flex-1 min-w-[140px]">
          <label className="block text-[10px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-1.5">
            Name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sarah"
            className="account-input"
          />
        </div>
        <div className="flex-[2] min-w-[180px]">
          <label className="block text-[10px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-1.5">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sarah@email.com"
            className="account-input"
          />
        </div>
        <button
          type="submit"
          disabled={!email.trim() || adding}
          className="shrink-0 inline-flex items-center gap-1.5 bg-navy text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-navy/90 transition-colors disabled:opacity-50 min-h-[48px]"
        >
          <UserPlus size={14} strokeWidth={1.75} aria-hidden="true" />
          Add
        </button>
      </form>

      {error && (
        <p className="mb-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {invites.length === 0 ? (
        <p className="text-sm text-ink-mid italic">
          No one added yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {invites.map((i) => (
            <li
              key={i.id}
              className="rounded-xl border border-navy/[0.08] px-4 py-2.5 flex items-center gap-3"
            >
              <Mail
                size={14}
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
                  i.status === "STAGED"
                    ? "text-amber bg-amber-tint"
                    : i.status === "ACTIVE"
                      ? "text-green-700 bg-green-50"
                      : i.status === "REVOKED"
                        ? "text-ink-light bg-[#f1f5f9]"
                        : "text-gold bg-gold-tint"
                }`}
              >
                {i.status === "STAGED"
                  ? "Staged"
                  : i.status === "ACTIVE"
                    ? "Contributed"
                    : i.status === "REVOKED"
                      ? "Removed"
                      : "Invited"}
              </span>
              <button
                type="button"
                onClick={() => onRemove(i.id)}
                disabled={busyId === i.id}
                aria-label={`Remove ${i.email}`}
                className="text-ink-light hover:text-red-600 transition-colors disabled:opacity-50"
              >
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConfirmDelete({
  title,
  deleting,
  onCancel,
  onConfirm,
}: {
  title: string;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[420px]"
      >
        <div className="px-6 py-5 border-b border-navy/[0.08] flex items-start gap-3">
          <div
            aria-hidden="true"
            className="shrink-0 w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center"
          >
            <AlertTriangle size={18} strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-navy tracking-[-0.3px]">
              Delete &ldquo;{title}&rdquo;?
            </h2>
            <p className="mt-1 text-sm text-ink-mid leading-[1.5]">
              This removes the capsule and every contribution inside.
              Can&rsquo;t be undone.
            </p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-navy/[0.08] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="text-sm font-semibold text-ink-mid hover:text-navy px-3 py-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
            {deleting ? "Deleting…" : "Delete capsule"}
          </button>
        </div>
      </div>
    </div>
  );
}
