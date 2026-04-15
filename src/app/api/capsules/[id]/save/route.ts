import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { sendCapsuleSaved } from "@/lib/capsule-emails";
import { captureServerEvent } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  token?: string;
}

/**
 * Recipient signs up / signs in with Clerk, then hits this route
 * to permanently link the capsule to their account. After this,
 * they can revisit without the magic link.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }
  const token = typeof body.token === "string" ? body.token : "";

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { id },
    include: { organiser: { select: { clerkId: true } } },
  });
  if (!capsule)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  // Require the magic token on the save call too — stops a
  // logged-in attacker from claiming random capsules.
  if (capsule.accessToken !== token)
    return NextResponse.json({ error: "Invalid link." }, { status: 401 });

  await prisma.memoryCapsule.update({
    where: { id },
    data: { recipientClerkId: userId },
  });

  await captureServerEvent(userId, "capsule_account_created", {
    capsuleId: id,
  });

  // Let the organiser know — warm loop back.
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const clerk = await clerkClient();
    const organiserClerk = await clerk.users.getUser(
      capsule.organiser.clerkId,
    );
    const organiserEmail =
      organiserClerk.primaryEmailAddress?.emailAddress ??
      organiserClerk.emailAddresses[0]?.emailAddress;
    if (organiserEmail) {
      await sendCapsuleSaved({
        to: organiserEmail,
        recipientName: capsule.recipientName,
        title: capsule.title,
      });
    }
  } catch (err) {
    console.error("[capsule save] organiser notify:", err);
  }

  return NextResponse.json({ success: true });
}
