import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Recipient of a wedding capsule transfer accepts the hand-off.
 * Must be signed in. The signed-in Clerk email must match the
 * email the original organiser nominated — otherwise we 401 to
 * stop a leaked link from being claimed by an unrelated account.
 *
 * On success: in a single transaction we flip
 * MemoryCapsule.organiserId to the accepting user's local id,
 * mark the transfer ACCEPTED, and stamp acceptedUserId. The
 * original purchaser loses access on the next page render.
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { token } = await ctx.params;
  if (!token)
    return NextResponse.json({ error: "Missing token." }, { status: 400 });

  const { prisma } = await import("@/lib/prisma");
  const transfer = await prisma.capsuleTransfer.findUnique({
    where: { token },
    select: {
      id: true,
      capsuleId: true,
      toEmail: true,
      status: true,
    },
  });
  if (!transfer)
    return NextResponse.json({ error: "Transfer not found." }, { status: 404 });
  if (transfer.status !== "PENDING")
    return NextResponse.json({ error: "This invite has already been used." }, { status: 410 });

  // Verify the accepting user owns the email the organiser
  // nominated — primary or any verified secondary.
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const ownedEmails = new Set(
    clerkUser.emailAddresses
      .filter((e) => e.verification?.status === "verified")
      .map((e) => e.emailAddress.toLowerCase()),
  );
  if (!ownedEmails.has(transfer.toEmail.toLowerCase()))
    return NextResponse.json(
      {
        error:
          "This invite was sent to a different email. Sign in with the email the invite was addressed to.",
      },
      { status: 403 },
    );

  // Resolve the local User row — create if first sign-in.
  let localUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!localUser) {
    localUser = await prisma.user.create({
      data: {
        clerkId: userId,
        email: transfer.toEmail.toLowerCase(),
      },
      select: { id: true },
    });
  }

  await prisma.$transaction([
    prisma.memoryCapsule.update({
      where: { id: transfer.capsuleId },
      data: { organiserId: localUser.id },
    }),
    prisma.capsuleTransfer.update({
      where: { id: transfer.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedUserId: localUser.id,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, capsuleId: transfer.capsuleId });
}
