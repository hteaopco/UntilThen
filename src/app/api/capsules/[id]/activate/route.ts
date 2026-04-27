import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import {
  findOwnedCapsule,
  priceCentsForOccasion,
  RECIPIENT_TOKEN_TTL_MS,
} from "@/lib/capsules";
import { sendCapsuleInvite } from "@/lib/capsule-emails";
import { userHasGiftAccess } from "@/lib/paywall";
import { captureServerEvent } from "@/lib/posthog-server";
import {
  SQUARE_LOCATION_ID,
  getSquareClient,
  squareIsConfigured,
} from "@/lib/square";
import { retryOnIdempotencyReuse } from "@/lib/square-idempotency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Activate a Gift Capsule + charge the organiser's card in a
 * single atomic transition.
 *
 * Body:
 *   {
 *     sourceId?: string,  // Square card nonce — required when the
 *                         // paywall is on and the organiser doesn't
 *                         // have User.freeGiftAccess. Ignored
 *                         // otherwise.
 *   }
 *
 * Recipient contact is captured during the creation flow
 * (CapsuleCreationFlow.tsx) and persisted on the capsule row at
 * that point, so this route only needs to confirm at least one
 * channel is present before charging.
 *
 * Flow:
 *   1. Ownership + DRAFT-state checks
 *   2. Confirm capsule has at least one recipient contact channel
 *   3. If payment required → charge $9.99 via Square
 *      (idempotent on capsuleId + userId)
 *   4. Flip the capsule to ACTIVE + promote STAGED invites,
 *      dispatch invite emails, fire analytics
 *
 * Splitting payment into a separate endpoint would let a
 * successful charge strand without activation (or vice-versa) if
 * one side failed, so they stay coupled.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  const { id } = await ctx.params;
  const owned = await findOwnedCapsule(userId ?? null, id);
  if (!owned.ok)
    return NextResponse.json({ error: "Not found." }, { status: owned.status });
  const capsule = owned.capsule;

  if (capsule.status !== "DRAFT" || capsule.isPaid) {
    return NextResponse.json({
      success: true,
      alreadyActive: true,
    });
  }

  let sourceId: string | null = null;
  try {
    const body = (await req.json().catch(() => null)) as {
      sourceId?: unknown;
    } | null;
    if (body && typeof body.sourceId === "string" && body.sourceId.trim()) {
      sourceId = body.sourceId.trim();
    }
  } catch {
    /* noop */
  }

  // Defensive guard — creation-time validation should already
  // prevent capsules without contact from existing, but check
  // again before we charge.
  if (!capsule.recipientEmail && !capsule.recipientPhone) {
    return NextResponse.json(
      {
        error:
          "Add a way to reach your recipient — an email or phone number — before activating.",
      },
      { status: 400 },
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    // Resolve payment requirement before any DB writes — we'd
    // rather reject a free-activation attempt than walk back a
    // status flip. Org-attributed capsules (enterprise loss-
    // leader channel) are billed to the organisation upstream;
    // the user never goes through Square here.
    const dbUser = owned.user;
    const hasFree = await userHasGiftAccess(dbUser.id);
    const paymentRequired = !hasFree && !capsule.organizationId;

    // Charge via Square when payment is required. Idempotency
    // key is stable per capsule+user so a client retry won't
    // double-charge. Any Square failure short-circuits before
    // the activation transaction so a declined card leaves the
    // capsule in DRAFT, untouched.
    let paymentId: string | null = null;
    let paidAt: Date | null = null;
    if (paymentRequired) {
      if (!squareIsConfigured()) {
        return NextResponse.json(
          {
            error:
              "Payments aren't configured yet. Try again soon or contact support.",
          },
          { status: 503 },
        );
      }
      if (!sourceId) {
        return NextResponse.json(
          { error: "Card details are required to send this capsule." },
          { status: 400 },
        );
      }
      try {
        const client = getSquareClient();
        // Per-occasion authoritative price. WEDDING = $99.00,
        // everything else = $9.99. Server is the source of truth;
        // the client just sends sourceId.
        const priceCents = priceCentsForOccasion(capsule.occasionType);
        const productLabel =
          capsule.occasionType === "WEDDING"
            ? "Wedding Capsule"
            : "Gift Capsule";
        // "gc-{capsuleId}" — stable per capsule so refreshes
        // don't double-charge. Reuse-retry covers the case where
        // a prior failed attempt cached the key against a
        // different sourceId / note.
        const response = await retryOnIdempotencyReuse(
          `gc-${id}`,
          (idempotencyKey) =>
            client.payments.create({
              idempotencyKey,
              sourceId,
              amountMoney: {
                amount: BigInt(priceCents),
                currency: "USD",
              },
              locationId: SQUARE_LOCATION_ID || undefined,
              note: `untilThen ${productLabel} · ${capsule.title}`.slice(0, 500),
              referenceId: id,
            }),
        );
        const payment = response.payment;
        if (!payment || payment.status !== "COMPLETED") {
          return NextResponse.json(
            {
              error:
                "Payment didn't complete. Please try a different card or contact support.",
            },
            { status: 402 },
          );
        }
        paymentId = payment.id ?? null;
        paidAt = new Date();
      } catch (err) {
        return NextResponse.json(
          { error: mapSquareError(err) },
          { status: 402 },
        );
      }
    }

    // Token expiry is 30 days past the reveal date so the
    // recipient's magic link stays valid for a month after the
    // capsule opens.
    const tokenExpiresAt = new Date(
      capsule.revealDate.getTime() + RECIPIENT_TOKEN_TTL_MS,
    );

    // Atomic flip: capsule → ACTIVE + every STAGED invite →
    // PENDING. Doing both in one transaction means a partial
    // failure can't leave staged rows behind a paid capsule.
    const [, stagedInvites] = await prisma.$transaction([
      prisma.memoryCapsule.update({
        where: { id },
        data: {
          status: "ACTIVE",
          isPaid: true,
          paymentId,
          paidAt,
          tokenExpiresAt,
        },
      }),
      prisma.capsuleInvite.findMany({
        where: { capsuleId: id, status: "STAGED" },
      }),
      prisma.capsuleInvite.updateMany({
        where: { capsuleId: id, status: "STAGED" },
        data: { status: "PENDING" },
      }),
    ]);

    await captureServerEvent(userId ?? "anonymous", "capsule_activated", {
      capsuleId: id,
      invitesDispatched: stagedInvites.length,
    });

    // Dispatch invite emails for every freshly-promoted STAGED
    // row. The organiser's "you're live" confirmation was removed
    // — the dashboard already reflects the live state the moment
    // activation completes, so the email was redundant noise.
    // Failures here are best-effort — the invite rows are already
    // PENDING so a manual resend can pick them up later.
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId!);
      const organiserName = clerkUser.firstName ?? "Someone";

      for (const invite of stagedInvites) {
        await sendCapsuleInvite({
          to: invite.email,
          contributorName: invite.name,
          organiserName,
          title: capsule.title,
          recipientName: capsule.recipientName,
          revealDate: capsule.revealDate,
          inviteToken: invite.inviteToken,
        });
      }
    } catch (err) {
      console.error("[capsules activate] post-activate emails:", err);
    }

    return NextResponse.json({
      success: true,
      invitesDispatched: stagedInvites.length,
    });
  } catch (err) {
    console.error("[capsules activate] error:", err);
    return NextResponse.json(
      { error: "Couldn't activate the capsule." },
      { status: 500 },
    );
  }
}

/**
 * Turn a Square client error into a recipient-facing message.
 * The SDK surfaces its first error code on `errors[0].code`; we
 * map the handful we expect to see on a one-time card charge.
 */
function mapSquareError(err: unknown): string {
  const e = err as {
    errors?: { code?: string; detail?: string }[];
    message?: string;
  };
  const code = e?.errors?.[0]?.code ?? "";
  switch (code) {
    case "CARD_DECLINED":
    case "GENERIC_DECLINE":
    case "TRANSACTION_LIMIT":
      return "Your card was declined. Please try a different card.";
    case "INVALID_CARD":
    case "INVALID_EXPIRATION":
    case "INVALID_EXPIRATION_DATE":
    case "INVALID_EXPIRATION_YEAR":
    case "INVALID_CARD_DATA":
    case "VERIFY_CVV_FAILURE":
      return "Card details are invalid. Please check and try again.";
    case "INSUFFICIENT_FUNDS":
      return "Insufficient funds. Please try a different card.";
    default:
      console.error("[capsules activate] square error:", code, e);
      return "Payment failed. Please try again or contact support.";
  }
}
