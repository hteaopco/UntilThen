import { NextResponse, type NextRequest } from "next/server";
import { WebhooksHelper } from "square";

import { captureServerEvent } from "@/lib/posthog-server";
import { nextFirstOfMonth, oneYearLater } from "@/lib/proration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Square webhook receiver. All Square-side async events (renewals,
 * declines, cancellations, refunds) land here and reconcile to our
 * Subscription + MemoryCapsule rows.
 *
 * Events we subscribe to (configure in the Square Dashboard:
 *  Developer → Apps → untilThen → Webhooks):
 *
 *   subscription.created        — confirm our row + stamp ACTIVE
 *   subscription.updated        — sync status changes (includes
 *                                 the CANCELED transition; there
 *                                 is no separate subscription.
 *                                 canceled event in Square)
 *   invoice.payment_failed      — flip to PAST_DUE + notify user
 *   payment.updated             — if a capsule-activation payment
 *                                 reverses (refund, dispute, etc.),
 *                                 re-lock the capsule
 *
 * Verification uses WebhooksHelper.verifySignature which hashes
 * the body + URL and compares to the x-square-hmacsha256-signature
 * header. If it doesn't match, we 401 without touching the DB —
 * refuses spoofed events.
 *
 * The handler is idempotent: it reads current DB state first and
 * only writes when the incoming event implies a change. Square
 * retries for up to ~3 days on non-2xx, so duplicate deliveries
 * are the norm rather than the exception.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl =
    process.env.SQUARE_WEBHOOK_URL ??
    "https://untilthenapp.io/api/webhooks/square";
  if (!signatureKey) {
    console.error("[webhooks/square] SQUARE_WEBHOOK_SIGNATURE_KEY not set");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const signatureHeader = req.headers.get("x-square-hmacsha256-signature");
  if (!signatureHeader) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  // Must read the raw body BEFORE JSON-parsing — Square computes
  // the signature over the exact bytes it sent. One char of
  // re-serialisation drift and verification fails.
  const rawBody = await req.text();

  let valid = false;
  try {
    valid = await WebhooksHelper.verifySignature({
      requestBody: rawBody,
      signatureHeader,
      signatureKey,
      notificationUrl,
    });
  } catch (err) {
    console.error("[webhooks/square] verify threw:", err);
  }
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(
    `[webhooks/square] ${event.type} event=${event.event_id ?? "?"}`,
  );

  try {
    switch (event.type) {
      case "subscription.created":
        await handleSubscriptionUpsert(event);
        break;
      case "subscription.updated":
        // Square emits a single updated event for every state
        // change, including cancellation. We branch on
        // subscription.status inside the handler rather than
        // listening for a separate subscription.canceled event
        // (which doesn't exist).
        await handleSubscriptionUpsert(event);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event);
        break;
      case "payment.updated":
        await handlePaymentUpdated(event);
        break;
      default:
        // Unsubscribed event types shouldn't hit this URL, but
        // ack silently if they do so Square doesn't retry.
        console.log(
          `[webhooks/square] ignoring unhandled event.type=${event.type}`,
        );
    }
  } catch (err) {
    console.error("[webhooks/square] handler threw:", err);
    // Return 500 so Square retries — once we fix the bug the
    // next retry picks it up.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ── Handlers ─────────────────────────────────────────────────

/**
 * Unified upsert for subscription.created + subscription.updated.
 *
 * Two lookup paths:
 *
 *   a) squareSubId matches → sync status / currentPeriodEnd on
 *      the user's current sub.
 *   b) pendingSquareSubId matches AND the incoming status is
 *      ACTIVE → the scheduled plan switch just activated.
 *      Promote pendingPlan + pendingSquareSubId into the primary
 *      fields and clear the pending slots.
 *
 * If neither matches (create webhook arrived before our /subscribe
 * route finished — rare but possible), we log and exit. Our
 * internal /subscribe call is the source of truth for the
 * userId ↔ squareSubId link; inventing a row from webhook data
 * risks orphaning it from the user.
 */
async function handleSubscriptionUpsert(event: WebhookEvent) {
  const sub = event.data?.object?.subscription;
  if (!sub?.id) {
    console.warn("[webhooks/square] subscription event missing id");
    return;
  }
  const { prisma } = await import("@/lib/prisma");
  const incomingStatus = mapSubscriptionStatus(sub.status);

  // Path (b): scheduled plan switch is activating. Check before
  // the primary squareSubId lookup so an upgraded sub that's also
  // in our DB somehow doesn't get handled as a normal status sync.
  const pendingMatch = await prisma.subscription.findUnique({
    where: { pendingSquareSubId: sub.id },
    select: {
      id: true,
      userId: true,
      plan: true,
      pendingPlan: true,
      pendingEffectiveDate: true,
    },
  });
  if (pendingMatch) {
    if (incomingStatus === "ACTIVE" && pendingMatch.pendingPlan) {
      const newPeriodEnd =
        pendingMatch.pendingPlan === "MONTHLY"
          ? nextFirstOfMonth(new Date())
          : oneYearLater(new Date());
      // Promoting to ANNUAL: the addons that were separate
      // monthly subs before the switch now live inside the new
      // base sub via priceOverrideMoney, so the addonSquareSubIds
      // array is stale. Wipe it. Promoting to MONTHLY: leave
      // addonSquareSubIds untouched (we don't currently support
      // monthly→annual→monthly carry-over of addons).
      const clearAddonIds =
        pendingMatch.pendingPlan === "ANNUAL"
          ? { addonSquareSubIds: [] }
          : {};
      await prisma.subscription.update({
        where: { id: pendingMatch.id },
        data: {
          squareSubId: sub.id,
          plan: pendingMatch.pendingPlan,
          status: "ACTIVE",
          currentPeriodEnd: newPeriodEnd,
          pendingPlan: null,
          pendingSquareSubId: null,
          pendingEffectiveDate: null,
          ...clearAddonIds,
        },
      });
      await captureServerEvent(
        `user:${pendingMatch.userId}`,
        "subscription_plan_switched",
        {
          from: pendingMatch.plan,
          to: pendingMatch.pendingPlan,
        },
      );
    }
    return;
  }

  // Path (a): normal status sync on the primary subscription.
  const existing = await prisma.subscription.findUnique({
    where: { squareSubId: sub.id },
    select: {
      id: true,
      userId: true,
      plan: true,
      status: true,
      currentPeriodEnd: true,
      pendingSquareSubId: true,
    },
  });
  if (!existing) {
    console.warn(
      `[webhooks/square] subscription ${sub.id} not found locally yet — skipping`,
    );
    return;
  }

  const updates: {
    status?: typeof existing.status;
    currentPeriodEnd?: Date;
  } = {};
  if (incomingStatus && incomingStatus !== existing.status) {
    // Skip a spurious CANCELLED flip when we have a pending
    // switch queued up — the old sub *is* cancelled in Square,
    // but our row should stay ACTIVE until the new sub promotes.
    // Otherwise the paywall engages mid-period.
    const skipCancel =
      incomingStatus === "CANCELLED" && existing.pendingSquareSubId;
    if (!skipCancel) {
      updates.status = incomingStatus;
    }
  }

  // On cancellation, pin currentPeriodEnd so UI copy can show
  // "access through <date>." If the Square subscription carries
  // a charged_through_date use that; otherwise fall back to our
  // computed next cycle edge.
  if (incomingStatus === "CANCELLED" && !existing.pendingSquareSubId) {
    const through =
      sub.charged_through_date ??
      sub.canceled_date ??
      null;
    if (through) {
      const parsed = new Date(through);
      if (!Number.isNaN(parsed.getTime())) {
        updates.currentPeriodEnd = parsed;
      }
    } else {
      // Fallback: compute the end of the current cycle.
      updates.currentPeriodEnd =
        existing.plan === "MONTHLY"
          ? nextFirstOfMonth(new Date())
          : oneYearLater(new Date());
    }
  }

  if (Object.keys(updates).length > 0) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: updates,
    });
    if (updates.status) {
      await captureServerEvent(
        `user:${existing.userId}`,
        "subscription_status_changed",
        {
          from: existing.status,
          to: updates.status,
          source: event.type,
        },
      );
    }
  }
}

async function handleInvoicePaymentFailed(event: WebhookEvent) {
  const invoice = event.data?.object?.invoice;
  const subId = invoice?.subscription_id;
  if (!subId) {
    console.warn(
      "[webhooks/square] invoice.payment_failed without subscription_id",
    );
    return;
  }
  const { prisma } = await import("@/lib/prisma");
  const sub = await prisma.subscription.findUnique({
    where: { squareSubId: subId },
    select: { id: true, userId: true, status: true },
  });
  if (!sub) {
    console.warn(
      `[webhooks/square] invoice.payment_failed for unknown sub ${subId}`,
    );
    return;
  }
  if (sub.status !== "PAST_DUE") {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "PAST_DUE" },
    });
    await captureServerEvent(
      `user:${sub.userId}`,
      "subscription_payment_failed",
      { invoiceId: invoice?.id ?? null },
    );
    // The ops layer for dunning emails lives in chunk 7 (not
    // built yet). For now we log loudly so we notice.
    console.warn(
      `[webhooks/square] subscription ${subId} → PAST_DUE (user=${sub.userId})`,
    );
  }
}

/**
 * Payment-level event. Our only concern here is reversals that
 * invalidate a Gift Capsule's $9.99 charge — if a payment we
 * recorded as paid gets refunded / canceled / failed after the
 * fact, revert the capsule's activation so the recipient doesn't
 * keep seeing an "active" capsule underneath a refunded charge.
 */
async function handlePaymentUpdated(event: WebhookEvent) {
  const payment = event.data?.object?.payment;
  if (!payment?.id || !payment.status) return;

  const terminalBadStatuses = new Set(["CANCELED", "FAILED"]);
  const hasRefund =
    (payment.refunded_money?.amount ?? 0) > 0 ||
    payment.refund_ids !== undefined && (payment.refund_ids?.length ?? 0) > 0;

  if (!terminalBadStatuses.has(payment.status) && !hasRefund) return;

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findFirst({
    where: { paymentId: payment.id },
    select: {
      id: true,
      organiserId: true,
      accessToken: true,
      isPaid: true,
      status: true,
    },
  });
  if (!capsule) {
    // Payment might have been against a subscription proration,
    // not a gift capsule — nothing to do on that side here.
    return;
  }
  if (!capsule.isPaid) return; // already reverted / never marked

  await prisma.memoryCapsule.update({
    where: { id: capsule.id },
    data: {
      isPaid: false,
      status: "DRAFT",
      paidAt: null,
    },
  });
  await captureServerEvent(
    `user:${capsule.organiserId}`,
    "capsule_payment_reversed",
    { capsuleId: capsule.id, paymentId: payment.id },
  );
  console.warn(
    `[webhooks/square] capsule ${capsule.id} reverted — payment ${payment.id} status=${payment.status}`,
  );
}

// ── Helpers ──────────────────────────────────────────────────

function mapSubscriptionStatus(
  incoming: string | undefined,
): "ACTIVE" | "CANCELLED" | "PAST_DUE" | "LOCKED" | null {
  if (!incoming) return null;
  switch (incoming.toUpperCase()) {
    case "ACTIVE":
      return "ACTIVE";
    case "CANCELED":
    case "CANCELLED":
    case "DEACTIVATED":
      return "CANCELLED";
    case "PAUSED":
    case "DELINQUENT":
      return "PAST_DUE";
    default:
      return null;
  }
}

// ── Types ────────────────────────────────────────────────────
// Square's webhook payload shape — only modelling the fields we
// actually touch. Everything else is untyped on purpose so the
// handler stays loose and resilient to extra keys.

type WebhookEvent = {
  merchant_id?: string;
  type?: string;
  event_id?: string;
  created_at?: string;
  data?: {
    type?: string;
    id?: string;
    object?: {
      subscription?: {
        id?: string;
        status?: string;
        charged_through_date?: string;
        canceled_date?: string;
        customer_id?: string;
      };
      invoice?: {
        id?: string;
        subscription_id?: string;
      };
      payment?: {
        id?: string;
        status?: string;
        reference_id?: string;
        refunded_money?: { amount?: number };
        refund_ids?: string[];
      };
    };
  };
};

