"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Mail,
  Paperclip,
  Pencil,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent } from "react";

import {
  MediaAttachments,
  type Attachment,
} from "@/components/editor/MediaAttachments";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { formatLong } from "@/lib/dateFormatters";
import { OCCASION_LABELS, recipientPronounOf } from "@/lib/capsules";

type CapsuleSummary = {
  id: string;
  title: string;
  recipientName: string;
  recipientPronoun: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
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
  title: string | null;
  body: string | null;
  attachmentCount: number;
  approvalStatus: "PENDING_REVIEW" | "AUTO_APPROVED" | "APPROVED" | "REJECTED";
  createdAt: string;
};

type InviteRow = {
  id: string;
  email: string;
  name: string | null;
  status: "STAGED" | "PENDING" | "ACTIVE" | "REVOKED";
  /** Per-contributor approval toggle. True = the organiser
   * reviews this contributor's submission before the recipient
   * sees it on reveal day. */
  requiresApproval: boolean;
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
  ownAttachments,
  invites,
}: {
  capsule: CapsuleSummary;
  currentUserClerkId: string;
  contributions: ContributionRow[];
  /** Pre-signed view URLs for the organiser's own contribution
   * media. Server-rendered so MediaAttachments can hydrate the
   * thumbnails without an extra round-trip on mount. */
  ownAttachments: Attachment[];
  invites: InviteRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [activateOpen, setActivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isDraft = capsule.rawStatus === "DRAFT";
  const pronoun = recipientPronounOf(capsule);
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

  // Activation now goes through a 2-step modal (pay → contact).
  // The single /activate request fires at the end with the
  // collected contact payload so contact + payment + invite
  // dispatch all land in one server transaction.

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
            // send panel so the organiser knows where to go when
            // they're ready. Softer copy — "not yet shared" reads
            // as a state of the gift, not a product status.
            <a
              href="#activate"
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] font-bold text-amber bg-amber-tint px-2 py-0.5 rounded hover:bg-amber/30 transition-colors"
            >
              Not yet shared
            </a>
          )}
        </div>

        <h1 className="text-balance text-[32px] lg:text-[40px] font-extrabold text-navy leading-[1.05] tracking-[-0.8px]">
          {capsule.title}
        </h1>

        {/* Emotional sub-header, draft-only. Tells the organiser
            exactly what's about to happen in human terms —
            "people will add memories for Evelyn, they'll open
            them all at once on May 20" — so the page reads as a
            shared experience being built, not a form in
            progress. Live capsules show contact meta instead. */}
        {isDraft ? (
          <p className="mt-2 text-[15px] text-ink-mid leading-[1.5]">
            People will add memories for {capsule.recipientName}.
            <br />
            They&rsquo;ll open them all at once on{" "}
            <span className="font-semibold text-navy">
              {formatLong(capsule.revealDate)}
            </span>
            .
          </p>
        ) : (
          <p className="mt-2 text-[15px] text-ink-mid">
            For {capsule.recipientName}
            {capsule.recipientEmail && <> · {capsule.recipientEmail}</>}
            {!capsule.recipientEmail && capsule.recipientPhone && (
              <> · {capsule.recipientPhone}</>
            )}
          </p>
        )}

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

      {/* Your message — the first thing the organiser does.
          Inline editor (collapsed) → preview card after writing. */}
      <section
        id="your-message"
        className="mx-auto max-w-[840px] px-6 lg:px-10 pt-8"
      >
        <OwnContribution
          capsuleId={capsule.id}
          recipientName={capsule.recipientName}
          contribution={ownContribution ?? null}
          initialAttachments={ownAttachments}
        />
      </section>

      {/* Invite people — collapsed by default on drafts with no
          contributors yet so the page doesn't open as a wall of
          empty forms. Expands with a click; auto-opens once any
          invites exist or once the organiser saves their own
          message (handled in OwnContribution via the ref). */}
      <section
        id="invite-people"
        className="mx-auto max-w-[840px] px-6 lg:px-10 pt-8"
      >
        <div className="mb-3">
          <h2 className="text-[17px] font-bold text-navy tracking-[-0.2px]">
            Invite people
          </h2>
          <p className="mt-0.5 text-sm text-ink-mid">
            Add a few people — or skip for now.
          </p>
        </div>

        <ContributorsPanel
          capsuleId={capsule.id}
          recipientName={capsule.recipientName}
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

      {/* Activate panel — only shown for drafts. Copy is carefully
          written to make clear payment unlocks invites to
          contributors (not delivery to the recipient); the recipient
          doesn't see anything until the reveal date. Empty state
          (no invites yet) pivots to "unlock your capsule" so the
          user still has a forward action. */}
      {isDraft && (
        <section
          id="activate"
          className="mx-auto max-w-[840px] px-6 lg:px-10 pt-10"
        >
          <div className="rounded-2xl border border-amber/25 bg-amber-tint/40 px-6 py-6 space-y-3">
            <h2 className="text-xl font-extrabold text-navy tracking-[-0.3px]">
              Invite everyone who loves {pronoun}
            </h2>
            <p className="text-sm text-ink-mid leading-[1.6]">
              We&rsquo;ll send invites now so they can add messages.
              Everything will be delivered to {capsule.recipientName} on{" "}
              {formatLong(capsule.revealDate)}.
            </p>
            <button
              type="button"
              onClick={() => setActivateOpen(true)}
              className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
            >
              {invites.length === 0
                ? "Unlock your capsule — $9.99 →"
                : "Unlock & send invites — $9.99 →"}
            </button>
            <p className="text-sm text-ink-mid leading-[1.55]">
              {invites.length === 0 ? (
                <>
                  You can invite people after unlocking, or keep it just
                  from you.
                </>
              ) : (
                <>
                  Invites go to contributors now. {capsule.recipientName}{" "}
                  receives everything on {formatLong(capsule.revealDate)}.
                </>
              )}
            </p>
            <p className="text-xs italic text-ink-light">
              Takes less than 2 minutes. No subscription.
            </p>
            {/* Confidence line — the single reassurance that payment
                does NOT fire anything off to the recipient yet. */}
            <p className="text-sm font-semibold text-navy">
              Nothing is sent to {capsule.recipientName} yet.
            </p>
            <div className="pt-1">
              <Link
                href={`/capsule/${capsule.id}/open?t=${capsule.accessToken}&preview=1`}
                className="text-sm font-medium text-ink-mid hover:text-navy transition-colors"
              >
                Preview what {capsule.recipientName} will see →
              </Link>
            </div>
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
                  {c.title && (
                    <h3 className="mt-1.5 text-[15px] font-bold text-navy tracking-[-0.2px]">
                      {c.title}
                    </h3>
                  )}
                  {c.body && (
                    <p className="mt-1.5 text-sm text-ink-mid leading-[1.6] line-clamp-4">
                      {c.body.replace(/<[^>]+>/g, " ")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

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

      {activateOpen && (
        <ActivationModal
          capsuleId={capsule.id}
          recipientName={capsule.recipientName}
          recipientPronoun={pronoun}
          initialEmail={capsule.recipientEmail}
          initialPhone={capsule.recipientPhone}
          invitesStaged={invites.filter((i) => i.status === "STAGED").length}
          onClose={() => setActivateOpen(false)}
          onDone={() => {
            setActivateOpen(false);
            router.refresh();
          }}
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
  initialAttachments,
}: {
  capsuleId: string;
  recipientName: string;
  contribution: ContributionRow | null;
  initialAttachments: Attachment[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  // Editor state — same shape as NewEntryForm so contribution
  // and entry editing stay visually identical.
  const [contributionId, setContributionId] = useState<string | null>(
    contribution?.id ?? null,
  );
  const [title, setTitle] = useState(contribution?.title ?? "");
  const [body, setBody] = useState(contribution?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs so the ensureContribution callback always sees the
  // latest typed state without re-creating itself on every
  // keystroke (mirrors the NewEntryForm stateRef pattern).
  const stateRef = useRef({ title, body, contributionId });
  stateRef.current = { title, body, contributionId };

  const hasContent = useCallback(() => {
    const s = stateRef.current;
    const bodyText = s.body.replace(/<[^>]*>/g, "").trim();
    return Boolean(s.title.trim()) || bodyText.length > 0;
  }, []);

  /**
   * Create-or-update side of the contribution. Called as the
   * ensureTarget callback for MediaAttachments — the first photo
   * upload triggers a POST so the row exists for the upload key
   * to anchor to. Subsequent edits PATCH.
   */
  const ensureContribution = useCallback(async (): Promise<string | null> => {
    const s = stateRef.current;
    if (s.contributionId) return s.contributionId;
    if (!hasContent()) return null;
    try {
      const res = await fetch(`/api/capsules/${capsuleId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TEXT",
          title: s.title.trim() || null,
          body: s.body || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't save.");
      }
      const json = (await res.json()) as { id: string };
      setContributionId(json.id);
      return json.id;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, [capsuleId, hasContent]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!hasContent() || saving) {
      if (!hasContent()) setError("Add a title or write something first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = stateRef.current.contributionId;
      const url = id
        ? `/api/capsules/${capsuleId}/contributions/${id}`
        : `/api/capsules/${capsuleId}/contributions`;
      const method = id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TEXT",
          title: title.trim() || null,
          body: body || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't save.");
      }
      const wasFirstSave = !id;
      if (wasFirstSave) {
        const json = (await res.json()) as { id?: string };
        if (json.id) setContributionId(json.id);
      }
      setEditing(false);
      router.refresh();
      // Momentum stacking: after the organiser writes their
      // first message, scroll straight to the send panel so
      // the "Send it — $9.99" CTA is the next thing they see.
      // Pushes the conversion moment while they've got emotional
      // momentum — per the brief this is the single-highest-
      // impact nudge.
      if (wasFirstSave && typeof window !== "undefined") {
        requestAnimationFrame(() => {
          document
            .getElementById("activate")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
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
      setTitle("");
      setBody("");
      setContributionId(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (contribution && !editing) {
    const preview = (contribution.body ?? "").replace(/<[^>]+>/g, " ").trim();
    return (
      <div className="rounded-2xl border border-amber/25 bg-white px-5 py-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] font-bold text-amber mb-2">
          <Check size={12} strokeWidth={2} aria-hidden="true" />
          Your message is ready
        </div>
        {contribution.title && (
          <h3 className="text-[18px] font-extrabold text-navy tracking-[-0.2px] leading-tight mb-2">
            {contribution.title}
          </h3>
        )}
        {preview && (
          <p className="text-sm text-navy leading-[1.7] line-clamp-6">
            {preview}
          </p>
        )}
        {contribution.attachmentCount > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs italic text-ink-light">
            <Paperclip size={12} strokeWidth={1.75} aria-hidden="true" />
            {contribution.attachmentCount}{" "}
            {contribution.attachmentCount === 1 ? "attachment" : "attachments"}
          </p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setTitle(contribution.title ?? "");
              setBody(contribution.body ?? "");
              setContributionId(contribution.id);
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
        className="rounded-2xl border border-amber/40 bg-white shadow-[0_4px_18px_rgba(196,122,58,0.08)] overflow-hidden"
      >
        {/* Title — same look as the letter editor's title input
            (large, transparent, with a divider below). */}
        <div className="px-6 pt-6">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            aria-label="Contribution title"
            className="w-full px-0 py-2 text-[24px] lg:text-[28px] font-extrabold text-navy bg-transparent border-0 outline-none placeholder-ink-light/60 tracking-[-0.4px] leading-tight border-b border-navy/[0.06] pb-3"
          />
        </div>

        <div className="px-6 pt-4 pb-2">
          <TiptapEditor
            initialContent={body}
            onUpdate={setBody}
            placeholder={`Dear ${recipientName},`}
          />
        </div>

        {/* Media — same component, same buttons. The only
            difference is the target descriptor that routes
            uploads through the capsule contribution path. */}
        <div className="px-6 pt-4 pb-5 border-t border-navy/[0.06]">
          <MediaAttachments
            target="capsuleContribution"
            capsuleId={capsuleId}
            entryId={contributionId}
            initial={initialAttachments}
            ensureEntry={ensureContribution}
            canAttach={Boolean(contributionId) || hasContent()}
          />
        </div>

        {error && (
          <p className="px-6 pb-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="px-6 py-4 border-t border-navy/[0.06] flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
          >
            {saving
              ? "Saving…"
              : contribution
                ? "Save changes"
                : "Save my message →"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setTitle(contribution?.title ?? "");
              setBody(contribution?.body ?? "");
              setError(null);
            }}
            disabled={saving}
            className="text-sm font-medium text-ink-mid hover:text-navy transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
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
            Start with your message →
          </div>
          <div className="text-xs text-ink-mid italic mt-0.5">
            Write the first note — others will follow your lead.
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Contributors panel ────────────────────────────────────

/**
 * Contributors panel — batch entry + per-row approval toggle.
 *
 * The organiser builds a list of email rows (name + email +
 * approval checkbox each), adds as many as they like via the
 * "Add multiple" button, and saves them all in a single request.
 * Existing invites are listed below with their approval state
 * shown as an inline badge.
 */
type DraftRow = {
  /** Client-only id so React keys stay stable across re-renders. */
  key: string;
  name: string;
  email: string;
  requiresApproval: boolean;
};

function blankRow(): DraftRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    email: "",
    requiresApproval: false,
  };
}

function ContributorsPanel({
  capsuleId,
  recipientName,
  invites,
  isDraft,
  busyId,
  onRemove,
}: {
  capsuleId: string;
  recipientName: string;
  invites: InviteRow[];
  isDraft: boolean;
  busyId: string | null;
  onRemove: (id: string) => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<DraftRow[]>([blankRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Inline confirmation that shows briefly after a successful
  // add — reassures the organiser the row landed and that invites
  // will only go out after payment.
  const [justAdded, setJustAdded] = useState<number>(0);

  function updateRow(key: string, patch: Partial<DraftRow>) {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
  }

  function removeRow(key: string) {
    setRows((prev) => {
      const next = prev.filter((r) => r.key !== key);
      // Always keep at least one row so the form doesn't collapse.
      return next.length > 0 ? next : [blankRow()];
    });
  }

  function addRow() {
    setRows((prev) => [...prev, blankRow()]);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);

    // Normalise + filter any blank rows. At least one valid
    // email is required to save.
    const payload = rows
      .map((r) => ({
        name: r.name.trim() || null,
        email: r.email.trim().toLowerCase(),
        requiresApproval: r.requiresApproval,
      }))
      .filter((r) => r.email.length > 0);

    if (payload.length === 0) {
      setError("Add at least one email.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/capsules/${capsuleId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invites: payload }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't save contributors.");
      }
      // Reset the form to a single blank row so the organiser
      // can keep adding more batches. Remember how many we added so
      // the inline confirmation can use the right pluralisation.
      const added = payload.length;
      setRows([blankRow()]);
      setJustAdded(added);
      // Auto-dismiss the confirmation after a few seconds so it
      // doesn't sit there forever; the badge in the list below is
      // the persistent state of record.
      window.setTimeout(() => setJustAdded(0), 6000);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-navy/[0.07] bg-white px-5 py-5">
      {isDraft && (
        <p className="mb-4 text-xs italic text-ink-light">
          Invites will be sent after you unlock your capsule.
        </p>
      )}
      {justAdded > 0 && (
        <div
          className="mb-4 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800"
          role="status"
        >
          {justAdded === 1
            ? "Added. They\u2019ll be invited once you send your capsule."
            : `Added ${justAdded}. They\u2019ll be invited once you send your capsule.`}
        </div>
      )}

      <form onSubmit={save} className="space-y-3">
        {rows.map((row, idx) => (
          <div
            key={row.key}
            className="rounded-xl border border-navy/[0.08] bg-warm-surface/40 px-4 py-3"
          >
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-[10px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-1.5">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => updateRow(row.key, { name: e.target.value })}
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
                  value={row.email}
                  onChange={(e) =>
                    updateRow(row.key, { email: e.target.value })
                  }
                  placeholder="sarah@email.com"
                  className="account-input"
                />
              </div>
              {/* Per-row approval toggle sits to the right of the
                  email. Drops below on narrow layouts via flex-wrap.
                  Full label on desktop, short on mobile. Copy names
                  the recipient so it's obvious what "before reveal"
                  actually means. */}
              <label className="shrink-0 inline-flex items-center gap-2 min-h-[48px] px-2 text-[13px] text-navy cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={row.requiresApproval}
                  onChange={(e) =>
                    updateRow(row.key, { requiresApproval: e.target.checked })
                  }
                  className="accent-amber"
                />
                <span className="hidden sm:inline">
                  Review contributions before {recipientName} sees them
                </span>
                <span className="sm:hidden">
                  Review before {recipientName} sees
                </span>
              </label>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  aria-label={`Remove row ${idx + 1}`}
                  className="shrink-0 text-ink-light hover:text-red-600 transition-colors min-h-[48px] px-2"
                >
                  <X size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* "Add multiple" appends another blank row. Secondary
              style so Save reads as the primary action. */}
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 bg-white border border-navy/15 text-navy px-4 py-2 rounded-lg text-sm font-semibold hover:border-navy transition-colors"
          >
            <UserPlus size={14} strokeWidth={1.75} aria-hidden="true" />
            Add multiple
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-navy text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-navy/90 transition-colors disabled:opacity-50"
          >
            {saving
              ? "Saving…"
              : rows.length > 1
                ? `Add ${rows.length} contributors →`
                : "Add contributor →"}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </form>

      {invites.length > 0 && (
        <>
          <div className="mt-5 mb-2 text-[11px] uppercase tracking-[0.12em] font-bold text-ink-light">
            Already added · {invites.length}
          </div>
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
                {i.requiresApproval && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] font-bold text-amber bg-amber-tint px-2 py-0.5 rounded">
                    Review
                  </span>
                )}
                {/* STAGED = pre-payment draft state; label spells
                    out *why* nothing has left yet so the organiser
                    isn't confused that the row is "stuck". Other
                    statuses keep the tight uppercase pill. */}
                {i.status === "STAGED" ? (
                  <span className="text-[11px] font-semibold text-amber bg-amber-tint px-2 py-0.5 rounded whitespace-nowrap">
                    Pending — invites send after payment
                  </span>
                ) : (
                  <span
                    className={`text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded ${
                      i.status === "ACTIVE"
                        ? "text-green-700 bg-green-50"
                        : i.status === "REVOKED"
                          ? "text-ink-light bg-[#f1f5f9]"
                          : "text-gold bg-gold-tint"
                    }`}
                  >
                    {i.status === "ACTIVE"
                      ? "Contributed"
                      : i.status === "REVOKED"
                        ? "Removed"
                        : "Invited"}
                  </span>
                )}
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
        </>
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

// ── Activation modal ────────────────────────────────────
//
// Two-step payment + recipient-contact flow.
//
//   Step 1 — Pay. $9.99 placeholder (Square SDK is a TODO);
//            clicking "Confirm $9.99" just advances the step.
//   Step 2 — Recipient contact. At least one of email / phone is
//            required. On save the component POSTs to /activate
//            with the payment id and contact payload — server
//            validates, saves both, flips status to ACTIVE, and
//            dispatches staged invite emails atomically.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ActivationModal({
  capsuleId,
  recipientName,
  recipientPronoun,
  initialEmail,
  initialPhone,
  invitesStaged,
  onClose,
  onDone,
}: {
  capsuleId: string;
  recipientName: string;
  recipientPronoun: "her" | "him" | "them";
  initialEmail: string | null;
  initialPhone: string | null;
  invitesStaged: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState<"pay" | "contact">("pay");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function confirmPayment() {
    // TODO: Square payment — $9.99 one-time. For now we just
    // advance; the server still gets a placeholder receipt id
    // on the activate POST so the wire format is final.
    setError(null);
    setStep("contact");
  }

  async function saveAndActivate(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    if (!trimmedEmail && !trimmedPhone) {
      setError("Add an email or phone number so we can reach them.");
      return;
    }
    if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) {
      setError("Please enter a valid email.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/capsules/${capsuleId}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: "placeholder-square-receipt",
          recipientEmail: trimmedEmail || null,
          recipientPhone: trimmedPhone || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't activate.");
      }
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[480px]"
      >
        <div className="px-7 py-5 border-b border-navy/[0.08] flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-1">
              {step === "pay" ? "Step 1 of 2" : "Step 2 of 2"}
            </div>
            <h2 className="text-xl font-extrabold text-navy tracking-[-0.3px] leading-[1.25]">
              {step === "pay"
                ? `Invite everyone who loves ${recipientPronoun}`
                : `How should we reach ${recipientName}?`}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!busy) onClose();
            }}
            disabled={busy}
            className="text-ink-mid hover:text-navy transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {step === "pay" ? (
          <div className="p-6 space-y-5">
            <div className="rounded-xl border border-navy/[0.08] bg-warm-surface/60 px-5 py-4 space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.1em] font-bold text-ink-light">
                  Memory Capsule
                </span>
                <span className="text-sm font-semibold text-navy">$9.99</span>
              </div>
              <p className="text-xs italic text-ink-light">
                One-time payment · No subscription · No credit card saved
              </p>
            </div>
            <p className="text-sm text-ink-mid leading-[1.6]">
              We&rsquo;ll send invites now to the{" "}
              {invitesStaged > 0 ? (
                <>
                  {invitesStaged.toLocaleString()}{" "}
                  {invitesStaged === 1 ? "person" : "people"} you&rsquo;ve added
                </>
              ) : (
                <>contributors you add</>
              )}{" "}
              so they can add messages. Everything will be delivered to{" "}
              {recipientName} on reveal day.
            </p>
            <p className="text-xs italic text-ink-light">
              Takes less than 2 minutes. No subscription.
            </p>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={confirmPayment}
              className="w-full bg-amber text-white py-3 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
            >
              {invitesStaged === 0
                ? "Unlock your capsule — $9.99 →"
                : "Unlock & send invites — $9.99 →"}
            </button>
            {/* Confidence line — payment does not fire anything off
                to the recipient; reassurance the user needs before
                handing over $9.99. */}
            <p className="text-sm font-semibold text-navy text-center">
              Nothing is sent to {recipientName} yet.
            </p>
          </div>
        ) : (
          <form onSubmit={saveAndActivate} className="p-6 space-y-4">
            <p className="text-sm text-ink-mid leading-[1.6]">
              Add an email, a phone number, or both — either works.
            </p>
            <label className="block">
              <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
                Recipient email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`${recipientName.toLowerCase().replace(/\s+/g, "")}@email.com`}
                className="account-input"
                autoFocus
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
                Recipient phone
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                className="account-input"
              />
            </label>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send it →"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!busy) setStep("pay");
                }}
                disabled={busy}
                className="text-sm font-medium text-ink-mid hover:text-navy transition-colors disabled:opacity-50"
              >
                Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
