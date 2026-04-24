// Annual-addon rebuild helper.
//
// Annual addon add/remove can't call `subscriptions.update` with
// `priceOverrideMoney` because Square rejects that when an
// `orderTemplateId` is present on the sub (and every annual sub
// we create has one, per the create-vs-template conflict we
// fixed earlier). Instead we schedule a fresh annual sub to
// start at the current sub's `currentPeriodEnd`, with a merged
// custom template reflecting the new addon count baked in.
//
// This piggybacks on the existing "pendingPlan" promotion
// machinery (used by /api/payments/switch-plan). When the new
// sub activates, the `subscription.updated` webhook promotes
// `pendingSquareSubId` into `squareSubId` — same as a cadence
// switch, just without a plan change.
//
// User experience: the addon slot is granted immediately in our
// DB, Square bills the old annual amount one more time (no charge
// today), and the merged total hits at the annual renewal.

import type { SquareClient } from "square";

import {
  ANNUAL_ADDON_CENTS,
  ANNUAL_BASE_CENTS,
} from "@/lib/proration";
import {
  SQUARE_LOCATION_ID,
  SQUARE_PLAN_IDS,
  createSubscriptionOrderTemplate,
} from "@/lib/square";
import { retryOnIdempotencyReuse } from "@/lib/square-idempotency";

/**
 * Cancel a Square sub. Treat "already has a pending cancel date"
 * as success — a retry after an earlier partial attempt is
 * idempotent. Other errors bubble unless the caller asked us to
 * swallow them (addon-sub cancels).
 *
 * `label` goes into the log messages so multi-cancel loops can
 * be traced row-by-row.
 */
export async function cancelSubIdempotent(
  square: SquareClient,
  subscriptionId: string,
  label: string,
  { swallow = false }: { swallow?: boolean } = {},
): Promise<void> {
  try {
    await square.subscriptions.cancel({ subscriptionId });
  } catch (err) {
    const e = err as {
      errors?: { code?: string; detail?: string }[];
    };
    const detail = e?.errors?.[0]?.detail ?? "";
    if (detail.includes("already has a pending cancel date")) {
      console.log(
        `[square-rebuild] ${label} already cancelled — continuing`,
      );
      return;
    }
    console.error(`[square-rebuild] ${label} cancel failed:`, err);
    if (swallow) return;
    throw err;
  }
}

interface ScheduleAnnualRebuildParams {
  square: SquareClient;
  userId: string;
  customerId: string;
  cardId: string;
  currentSubscriptionId: string;
  /**
   * The currentPeriodEnd of the existing annual sub. The new
   * sub starts billing on this date, so there's no overlap.
   */
  effectiveDate: Date;
  /** Addon count AFTER the current change (+1 on add, -1 on remove). */
  newAddonCount: number;
  /**
   * If an earlier rebuild is still pending (user added a second
   * addon before the first rebuild activated), pass its sub id
   * here so we can cancel it before creating the replacement.
   */
  existingPendingSubId?: string | null;
}

export interface AnnualRebuildResult {
  newPendingSubId: string;
  /** Total Square will charge at renewal. */
  nextRenewalAmountCents: number;
  effectiveDate: Date;
}

/**
 * Orchestrate the scheduled-rebuild flow:
 *
 *  1. If an earlier pending rebuild exists, cancel it.
 *  2. Cancel the current base sub at its period end.
 *  3. Mint a custom order template for the new merged total.
 *  4. Create a new annual sub starting at `effectiveDate` with
 *     that template.
 *  5. Return the new sub id so the caller can stamp it into
 *     `pendingSquareSubId`.
 */
export async function scheduleAnnualRebuild(
  params: ScheduleAnnualRebuildParams,
): Promise<AnnualRebuildResult> {
  const {
    square,
    userId,
    customerId,
    cardId,
    currentSubscriptionId,
    effectiveDate,
    newAddonCount,
    existingPendingSubId,
  } = params;

  // 1. Cancel any earlier pending rebuild so we don't leave an
  //    orphan scheduled sub. Non-fatal — log and move on.
  if (existingPendingSubId) {
    await cancelSubIdempotent(
      square,
      existingPendingSubId,
      `pending ${existingPendingSubId}`,
      { swallow: true },
    );
  }

  // 2. Cancel the current base sub at period end. Idempotent
  //    against retries.
  await cancelSubIdempotent(square, currentSubscriptionId, "base");

  // 3. Mint the merged template. Idempotency key folds in the
  //    addon count so a re-run with the same count is safe
  //    (Square dedups on the idempotency key), but an adjacent
  //    rebuild with a different count gets its own template.
  const amountCents =
    ANNUAL_BASE_CENTS + ANNUAL_ADDON_CENTS * newAddonCount;
  const templateId = await createSubscriptionOrderTemplate(
    `untilThen Time Capsule — Annual + ${newAddonCount} capsule${newAddonCount === 1 ? "" : "s"}`,
    amountCents,
    `arb-${userId}-${newAddonCount}`,
  );

  // 4. Create the replacement sub. Start date = current period
  //    end so there's no double-charge. Idempotency stem:
  //    "arbs-<uid>-<count>" — short enough for the retry suffix.
  const startDate = effectiveDate.toISOString().slice(0, 10);
  const subResp = await retryOnIdempotencyReuse(
    `arbs-${userId}-${newAddonCount}`,
    (idempotencyKey) =>
      square.subscriptions.create({
        idempotencyKey,
        locationId: SQUARE_LOCATION_ID,
        planVariationId: SQUARE_PLAN_IDS.ANNUAL_BASE,
        customerId,
        cardId,
        startDate,
        timezone: "America/Chicago",
        phases: [{ ordinal: 0n, orderTemplateId: templateId }],
      }),
  );
  const newSub = subResp.subscription;
  if (!newSub?.id) {
    throw new Error(
      "scheduleAnnualRebuild: Square subscriptions.create returned no id",
    );
  }

  return {
    newPendingSubId: newSub.id,
    nextRenewalAmountCents: amountCents,
    effectiveDate,
  };
}
