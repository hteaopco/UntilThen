import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { findOwnedCapsule, RECIPIENT_TOKEN_TTL_MS } from "@/lib/capsules";
import { sendCapsuleActivated } from "@/lib/capsule-emails";
import { captureServerEvent } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Activate a capsule once payment settles.
 *
 * TODO: Square payment — $9.99 one-time. Until Square is wired
 * up, any authenticated organiser can call this and the capsule
 * flips to ACTIVE. When Square lands, verify the payment on
 * the server before flipping `isPaid`.
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

  // Optional client-provided payment reference. Accept anything
  // for now so the front end can pass a placeholder / receipt id
  // once Square is in.
  let paymentId: string | null = null;
  try {
    const body = (await req.json().catch(() => null)) as {
      paymentId?: unknown;
    } | null;
    if (body && typeof body.paymentId === "string" && body.paymentId.trim()) {
      paymentId = body.paymentId.trim();
    }
  } catch {
    /* noop */
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    // Token expiry is 30 days past the reveal date so the
    // recipient's magic link stays valid for a month after the
    // capsule opens.
    const tokenExpiresAt = new Date(
      capsule.revealDate.getTime() + RECIPIENT_TOKEN_TTL_MS,
    );
    await prisma.memoryCapsule.update({
      where: { id },
      data: {
        status: "ACTIVE",
        isPaid: true,
        paymentId,
        tokenExpiresAt,
      },
    });

    await captureServerEvent(userId ?? "anonymous", "capsule_activated", {
      capsuleId: id,
    });

    // Activated confirmation to the organiser. Invite email
    // count comes from the separate /invites route; this one
    // just says the capsule is live.
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId!);
      const organiserEmail =
        clerkUser.primaryEmailAddress?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress;
      if (organiserEmail) {
        const pendingInvites = await prisma.capsuleInvite.count({
          where: { capsuleId: id },
        });
        const origin =
          process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
        await sendCapsuleActivated({
          to: organiserEmail,
          title: capsule.title,
          recipientName: capsule.recipientName,
          revealDate: capsule.revealDate,
          contributorCount: pendingInvites,
          dashboardUrl: `${origin}/capsules/${id}`,
        });
      }
    } catch (err) {
      console.error("[capsules activate] activated email:", err);
    }

    // TODO: schedule the reveal-day email (sendCapsuleRevealDay)
    // to fire at capsule.revealDate. Needs a job runner /
    // scheduled Railway task — deferred for v1.

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[capsules activate] error:", err);
    return NextResponse.json(
      { error: "Couldn't activate the capsule." },
      { status: 500 },
    );
  }
}
