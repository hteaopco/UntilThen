import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { captureServerEvent } from "@/lib/posthog-server";
import { calculateProration, nextFirstOfMonth, oneYearLater } from "@/lib/proration";
import {
  SQUARE_LOCATION_ID,
  SQUARE_ORDER_TEMPLATE_IDS,
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

    // 2. Get or save card on file. Reuse an existing saved card
    //    if the user already has one — otherwise creating a new
    //    card on every retry would:
    //      a) clutter the customer with duplicate cards, and
    //      b) change the sourceId on the proration payment, which
    //         trips Square's idempotency key reuse check on retry
    //         (same key, different request parameters = 400).
    let cardId: string | undefined;
    const existingCards = await square.cards.list({
      customerId: squareCustomerId,
    });
    const existingCard = (existingCards.data ?? []).find(
      (c) => c.enabled !== false,
    );
    if (existingCard?.id) {
      cardId = existingCard.id;
    } else {
      const cardResp = await square.cards.create({
        // Stable key per user — retries return the same card
        // instead of spawning duplicates. "crd-" (4) + cuid (25) = 29.
        idempotencyKey: `crd-${user.id}`,
        sourceId,
        card: {
          customerId: squareCustomerId,
          referenceId: user.id,
        },
      });
      cardId = cardResp.card?.id;
      if (!cardId) {
        throw new Error("Square card create returned no id.");
      }
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
        try {
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
        } catch (err) {
          // If Square tells us the key was already used, a
          // prior attempt already ran the charge — treat that
          // as success and proceed to subscription creation so
          // the user isn't locked out after a half-completed
          // first attempt.
          const code = (err as { errors?: { code?: string }[] })
            .errors?.[0]?.code;
          if (code !== "IDEMPOTENCY_KEY_REUSED") throw err;
          console.log(
            `[payments/subscribe] proration already charged for ${user.id} today — skipping`,
          );
        }
      }
    }

    // 4. Create the Square Subscription.
    const planVariationId =
      plan === "MONTHLY"
        ? SQUARE_PLAN_IDS.MONTHLY_BASE
        : SQUARE_PLAN_IDS.ANNUAL_BASE;
    const orderTemplateId =
      plan === "MONTHLY"
        ? SQUARE_ORDER_TEMPLATE_IDS.MONTHLY_BASE
        : SQUARE_ORDER_TEMPLATE_IDS.ANNUAL_BASE;
    if (!orderTemplateId) {
      console.error(
        `[payments/subscribe] SQUARE_ORDER_TEMPLATE_${plan}_BASE not set — run /admin/settings → Create order templates first`,
      );
      return NextResponse.json(
        {
          error:
            "Payments aren't set up correctly yet. Please reach out — our team has been notified.",
        },
        { status: 503 },
      );
    }
    const startDate =
      plan === "MONTHLY"
        ? nextFirstOfMonth(now).toISOString().slice(0, 10)
        : now.toISOString().slice(0, 10);

    // Stable key gives clean idempotency for normal retries. But
    // if a prior attempt cached this key against DIFFERENT params
    // (classic case: first attempt sent the wrong plan variation
    // id, we fixed it, user retries), Square 400s with
    // IDEMPOTENCY_KEY_REUSED. Catch that single case and retry
    // once with a fresh key — we know the cached request errored,
    // so Square never actually created a subscription under it.
    const subPayload = {
      locationId: SQUARE_LOCATION_ID,
      planVariationId,
      customerId: squareCustomerId,
      cardId,
      startDate,
      timezone: "America/Chicago",
      // RELATIVE-priced plan variations need the subscription to
      // supply the real dollar amount via an order template.
      // Passing by ordinal only — Square matches it against the
      // plan variation's single phase.
      phases: [{ ordinal: 0n, orderTemplateId }],
    };
    let subResp;
    try {
      subResp = await square.subscriptions.create({
        idempotencyKey: `sub-${user.id}`,
        ...subPayload,
      });
    } catch (err) {
      const code = (err as { errors?: { code?: string }[] })
        .errors?.[0]?.code;
      if (code !== "IDEMPOTENCY_KEY_REUSED") throw err;
      console.log(
        `[payments/subscribe] sub idempotency key reused for ${user.id} — retrying with fresh key`,
      );
      // "sub-" (4) + cuid (25) + "-" (1) + base36 timestamp (~8) = ~38.
      subResp = await square.subscriptions.create({
        idempotencyKey: `sub-${user.id}-${Date.now().toString(36)}`,
        ...subPayload,
      });
    }
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
    const detail = e?.errors?.[0]?.detail ?? "";
    console.error(
      "[payments/subscribe] error:",
      code,
      detail,
      e?.message ?? e,
    );
    // Misconfigured Square plan variation IDs — bubble up a
    // clearer message for the UI instead of the generic retry
    // prompt. Almost always means the SQUARE_PLAN_* env vars
    // point at plan IDs, not plan variation IDs.
    if (
      code === "BAD_REQUEST" &&
      detail.includes("SUBSCRIPTION_PLAN_VARIATION")
    ) {
      return NextResponse.json(
        {
          error:
            "Payments aren't set up correctly yet. Please reach out — our team has been notified.",
        },
        { status: 503 },
      );
    }
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
