"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  Download,
  Lock,
  Mail,
  Paperclip,
  Pencil,
  QrCode,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent } from "react";

import { GiftCapsuleCheckout } from "@/components/checkout/GiftCapsuleCheckout";
import {
  MediaAttachments,
  type Attachment,
} from "@/components/editor/MediaAttachments";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { ContributorAvatar } from "@/components/ui/ContributorAvatar";
import { formatLong } from "@/lib/dateFormatters";
import {
  OCCASION_LABELS,
  formatCapsulePrice,
  recipientPronounOf,
} from "@/lib/capsules";
import { TONE_EDITOR_HINT, type CapsuleTone } from "@/lib/tone";

type CapsuleSummary = {
  id: string;
  title: string;
  recipientName: string;
  recipientPronoun: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  occasionType: keyof typeof OCCASION_LABELS;
  tone: CapsuleTone;
  revealDate: string;
  contributorDeadline: string | null;
  status: "DRAFT" | "ACTIVE" | "SEALED" | "REVEALED";
  /** The persisted status, before the temporal SEALED derivation. */
  rawStatus: "DRAFT" | "ACTIVE" | "SEALED" | "REVEALED";
  isPaid: boolean;
  requiresApproval: boolean;
  /** Manual seal — true once the organiser has locked the
   *  capsule. Reversible via the Seal/Unseal control. */
  contributionsClosed: boolean;
  accessToken: string;
  /** Open guest-contribution token, only set when occasionType
   *  is WEDDING. Drives the QR/print panel on this page. */
  guestToken: string | null;
};

type ContributionRow = {
  id: string;
  authorName: string;
  /** Pre-signed R2 URL when the author is a signed-in user with
   *  a profile photo. Null otherwise — UI falls back to initials. */
  authorAvatarUrl: string | null;
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
  /** Pre-signed R2 URL for the invitee's profile photo when their
   *  email matches a registered User with avatarUrl. Null
   *  otherwise — UI falls back to initials. */
  avatarUrl: string | null;
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
  requiresPayment,
}: {
  capsule: CapsuleSummary;
  currentUserClerkId: string;
  /** True when the organiser's activation needs a real Square
   *  charge — i.e. paywall is on and they don't have
   *  User.freeGiftAccess. When false, the activation modal
   *  skips the card-entry step. */
  requiresPayment: boolean;
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
  const [sealing, setSealing] = useState(false);
  // Add-contributors panel collapsed by default so a brand-new
  // capsule doesn't open as a wall of empty form fields. Auto-
  // opens when there's an existing invite list to surface.
  const [inviteOpen, setInviteOpen] = useState(invites.length > 0);

  const isDraft = capsule.rawStatus === "DRAFT";
  const isSealed = capsule.contributionsClosed;

  async function toggleSeal(next: boolean) {
    if (sealing) return;
    if (next) {
      const ok = window.confirm(
        "Seal this capsule? Contributors won't be able to add or edit anything until you unseal it. The reveal date is unaffected.",
      );
      if (!ok) return;
    }
    setSealing(true);
    setError(null);
    try {
      const res = await fetch(`/api/capsules/${capsule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contributionsClosed: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't update the capsule.");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSealing(false);
    }
  }
  const pronoun = recipientPronounOf(capsule);
  const subjectPronoun = pronoun === "her" ? "she" : pronoun === "him" ? "he" : "they";
  const possessivePronoun = pronoun === "her" ? "her" : pronoun === "him" ? "his" : "their";
  const subjectCapitalized = subjectPronoun.charAt(0).toUpperCase() + subjectPronoun.slice(1);
  const isCouple = pronoun === "them";
  const nameParts = capsule.recipientName.split("&");
  const firstName1 = (nameParts[0] ?? "").trim().split(" ")[0] ?? "";
  const firstName2 = isCouple && nameParts.length > 1 ? (nameParts[1] ?? "").trim().split(" ")[0] ?? "" : "";
  const recipientDisplayName = isCouple && firstName2
    ? `${firstName1} and ${firstName2}`
    : firstName1;
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

  // Activation now goes through a 2-step modal (pay contact).
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
      <section className="mx-auto max-w-[840px] px-6 lg:px-10 pt-10 pb-2">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] uppercase text-amber">
            <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
            {capsule.occasionType === "WEDDING"
              ? "Wedding Capsule"
              : `Gift Capsule · ${OCCASION_LABELS[capsule.occasionType]}`}
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

        {isDraft ? (
          <>
            <p className="mt-2 text-[15px] text-ink-mid leading-[1.5]">
              A gift {subjectPronoun}&rsquo;ll open all at once &mdash; on{" "}
              <span className="font-semibold text-navy">
                {formatLong(capsule.revealDate)}
              </span>
              .
            </p>
            {capsule.occasionType !== "WEDDING" && (
              <p className="mt-1.5 text-[13px] italic text-ink-light">
                {subjectCapitalized} won&rsquo;t expect this.
              </p>
            )}
          </>
        ) : (
          <p className="mt-2 text-[15px] text-ink-mid">
            For {capsule.recipientName}
          </p>
        )}

        {capsule.contributorDeadline && deadlineDays !== null && (
          <div className="mt-4 text-sm text-ink-light leading-[1.7]">
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

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </section>

      {/* Your message — the first thing the organiser does.
          Inline editor (collapsed) preview card after writing.
          Hidden for weddings: guests freely write through the QR
          link, so the organiser doesn't seed a "first message". */}
      {capsule.occasionType !== "WEDDING" && (
        <section
          id="your-message"
          className="mx-auto max-w-[840px] px-6 lg:px-10 pt-8"
        >
          <OwnContribution
            capsuleId={capsule.id}
            recipientDisplayName={recipientDisplayName}
            possessivePronoun={possessivePronoun}
            isCouple={isCouple}
            firstName1={firstName1}
            firstName2={firstName2}
            tone={capsule.tone}
            contribution={ownContribution ?? null}
            initialAttachments={ownAttachments}
          />
        </section>
      )}

      {/* Invite people — collapsed by default so a brand-new
          capsule doesn't open as a wall of empty form fields.
          Tap the header to expand; auto-opens when there are
          already invites to display.
          Hidden for weddings: there are no named contributors.
          Guests write freely through the post-activation QR. */}
      {capsule.occasionType !== "WEDDING" && (
        <section
          id="invite-people"
          className="mx-auto max-w-[840px] px-6 lg:px-10 pt-8"
        >
          <button
            type="button"
            onClick={() => setInviteOpen((v) => !v)}
            aria-expanded={inviteOpen}
            aria-controls="invite-people-panel"
            className="w-full flex items-center justify-between gap-3 mb-3 text-left group"
          >
            <h2 className="text-[17px] font-bold text-navy tracking-[-0.2px]">
              Add contributors (optional)
              {invites.length > 0 && (
                <span className="ml-2 text-[13px] font-semibold text-ink-light">
                  · {invites.length}
                </span>
              )}
            </h2>
            <span
              aria-hidden="true"
              className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-navy/10 text-ink-mid group-hover:text-navy group-hover:border-navy/30 transition-colors"
            >
              <ChevronDown
                size={16}
                strokeWidth={2}
                className={`transition-transform ${inviteOpen ? "rotate-180" : ""}`}
              />
            </span>
          </button>

          {inviteOpen && (
            <div id="invite-people-panel">
              <ContributorsPanel
                capsuleId={capsule.id}
                recipientName={capsule.recipientName}
                recipientDisplayName={recipientDisplayName}
                isCouple={isCouple}
                invites={invites}
                isDraft={isDraft}
                busyId={busy}
                onRemove={removeInvite}
              />
            </div>
          )}
        </section>
      )}

      {pending.length > 0 && (
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
                  <div className="flex items-center gap-2.5">
                    <ContributorAvatar
                      name={c.authorName}
                      imageUrl={c.authorAvatarUrl}
                      size={28}
                    />
                    <div className="text-xs text-ink-light uppercase tracking-[0.1em] font-bold">
                      {c.type.toLowerCase()} · {c.authorName}
                    </div>
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
      <section
        id="activate"
        className="mx-auto max-w-[840px] px-6 lg:px-10 pt-10"
      >
        <div className="rounded-2xl border border-amber/25 bg-amber-tint/40 px-6 py-6 space-y-3">
          <h2 className="text-xl font-extrabold text-navy tracking-[-0.3px] text-balance break-words">
            {isDraft
              ? capsule.occasionType === "WEDDING"
                ? "Activate your Wedding Capsule"
                : `Invite everyone who loves ${pronoun}`
              : isSealed
                ? `${recipientDisplayName}\u2019s capsule is sealed`
                : `${recipientDisplayName}\u2019s capsule is live`}
          </h2>
          {/* Active-state body copy. Hidden for weddings — there
              are no contributors to invite, and the QR share
              panel below carries the next action on its own. */}
          {(isDraft || isSealed || capsule.occasionType !== "WEDDING") && (
            <p className="text-sm text-ink-mid leading-[1.6]">
              {isDraft ? (
                capsule.occasionType === "WEDDING" ? (
                  <>
                    Activate now to unlock the QR code your guests will scan on
                    the day to leave messages, photos, and voice notes &mdash;
                    no app, no signup. Everything seals together and opens on
                    your one-year anniversary.
                  </>
                ) : (
                  <>
                    Each contributor adds something &mdash; a message, a memory,
                    a voice note &mdash; and {subjectPronoun}&rsquo;ll open it
                    all at once.
                  </>
                )
              ) : isSealed ? (
                <>
                  Locked from edits. Contributors who follow their invite link
                  will see a friendly &ldquo;contact the organiser&rdquo;
                  screen. The capsule will still deliver to{" "}
                  {recipientDisplayName} on the reveal date.
                </>
              ) : (
                <>
                  Invites are out. You can still add more contributors above
                  &mdash; they&rsquo;ll get their invite right away.
                </>
              )}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {isDraft ? (
              <button
                type="button"
                onClick={() => setActivateOpen(true)}
                className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
              >
                {capsule.occasionType === "WEDDING" ? "Activate Capsule" : "Send invites"}{" "}
                &mdash; {formatCapsulePrice(capsule.occasionType)}
              </button>
            ) : isSealed ? (
              <>
                <span className="inline-flex items-center gap-1.5 bg-navy text-white px-3 py-1.5 rounded-lg text-[12px] font-bold">
                  <Lock size={12} strokeWidth={2.25} aria-hidden="true" />
                  Sealed
                </span>
                <button
                  type="button"
                  onClick={() => toggleSeal(false)}
                  disabled={sealing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold border border-navy/15 text-ink-mid hover:text-navy hover:border-navy/30 transition-colors disabled:opacity-50"
                >
                  {sealing ? "Unsealing\u2026" : "Unseal capsule"}
                </button>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-2 bg-navy/10 text-ink-light px-5 py-2.5 rounded-lg text-sm font-bold cursor-default">
                  {capsule.occasionType === "WEDDING" ? "Capsule Activated" : "Invites sent"}
                </span>
                <button
                  type="button"
                  onClick={() => toggleSeal(true)}
                  disabled={sealing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold border border-amber/40 text-amber-dark hover:bg-amber/10 transition-colors disabled:opacity-50"
                >
                  <Lock size={12} strokeWidth={2.25} aria-hidden="true" />
                  {sealing ? "Sealing\u2026" : "Seal capsule"}
                </button>
              </>
            )}
          </div>
          {isDraft && (
            <p className="text-sm font-semibold text-navy">
              Nothing is sent to {recipientDisplayName} yet. You&rsquo;ll review
              everything before delivery.
            </p>
          )}
          <div className="pt-1">
            <Link
              href={`/capsules/${capsule.id}/preview`}
              className="inline-block px-4 py-2 rounded-lg text-[13px] font-semibold border border-amber/30 text-amber/80 hover:text-amber hover:border-amber transition-colors"
            >
              Preview their moment
            </Link>
          </div>
        </div>
      </section>

      {capsule.occasionType === "WEDDING" && capsule.guestToken && !isDraft && (
        <WeddingGuestSharePanel guestToken={capsule.guestToken} />
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
                  <div className="flex items-center gap-2.5">
                    <ContributorAvatar
                      name={c.authorName}
                      imageUrl={c.authorAvatarUrl}
                      size={32}
                    />
                    <div className="text-xs text-ink-light uppercase tracking-[0.1em] font-bold">
                      {c.type.toLowerCase()} · {c.authorName}
                    </div>
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
          capsuleTitle={capsule.title}
          occasionType={capsule.occasionType}
          recipientDisplayName={recipientDisplayName}
          recipientPronoun={pronoun}
          invitesStaged={invites.filter((i) => i.status === "STAGED").length}
          stagedInvites={invites.filter((i) => i.status === "STAGED")}
          requiresPayment={requiresPayment}
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
  recipientDisplayName,
  possessivePronoun,
  isCouple,
  firstName1,
  firstName2,
  tone,
  contribution,
  initialAttachments,
}: {
  capsuleId: string;
  recipientDisplayName: string;
  possessivePronoun: string;
  isCouple: boolean;
  firstName1: string;
  firstName2: string;
  tone: CapsuleTone;
  contribution: ContributionRow | null;
  initialAttachments: Attachment[];
}) {
  // Match surface 1 (CapsuleContributeForm) — couple capsules get
  // both first names in the placeholder so the "&" separator
  // matches what contributors see.
  const dearLine =
    isCouple && firstName2
      ? `Dear ${firstName1} & ${firstName2},`
      : `Dear ${firstName1},`;
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
  const [extraHeight, setExtraHeight] = useState(0);

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
      <form onSubmit={save} className="space-y-2.5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a title (optional)"
          aria-label="Contribution title"
          className="w-full mb-2.5 px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy placeholder-ink-light/40 outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
        />

        {/* ── Writing card (matches /contribute/capsule/[token]) ── */}
        <div className="rounded-2xl border border-amber/40 bg-white shadow-[0_4px_18px_rgba(196,122,58,0.08)] overflow-hidden">
          <div className="mx-3 mt-3 rounded-lg bg-[#eef0f8] border border-[#d4d8e8] px-4 py-3">
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 text-amber shrink-0" aria-hidden="true">
                <Sparkles size={10} strokeWidth={2} className="inline -mt-1" />
                <Pencil size={16} strokeWidth={1.75} className="inline" />
              </span>
              <div>
                <p className="text-[13px] font-bold text-navy leading-snug">
                  Write something meaningful.
                </p>
                <p className="mt-0.5 text-[12px] text-ink-mid leading-[1.4]">
                  {TONE_EDITOR_HINT[tone]}
                </p>
              </div>
            </div>
          </div>

          <div
            className="relative px-5 pt-3 pb-2 transition-all"
            style={{
              minHeight: extraHeight ? `${180 + extraHeight}px` : undefined,
            }}
          >
            <TiptapEditor
              initialContent={body}
              onUpdate={setBody}
              placeholder={dearLine}
            />
            <div className="absolute top-3 right-2.5 bottom-2 w-px flex flex-col items-center pointer-events-none">
              <div className="w-[3px] flex-1 rounded-full bg-gradient-to-b from-amber via-amber/60 to-transparent" />
              <div className="w-2.5 h-2.5 rounded-full border-2 border-amber/40 bg-white mt-1" />
              <div className="w-px flex-1 border-l border-dashed border-amber/30" />
            </div>
          </div>
          <div className="px-5 pb-2 flex items-center justify-between">
            <div className="flex gap-3">
              {extraHeight > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setExtraHeight(Math.max(0, extraHeight - 180))
                  }
                  className="text-[11px] text-amber/70 hover:text-amber transition-colors"
                >
                  Collapse
                </button>
              )}
              <button
                type="button"
                onClick={() => setExtraHeight(extraHeight + 180)}
                className="text-[11px] text-amber/70 hover:text-amber transition-colors"
              >
                Expand
              </button>
            </div>
            <span className="text-[11px] text-ink-light/50 italic">
              Write as much as you&rsquo;d like.
            </span>
          </div>
        </div>

        {/* ── Media card ─────────────────────────────────────── */}
        <div className="mt-2.5 rounded-2xl border border-amber/30 bg-white shadow-[0_2px_10px_rgba(196,122,58,0.05)] px-5 py-4">
          <p className="text-[14px] font-bold text-navy">
            Add a photo, voice note, or video
          </p>
          <p className="mt-0.5 text-[12px] text-ink-mid">
            Your voice makes it even more special.
          </p>
          <div className="mt-2.5">
            <MediaAttachments
              target="capsuleContribution"
              capsuleId={capsuleId}
              entryId={contributionId}
              initial={initialAttachments}
              ensureEntry={ensureContribution}
              canAttach={Boolean(contributionId) || hasContent()}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 text-center" role="alert">
            {error}
          </p>
        )}

        {/* ── Actions: centered primary + Cancel link below, matching
            CapsuleContributeForm + MemoryEditorForm. ── */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="w-full max-w-[400px] bg-amber text-white py-3.5 rounded-xl text-[16px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60 shadow-[0_2px_8px_rgba(196,122,58,0.25)]"
          >
            {saving
              ? "Saving…"
              : contribution
                ? "Save changes"
                : "Save my message"}
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
            className="text-[14px] font-semibold text-ink-mid hover:text-navy transition-colors disabled:opacity-50"
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
            Start {possessivePronoun} first message
          </div>
          <div className="text-[11px] text-ink-mid italic mt-0.5 whitespace-nowrap">
            Write the first note &mdash; others will follow your lead.
          </div>
          <div className="text-[11px] font-semibold text-navy/60 mt-1">
            Nothing is sent to {recipientDisplayName} yet.
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
  recipientDisplayName,
  isCouple,
  invites,
  isDraft,
  busyId,
  onRemove,
}: {
  capsuleId: string;
  recipientName: string;
  recipientDisplayName: string;
  isCouple: boolean;
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
          Invites will be sent after you unlock your capsule. Takes less than 2 minutes. No subscription.
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
                  Name
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
                  Review before {isCouple ? `${recipientDisplayName} see` : `${recipientDisplayName} sees`}
                </span>
                <span className="sm:hidden">
                  Review before {isCouple ? `${recipientDisplayName} see` : `${recipientDisplayName} sees`}
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
                ? `Add ${rows.length} contributors`
                : "Add contributor"}
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
            Contributor List · {invites.length}
          </div>
          <ul className="space-y-2">
            {invites.map((i) => (
              <li
                key={i.id}
                className="rounded-xl border border-navy/[0.08] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <InviteAvatar
                      avatarUrl={i.avatarUrl}
                      name={i.name}
                      email={i.email}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-navy truncate">
                        {i.name || "—"}
                      </div>
                      <div className="text-xs text-ink-light truncate">
                        {i.email}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs">
                        {i.requiresApproval ? (
                          <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                            <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                            Review prior
                          </span>
                        ) : (
                          <span className="text-ink-light">&mdash; No review</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(i.id)}
                    disabled={busyId === i.id}
                    aria-label={`Remove ${i.email}`}
                    className="shrink-0 text-ink-light hover:text-red-600 transition-colors disabled:opacity-50 mt-0.5"
                  >
                    <X size={16} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

const INVITE_AVATAR_BGS = [
  "bg-[#d6b49c]",
  "bg-[#a08b73]",
  "bg-[#8aa4bd]",
  "bg-[#c58e7a]",
  "bg-[#b0a088]",
];

function InviteAvatar({
  avatarUrl,
  name,
  email,
}: {
  avatarUrl: string | null;
  name: string | null;
  email: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name ?? email}
        className="shrink-0 w-9 h-9 rounded-full object-cover"
      />
    );
  }
  // Hash on email so the placeholder colour is stable across
  // renders even when the invitee's name changes.
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = (hash * 31 + email.charCodeAt(i)) >>> 0;
  const bg = INVITE_AVATAR_BGS[hash % INVITE_AVATAR_BGS.length];
  const initial = (name ?? email).trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`shrink-0 w-9 h-9 rounded-full ${bg} flex items-center justify-center text-white text-sm font-semibold`}
      aria-hidden="true"
    >
      {initial}
    </span>
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
//   Step 1 — Pay. $9.99 via Square Web SDK — card input is
//            tokenised to a sourceId that the /activate endpoint
//            turns into a real charge against the organiser.
//   Step 2 — Recipient contact. At least one of email / phone is
//            required. On save the component POSTs to /activate
//            with the sourceId + contact payload — server charges,
//            validates contact, flips status to ACTIVE, and
//            dispatches staged invite emails atomically.

function ActivationModal({
  capsuleId,
  capsuleTitle,
  occasionType,
  recipientDisplayName,
  recipientPronoun,
  invitesStaged,
  stagedInvites,
  requiresPayment,
  onClose,
  onDone,
}: {
  capsuleId: string;
  capsuleTitle: string;
  occasionType: keyof typeof OCCASION_LABELS;
  recipientDisplayName: string;
  recipientPronoun: "her" | "him" | "them";
  invitesStaged: number;
  stagedInvites: InviteRow[];
  requiresPayment: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  // Two possible steps now (recipient contact info is captured at
  // capsule creation time, so we don't ask for it again here):
  //   summary  — contributor list + send button (always)
  //   pay      — card entry (only when requiresPayment)
  const [step, setStep] = useState<"summary" | "pay">("summary");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const squareAppId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "";
  const squareLocationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "";

  // Shared activation call. Pass the Square nonce when paying;
  // pass null for free activations. The API uses whatever
  // recipientEmail / recipientPhone is already on the capsule
  // (collected at creation in the gift capsule flow).
  async function runActivate(sourceId: string | null) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/capsules/${capsuleId}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
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
      setBusy(false);
    }
  }

  async function confirmSummary() {
    setError(null);
    if (requiresPayment) {
      setStep("pay");
      return;
    }
    // Free activation path — fire activate immediately.
    await runActivate(null);
  }

  async function handleTokenized(nonce: string) {
    setError(null);
    await runActivate(nonce);
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
              {(() => {
                const totalSteps = requiresPayment ? 2 : 1;
                const current = step === "summary" ? 1 : 2;
                return `Step ${current} of ${totalSteps}`;
              })()}
            </div>
            <h2 className="text-xl font-extrabold text-navy tracking-[-0.3px] leading-[1.25] whitespace-nowrap">
              {step === "summary"
                ? `Invite everyone who loves ${recipientPronoun}`
                : "Add your card"}
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

        {step === "summary" ? (
          <div className="p-6 space-y-5">
            <div className="rounded-xl border border-navy/[0.08] bg-warm-surface/60 px-5 py-4 space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.1em] font-bold text-ink-light">
                  {occasionType === "WEDDING"
                    ? "Wedding Capsule"
                    : "Gift Capsule"}
                </span>
                <span className="text-sm font-semibold text-navy">
                  {requiresPayment
                    ? formatCapsulePrice(occasionType)
                    : "No charge"}
                </span>
              </div>
              <p className="text-xs italic text-ink-light">
                {requiresPayment
                  ? "One-time payment · No subscription required · Takes less than 2 minutes."
                  : "Free activation · You'll still collect contributions and send the capsule."}
              </p>
            </div>
            <p className="text-sm text-ink-mid leading-[1.6]">
              Each contributor adds something &mdash; a message, a memory, a voice note. {recipientDisplayName} will open it all at once.
            </p>
            {stagedInvites.length > 0 && (
              <div className="rounded-lg border border-navy/[0.06] bg-warm-surface/40 overflow-hidden">
                <div className="px-4 py-2 text-[10px] uppercase tracking-[0.12em] font-bold text-navy bg-white border-b border-navy/[0.06]">
                  Contributor List
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-navy/[0.06] text-[10px] uppercase tracking-[0.08em] text-ink-light font-bold">
                      <th className="text-left px-4 py-2">Name</th>
                      <th className="text-left px-4 py-2">Email</th>
                      <th className="text-center px-4 py-2 whitespace-nowrap">Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stagedInvites.map((inv) => (
                      <tr key={inv.id} className="border-b border-navy/[0.04] last:border-b-0">
                        <td className="px-4 py-2 font-semibold text-navy whitespace-nowrap">{inv.name || "\u2014"}</td>
                        <td className="px-4 py-2 text-ink-light break-all">{inv.email}</td>
                        <td className="px-4 py-2 text-center">
                          {inv.requiresApproval ? (
                            <Check size={14} strokeWidth={2.5} className="text-green-600 inline-block" aria-label="Yes" />
                          ) : (
                            <span className="text-ink-light">&mdash;</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button
              type="button"
              onClick={() => { onClose(); setTimeout(() => document.getElementById("invite-people")?.scrollIntoView({ behavior: "smooth" }), 100); }}
              className="text-xs font-semibold text-amber hover:text-amber-dark transition-colors"
            >
              + Add contributor
            </button>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={confirmSummary}
              disabled={busy}
              className="w-full bg-amber text-white py-3 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
            >
              {busy
                ? "Sending…"
                : requiresPayment
                  ? "Continue to payment"
                  : "Send contributor invites"}
            </button>
            <p className="text-sm font-semibold text-navy text-center">
              Nothing is sent to {recipientDisplayName} yet. You&rsquo;ll review everything before delivery.
            </p>
          </div>
        ) : (
          <div className="p-6">
            <GiftCapsuleCheckout
              capsuleTitle={capsuleTitle}
              priceLabel={formatCapsulePrice(occasionType)}
              applicationId={squareAppId}
              locationId={squareLocationId}
              onTokenized={handleTokenized}
              onCancel={() => setStep("summary")}
              isBusy={busy}
              serverError={error}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Wedding-only panel: shows the guest contribution URL +
 * scannable QR for the easel/table cards. Rendered between the
 * activate panel and contributions list, only when the capsule
 * is ACTIVE (DRAFT capsules' guest URL would 403 — no point
 * sharing). QR is rendered through api.qrserver.com so we don't
 * need a runtime QR dependency; it's a placeholder until the
 * print-ready easel/table-card flow ships.
 */
function WeddingGuestSharePanel({ guestToken }: { guestToken: string }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://untilthenapp.io";
  const guestUrl = `${origin}/wedding/${guestToken}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
    guestUrl,
  )}`;
  // Higher-res variant for the download — 1024px renders cleanly
  // when scaled into a print-ready easel sign or table card.
  const qrPrintSrc = `https://api.qrserver.com/v1/create-qr-code/?size=1024x1024&margin=24&format=png&data=${encodeURIComponent(
    guestUrl,
  )}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(guestUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard failed — degrade silently */
    }
  }

  async function downloadQr() {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(qrPrintSrc);
      if (!res.ok) throw new Error("Couldn't fetch QR");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wedding-qr-${guestToken}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Revoke after the click handler resolves so Safari can
      // actually fetch the blob URL before we tear it down.
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      /* download failed — degrade silently; user can right-click save */
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="mx-auto max-w-[840px] px-6 lg:px-10 pt-10">
      <div className="rounded-2xl border border-amber/25 bg-white px-6 py-6 grid sm:grid-cols-[1fr_auto] gap-6 items-center shadow-[0_4px_18px_rgba(196,122,58,0.08)]">
        <div className="min-w-0">
          <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber inline-flex items-center gap-1.5">
            <QrCode size={12} strokeWidth={2.25} aria-hidden="true" />
            Share with your guests
          </h2>
          <p className="mt-2 text-[15px] text-navy leading-[1.5]">
            Print this QR on your easel sign and table cards. Anyone who scans
            can leave a memory &mdash; no app, no signup.
          </p>
          <div className="mt-3 flex items-center gap-2 min-w-0">
            <code className="flex-1 min-w-0 truncate text-[12px] font-mono text-ink-mid bg-warm-surface/60 px-3 py-2 rounded-lg border border-navy/[0.06]">
              {guestUrl}
            </code>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold border border-navy/15 text-navy hover:border-amber/40 transition-colors"
            >
              {copied ? (
                <>
                  <Check size={12} strokeWidth={2.25} aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={12} strokeWidth={2} aria-hidden="true" />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={downloadQr}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold bg-amber text-white hover:bg-amber-dark transition-colors disabled:opacity-50"
            >
              <Download size={12} strokeWidth={2.25} aria-hidden="true" />
              {downloading ? "Preparing…" : "Download QR (PNG)"}
            </button>
            <a
              href={guestUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-bold border border-amber/40 text-amber-dark hover:bg-amber/10 transition-colors"
            >
              Preview as guest
            </a>
          </div>
        </div>
        <div className="shrink-0 rounded-xl border border-navy/10 p-2 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt={`QR code linking to ${guestUrl}`}
            width={120}
            height={120}
            className="block rounded-md"
          />
        </div>
      </div>
    </section>
  );
}
