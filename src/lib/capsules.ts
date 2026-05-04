// Shared helpers for Gift Capsule routes + pages. Keeps
// ownership checks, token resolution, and status-transition
// logic in one place so every route applies the same rules.

import type { CapsuleStatus, MemoryCapsule, OccasionType } from "@prisma/client";

import { combineRevealMs } from "@/lib/reveal-schedule";
import {
  GIFT_CAPSULE_PRICE_CENTS,
  WEDDING_CAPSULE_PRICE_CENTS,
} from "@/lib/square";

/** How long a DRAFT capsule is preserved before auto-delete. */
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Magic-link TTL after the reveal date. */
export const RECIPIENT_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Maximum lead time between capsule creation and reveal for the
 * standard Gift Capsule. Capped at 60 days so the product stays
 * a short-horizon occasion tool — long-horizon writing (years,
 * 18th birthdays, etc.) stays the child Vault's territory.
 * Enforced server-side in POST /api/capsules + PATCH
 * /api/capsules/[id].
 */
export const CAPSULE_MAX_HORIZON_MS = 60 * 24 * 60 * 60 * 1000;
export const CAPSULE_MAX_HORIZON_DAYS = 60;

/**
 * Wedding capsules need a much longer horizon because the
 * default reveal is the couple's first anniversary — typically
 * 12 months out, sometimes 18 if the wedding is itself months
 * away when the capsule is purchased. 600 days covers
 * "engagement-window purchase + 1-year-anniversary reveal".
 */
export const WEDDING_MAX_HORIZON_MS = 600 * 24 * 60 * 60 * 1000;
export const WEDDING_MAX_HORIZON_DAYS = 600;

/**
 * Per-occasion ceiling on revealDate. WEDDING gets the long
 * horizon; everything else stays on the 60-day default.
 */
export function maxHorizonMsForOccasion(
  occasionType: OccasionType | null | undefined,
): number {
  return occasionType === "WEDDING"
    ? WEDDING_MAX_HORIZON_MS
    : CAPSULE_MAX_HORIZON_MS;
}

/**
 * Per-occasion one-time charge. WEDDING is the premium tier;
 * everything else uses the standard $9.99 Gift Capsule price.
 * Server-side authoritative — the activate route reads this and
 * the client display mirrors it.
 */
export function priceCentsForOccasion(
  occasionType: OccasionType | null | undefined,
): number {
  return occasionType === "WEDDING"
    ? WEDDING_CAPSULE_PRICE_CENTS
    : GIFT_CAPSULE_PRICE_CENTS;
}

/** "$9.99" / "$99.00" — display helper used in checkout copy. */
export function formatCapsulePrice(
  occasionType: OccasionType | null | undefined,
): string {
  const cents = priceCentsForOccasion(occasionType);
  const dollars = (cents / 100).toFixed(2);
  return `$${dollars}`;
}

export type OwnedCapsuleResult =
  | { ok: true; user: { id: string }; capsule: MemoryCapsule }
  | { ok: false; status: 401 | 403 | 404 };

/**
 * Resolve the capsule and verify the Clerk user can act on it.
 *
 * Two access paths are accepted:
 *   1. The user is the original organiser (capsule.organiserId
 *      matches the local User.id). Always allowed.
 *   2. The capsule is org-attributed AND the user is an OWNER /
 *      ADMIN of that org. This lets enterprise admins manage
 *      capsules on behalf of teammates from their dashboard /
 *      stat board surfaces. MEMBERs do not get this access — a
 *      MEMBER who didn't create the capsule still 403s.
 *
 * The result still returns the calling user's row in `user`, not
 * the original organiser's, so callers that key something off the
 * acting user (audit log, who triggered an action) work as
 * expected.
 */
export async function findOwnedCapsule(
  clerkUserId: string | null,
  capsuleId: string,
): Promise<OwnedCapsuleResult> {
  if (!clerkUserId) return { ok: false, status: 401 };
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });
  if (!user) return { ok: false, status: 404 };
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { id: capsuleId },
  });
  if (!capsule) return { ok: false, status: 404 };
  if (capsule.organiserId === user.id) {
    return { ok: true, user, capsule };
  }
  // Org-attributed capsules: enterprise OWNER/ADMIN can manage
  // even when they didn't organise.
  if (capsule.organizationId) {
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: capsule.organizationId,
          userId: user.id,
        },
      },
      select: { role: true },
    });
    if (membership && (membership.role === "OWNER" || membership.role === "ADMIN")) {
      return { ok: true, user, capsule };
    }
  }
  return { ok: false, status: 403 };
}

/**
 * Effective status union — wider than the persisted `CapsuleStatus`
 * Prisma enum because `SENT` is derived (no schema change) from
 * `revealDate <= now` and not-yet-opened.
 *
 * Lifecycle visible to UI:
 *   DRAFT    → not paid yet
 *   ACTIVE   → paid, collecting contributions
 *   SEALED   → closed to contributions but pre-reveal-date
 *              (manual close OR contributorDeadline passed)
 *   SENT     → reveal date has passed; the capsule has been
 *              emailed to the recipient (or will be on the next
 *              cron tick within 15 min). Cannot be unsealed; no
 *              new contributions; existing contributions can no
 *              longer be edited.
 *   REVEALED → recipient has opened the capsule.
 */
export type EffectiveStatus =
  | "DRAFT"
  | "ACTIVE"
  | "SEALED"
  | "SENT"
  | "REVEALED";

/**
 * Computed status for read paths. The stored `status` column
 * moves DRAFT → ACTIVE on payment and → REVEALED on first open;
 * SEALED is derived — either temporal (past the contributor
 * deadline) or organiser-triggered (contributionsClosed flag
 * toggled from the capsule dashboard); SENT is derived from
 * revealDate <= now (cron may or may not have fired yet, but
 * either way the capsule is locked).
 */
export function effectiveStatus(
  c: Pick<
    MemoryCapsule,
    | "status"
    | "contributorDeadline"
    | "firstOpenedAt"
    | "contributionsClosed"
    | "revealDate"
    | "deliveryTime"
    | "timezone"
  >,
): EffectiveStatus {
  if (c.firstOpenedAt) return "REVEALED";
  if (c.status === "REVEALED") return "REVEALED";
  // DRAFT capsules haven't been activated yet, so no email has
  // gone out and the organiser is still composing — keep them
  // editable regardless of the revealDate. Without this guard a
  // same-day DRAFT (revealDate parsed as UTC midnight) flipped
  // to SENT immediately and locked the organiser out of their
  // own letter editor before they'd written anything.
  if (c.status === "DRAFT") return "DRAFT";
  // For activated capsules: revealDate <= now means the recipient
  // has been (or is about to be) emailed. Treat as SENT — locked
  // from edits / new contributions / unseal — even before the
  // cron has flipped the persisted status to SEALED. Compute the
  // *actual* reveal moment from date + delivery time + timezone
  // so a same-day reveal scheduled for tonight doesn't read as
  // already sent the moment UTC midnight passes.
  const revealMomentMs = combineRevealMs(
    c.revealDate.toISOString().slice(0, 10),
    c.deliveryTime,
    c.timezone,
  );
  const compareMs = Number.isNaN(revealMomentMs)
    ? c.revealDate.getTime()
    : revealMomentMs;
  if (compareMs <= Date.now()) return "SENT";
  if (c.status === "SEALED") return "SEALED";
  if (c.status === "ACTIVE" && c.contributionsClosed) return "SEALED";
  if (
    c.status === "ACTIVE" &&
    c.contributorDeadline &&
    c.contributorDeadline.getTime() < Date.now()
  ) {
    return "SEALED";
  }
  return c.status;
}

/**
 * True when the capsule is closed to new contributions and edits
 * — covers both the pre-reveal SEALED state and the post-send
 * SENT/REVEALED states. Use this at every contribution-mutating
 * guard so all three closed states behave identically.
 */
export function isCapsuleClosed(status: EffectiveStatus): boolean {
  return status === "SEALED" || status === "SENT" || status === "REVEALED";
}

/** True if a capsule's magic link is still valid. */
export function tokenIsValid(
  c: Pick<MemoryCapsule, "tokenExpiresAt" | "revealDate">,
): boolean {
  const expires =
    c.tokenExpiresAt ??
    new Date(c.revealDate.getTime() + RECIPIENT_TOKEN_TTL_MS);
  return expires.getTime() > Date.now();
}

/** Valid object-form pronouns for MemoryCapsule.recipientPronoun.
 *  Kept as a constant so legacy reads still typecheck; new
 *  capsules always store "them". */
export const RECIPIENT_PRONOUNS = ["her", "him", "them"] as const;
export type RecipientPronoun = (typeof RECIPIENT_PRONOUNS)[number];

/**
 * Returns the recipient pronoun for copy. Always "them" — gender
 * is no longer collected from the organiser, so every recipient
 * is referenced as the gender-neutral "they/them/their" through-
 * out the app. The argument is preserved for call-site
 * compatibility but the stored value is ignored.
 */
export function recipientPronounOf(
  _capsule: { recipientPronoun: string | null } | null | undefined,
): RecipientPronoun {
  return "them";
}

/**
 * Labels we show to the organiser / contributors. Keep in sync
 * with the OccasionType enum.
 */
export const OCCASION_LABELS: Record<
  "BIRTHDAY"
  | "ANNIVERSARY"
  | "RETIREMENT"
  | "GRADUATION"
  | "WEDDING"
  | "JUST_BECAUSE"
  | "ENGAGEMENT"
  | "BAPTISM"
  | "CONGRATULATIONS"
  | "THANK_YOU"
  | "FRIENDSHIP"
  | "GET_WELL"
  | "SYMPATHY"
  | "OTHER",
  string
> = {
  BIRTHDAY: "Birthday",
  ANNIVERSARY: "Anniversary",
  RETIREMENT: "Retirement",
  GRADUATION: "Graduation",
  WEDDING: "Wedding",
  JUST_BECAUSE: "Just Because",
  ENGAGEMENT: "Engagement",
  BAPTISM: "Baptism / Christening",
  CONGRATULATIONS: "Congratulations",
  THANK_YOU: "Thank you",
  FRIENDSHIP: "Friendship",
  GET_WELL: "Get well",
  SYMPATHY: "Sympathy",
  OTHER: "Other",
};
