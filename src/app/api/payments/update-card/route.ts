import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { backfillAddonSquareSubIds } from "@/lib/addon-backfill";
import { captureServerEvent } from "@/lib/posthog-server";
import { getSquareClient, squareIsConfigured } from "@/lib/square";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { sourceId?: unknown };

/**
 * POST /api/payments/update-card
 *
 * Replace the card on file. Rule: every active Square sub (base
 * + addons) must point at the SAME card at all times. So this
 * endpoint runs as a pseudo-transaction:
 *
 *   1. Tokenize the new card (client-side) and POST us the nonce.
 *   2. cards.create → new cardId.
 *   3. For every sub id on file (base + addonSquareSubIds[]),
 *      call subscriptions.update { cardId: new }.
 *   4. If any update throws, revert every already-flipped sub
 *      back to the old cardId, then cards.disable the new card,
 *      and return an error.
 *   5. Happy path: cards.disable the old card, stamp
 *      User.squareCardId/Brand/Last4 with the new values, return
 *      the summary for the UI.
 *
 * Works for ACTIVE, CANCELLED, and PAST_DUE subscribers — all
 * of them need a way to keep their card current (cancelled users
 * may want to resubscribe later; past-due need to clear the
 * failed invoice).
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 },
    );
  if (!squareIsConfigured())
    return NextResponse.json(
      { error: "Payments aren't configured yet." },
      { status: 503 },
    );

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const sourceId =
    typeof body.sourceId === "string" && body.sourceId.trim()
      ? body.sourceId.trim()
      : null;
  if (!sourceId) {
    return NextResponse.json(
      { error: "Card details are required." },
      { status: 400 },
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const lookupUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!lookupUser)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Opportunistic backfill so the sub-id list covers every
  // legacy addon not tracked at purchase time.
  await backfillAddonSquareSubIds(lookupUser.id);

  const user = await prisma.user.findUnique({
    where: { id: lookupUser.id },
    select: {
      id: true,
      squareCustomerId: true,
      squareCardId: true,
      subscription: {
        select: {
          id: true,
          squareSubId: true,
          status: true,
          addonSquareSubIds: true,
          pendingSquareSubId: true,
        },
      },
    },
  });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (!user.squareCustomerId)
    return NextResponse.json(
      { error: "No Square customer on file. Start a subscription first." },
      { status: 409 },
    );

  const square = getSquareClient();

  // 1. Save the new card.
  let newCardId: string | undefined;
  let newCardBrand: string | null = null;
  let newCardLast4: string | null = null;
  try {
    // Unique key per update attempt so retrying with a fresh
    // nonce spawns a fresh card row on the customer. "upd-" (4)
    // + cuid (25) + "-" (1) + base36 timestamp (~8) = ~38.
    const cardResp = await square.cards.create({
      idempotencyKey: `upd-${user.id}-${Date.now().toString(36)}`,
      sourceId,
      card: {
        customerId: user.squareCustomerId,
        referenceId: user.id,
      },
    });
    newCardId = cardResp.card?.id;
    newCardBrand = cardResp.card?.cardBrand ?? null;
    newCardLast4 = cardResp.card?.last4 ?? null;
    if (!newCardId) throw new Error("Square card create returned no id.");
  } catch (err) {
    const code = (err as { errors?: { code?: string }[] })?.errors?.[0]?.code;
    console.error("[payments/update-card] card create failed:", code, err);
    const message =
      code === "CARD_DECLINED" ||
      code === "GENERIC_DECLINE" ||
      code === "INVALID_CARD_DATA"
        ? "Card details are invalid or the card was declined."
        : "Couldn't save the new card. Please try again.";
    return NextResponse.json({ error: message }, { status: 402 });
  }

  // 2. Collect every active Square sub we need to repoint.
  const subIds: string[] = [];
  if (user.subscription?.squareSubId) subIds.push(user.subscription.squareSubId);
  if (user.subscription?.pendingSquareSubId)
    subIds.push(user.subscription.pendingSquareSubId);
  if (user.subscription?.addonSquareSubIds?.length) {
    subIds.push(...user.subscription.addonSquareSubIds);
  }

  const oldCardId = user.squareCardId;
  const flipped: string[] = [];

  try {
    for (const subId of subIds) {
      await square.subscriptions.update({
        subscriptionId: subId,
        subscription: { cardId: newCardId },
      });
      flipped.push(subId);
    }
  } catch (err) {
    // Roll back flipped subs to the old card. Best-effort — if a
    // rollback itself throws we log and keep going so the user
    // isn't left in a totally broken state.
    console.error(
      "[payments/update-card] sub update failed, rolling back:",
      err,
    );
    if (oldCardId) {
      for (const subId of flipped) {
        try {
          await square.subscriptions.update({
            subscriptionId: subId,
            subscription: { cardId: oldCardId },
          });
        } catch (revertErr) {
          console.error(
            `[payments/update-card] rollback failed for ${subId}:`,
            revertErr,
          );
        }
      }
    }
    // Retire the new card that we're abandoning.
    try {
      await square.cards.disable({ cardId: newCardId });
    } catch {
      /* non-fatal */
    }
    return NextResponse.json(
      {
        error:
          "We couldn't update the card on all your subscriptions. Nothing was changed. Please try again.",
      },
      { status: 502 },
    );
  }

  // 3. Retire the old card now that every sub is on the new one.
  if (oldCardId && oldCardId !== newCardId) {
    try {
      await square.cards.disable({ cardId: oldCardId });
    } catch (err) {
      // Don't fail the user on a stale-card cleanup error.
      console.warn(
        "[payments/update-card] old card disable failed:",
        err,
      );
    }
  }

  // 4. Persist the new card on User.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      squareCardId: newCardId,
      squareCardBrand: newCardBrand,
      squareCardLast4: newCardLast4,
    },
  });

  await captureServerEvent(userId, "payment_card_updated", {
    subsUpdated: subIds.length,
    brand: newCardBrand,
  });

  return NextResponse.json({
    success: true,
    card: {
      brand: newCardBrand,
      last4: newCardLast4,
    },
  });
}
