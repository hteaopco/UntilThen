import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { captureServerEvent } from "@/lib/posthog-server";
import { calculateProration, nextFirstOfMonth, oneYearLater } from "@/lib/proration";
import {
  SQUARE_LOCATION_ID,
  SQUARE_PLAN_IDS,
  getSquareClient,
  squareIsConfigured,
} from "@/lib/square";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  plan?: unknown;
  sourceId?: unknown;
};

/**
 * POST /api/payments/subscribe
 *
 * Signs the user up for the Time Capsule subscription. Takes a
 * one-time card nonce (`sourceId`) from the Square Web Payments
 * SDK and:
 *
 *   1. Creates the Square Customer if we don't have one yet
 *      (reuses it on any subsequent re-subscribe).
 *   2. Saves the card on file, returning a reusable cardId.
 *   3. Monthly plan only: charges the prorated amount today via
 *      payments.create against the saved card, so the subscriber
 *      pays for the rest of the current month even though the
 *      Square subscription itself doesn't start until the 1st.
 *   4. Creates the Square Subscription:
 *        - MONTHLY → startDate = 1st of next month, renews the 1st
 *        - ANNUAL  → startDate = today, renews same date next year.
 *          Full $35.99 charged by Square at subscription start,
 *          no proration (Square can't prorate annual cadences).
 *   5. Writes the DB Subscription row and stamps
 *      User.squareCustomerId.
 *
 * Idempotency: the subscription idempotency key is locked to
 * userId so a page-refresh retry can't create a second Square
 * subscription. The proration charge uses its own key bound to
 * the same day.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 },
    );
  }
  if (!squareIsConfigured()) {
    return NextResponse.json(
      { error: "Payments aren't configured yet." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const plan = body.plan;
  if (plan !== "MONTHLY" && plan !== "ANNUAL") {
    return NextResponse.json(
      { error: "plan must be MONTHLY or ANNUAL." },
      { status: 400 },
    );
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
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      squareCustomerId: true,
      subscription: {
        select: { id: true, status: true },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (user.subscription && user.subscription.status === "ACTIVE") {
    return NextResponse.json(
      { error: "You already have an active subscription." },
      { status: 409 },
    );
  }

  // Grab the user's email from Clerk so the Square Customer
  // record carries a usable contact. Fall back to the Clerk-side
  // primary email; if neither is set we still create the customer
  // without an email — Square allows it.
  let email: string | null = null;
  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      null;
  } catch {
    /* non-fatal */
  }

  const square = getSquareClient();

  try {
    // 1. Ensure Square Customer.
    let squareCustomerId = user.squareCustomerId;
    if (!squareCustomerId) {
      const customerResp = await square.customers.create({
        idempotencyKey: `customer-${user.id}`,
        givenName: user.firstName,
        familyName: user.lastName,
        emailAddress: email ?? undefined,
        referenceId: user.id,
      });
      const c = customerResp.customer;
      if (!c?.id) {
        throw new Error("Square customer create returned no id.");
      }
      squareCustomerId = c.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { squareCustomerId },
      });
    }

    // 2. Save card on file.
    const cardResp = await square.cards.create({
      // Square caps idempotency_key at 45 chars. "crd-" + cuid
      // (25) + "-" + base36 timestamp (~8) = ~38 chars. The
      // timestamp ensures a new card entry generates a new key
      // (so repeat subscribe attempts after an explicit cancel
      // don't get Square's cached response for the old card).
      idempotencyKey: `crd-${user.id}-${Date.now().toString(36)}`,
      sourceId,
      card: {
        customerId: squareCustomerId,
        referenceId: user.id,
      },
    });
    const cardId = cardResp.card?.id;
    if (!cardId) {
      throw new Error("Square card create returned no id.");
    }

    const now = new Date();

    // 3. Monthly proration — charge upfront. Annual skips this
    //    entirely; Square charges the full $35.99 when it
    //    processes the subscription start.
    if (plan === "MONTHLY") {
      const { amountTodayCents } = calculateProration(
        { plan: "MONTHLY", type: "new" },
        now,
      );
      if (amountTodayCents > 0) {
        // Stable per user per day — dash-stripped date (YYYYMMDD)
        // keeps the key under Square's 45-char idempotency limit:
        // "sp-" (3) + cuid (25) + "-" (1) + "YYYYMMDD" (8) = 37.
        const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");
        const payResp = await square.payments.create({
          idempotencyKey: `sp-${user.id}-${yyyymmdd}`,
          sourceId: cardId,
          customerId: squareCustomerId,
          amountMoney: {
            amount: BigInt(amountTodayCents),
            currency: "USD",
          },
          locationId: SQUARE_LOCATION_ID,
          note: "untilThen subscription · prorated start",
          referenceId: user.id,
        });
        if (payResp.payment?.status !== "COMPLETED") {
          return NextResponse.json(
            {
              error:
                "Your card was declined. Please try a different card.",
            },
            { status: 402 },
          );
        }
      }
    }

    // 4. Create the Square Subscription.
    const planVariationId =
      plan === "MONTHLY"
        ? SQUARE_PLAN_IDS.MONTHLY_BASE
        : SQUARE_PLAN_IDS.ANNUAL_BASE;
    const startDate =
      plan === "MONTHLY"
        ? nextFirstOfMonth(now).toISOString().slice(0, 10)
        : now.toISOString().slice(0, 10);

    const subResp = await square.subscriptions.create({
      idempotencyKey: `sub-${user.id}`,
      locationId: SQUARE_LOCATION_ID,
      planVariationId,
      customerId: squareCustomerId,
      cardId,
      startDate,
      timezone: "America/Chicago",
    });
    const squareSub = subResp.subscription;
    if (!squareSub?.id) {
      throw new Error("Square subscription create returned no id.");
    }

    // 5. Persist to DB.
    const currentPeriodEnd =
      plan === "MONTHLY" ? nextFirstOfMonth(now) : oneYearLater(now);

    await prisma.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        squareSubId: squareSub.id,
        plan,
        status: "ACTIVE",
        baseCapsuleCount: 3,
        addonCapsuleCount: 0,
        currentPeriodEnd,
      },
      update: {
        squareSubId: squareSub.id,
        plan,
        status: "ACTIVE",
        currentPeriodEnd,
      },
    });

    await captureServerEvent(userId, "subscription_started", {
      plan,
      userId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const e = err as {
      errors?: { code?: string; detail?: string }[];
      message?: string;
    };
    const code = e?.errors?.[0]?.code ?? "";
    console.error("[payments/subscribe] error:", code, e?.message ?? e);
    if (
      code === "CARD_DECLINED" ||
      code === "GENERIC_DECLINE" ||
      code === "TRANSACTION_LIMIT"
    ) {
      return NextResponse.json(
        { error: "Your card was declined. Please try a different card." },
        { status: 402 },
      );
    }
    if (code === "INSUFFICIENT_FUNDS") {
      return NextResponse.json(
        { error: "Insufficient funds. Please try a different card." },
        { status: 402 },
      );
    }
    if (code.startsWith("INVALID_") || code === "VERIFY_CVV_FAILURE") {
      return NextResponse.json(
        { error: "Card details are invalid. Please check and try again." },
        { status: 402 },
      );
    }
    return NextResponse.json(
      { error: "We couldn't start your subscription. Please try again." },
      { status: 500 },
    );
  }
}
