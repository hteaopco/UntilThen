// Shared helpers for Gift Capsule routes + pages. Keeps
// ownership checks, token resolution, and status-transition
// logic in one place so every route applies the same rules.

import type { CapsuleStatus, MemoryCapsule, OccasionType } from "@prisma/client";

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

/** Resolve the capsule and verify the Clerk user owns it. */
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
  if (capsule.organiserId !== user.id) return { ok: false, status: 403 };
  return { ok: true, user, capsule };
}

/**
 * Computed status for read paths. The stored `status` column
 * moves DRAFT → ACTIVE on payment and → REVEALED on first open;
 * SEALED is derived — either temporal (past the contributor
 * deadline) or organiser-triggered (contributionsClosed flag
 * toggled from the capsule dashboard).
 */
export function effectiveStatus(
  c: Pick<
    MemoryCapsule,
    | "status"
    | "contributorDeadline"
    | "firstOpenedAt"
    | "contributionsClosed"
  >,
): CapsuleStatus {
  if (c.firstOpenedAt) return "REVEALED";
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

/** True if a capsule's magic link is still valid. */
export function tokenIsValid(
  c: Pick<MemoryCapsule, "tokenExpiresAt" | "revealDate">,
): boolean {
  const expires =
    c.tokenExpiresAt ??
    new Date(c.revealDate.getTime() + RECIPIENT_TOKEN_TTL_MS);
  return expires.getTime() > Date.now();
}

/** Valid object-form pronouns for MemoryCapsule.recipientPronoun. */
export const RECIPIENT_PRONOUNS = ["her", "him", "them"] as const;
export type RecipientPronoun = (typeof RECIPIENT_PRONOUNS)[number];

/**
 * Normalise whatever's on the capsule row into one of the three
 * valid pronouns. Null / legacy / garbage all fall back to
 * "them" so copy never breaks.
 */
export function recipientPronounOf(
  capsule: { recipientPronoun: string | null } | null | undefined,
): RecipientPronoun {
  const v = capsule?.recipientPronoun?.toLowerCase();
  if (v === "her" || v === "him" || v === "them") return v;
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
  | "OTHER",
  string
> = {
  BIRTHDAY: "Birthday",
  ANNIVERSARY: "Anniversary",
  RETIREMENT: "Retirement",
  GRADUATION: "Graduation",
  WEDDING: "Wedding",
  OTHER: "Other",
};
