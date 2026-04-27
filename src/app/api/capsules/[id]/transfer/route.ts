import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { sendCapsuleTransferRequest } from "@/lib/capsule-emails";
import { findOwnedCapsule } from "@/lib/capsules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Body {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

/**
 * Wedding bride/groom hand-off: organiser nominates a new
 * manager (planner, MOH, parent) and we email a magic link
 * that the recipient clicks to take over. Until they accept,
 * the original organiser still owns the capsule.
 *
 * Cancels any prior PENDING transfer for the same capsule
 * before creating a new one — only one accept link can be
 * outstanding at a time so we don't have to disambiguate
 * which one a recipient is following.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const owned = await findOwnedCapsule(userId, id);
  if (!owned.ok)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }
  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const phone = (body.phone ?? "").trim() || null;

  if (!firstName) return NextResponse.json({ error: "First name is required." }, { status: 400 });
  if (!lastName) return NextResponse.json({ error: "Last name is required." }, { status: 400 });
  if (!email || !EMAIL_RE.test(email))
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  const { prisma } = await import("@/lib/prisma");
  const me = await prisma.user.findUnique({
    where: { id: owned.user.id },
    select: { email: true },
  });
  if ((me?.email ?? "").toLowerCase() === email)
    return NextResponse.json(
      { error: "You can't transfer the capsule to yourself." },
      { status: 400 },
    );

  const capsule = await prisma.memoryCapsule.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!capsule) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Atomically void any previous outstanding invite for this
  // capsule before creating the new one.
  const transfer = await prisma.$transaction(async (tx) => {
    await tx.capsuleTransfer.updateMany({
      where: { capsuleId: id, status: "PENDING" },
      data: { status: "CANCELED" },
    });
    return tx.capsuleTransfer.create({
      data: {
        capsuleId: id,
        fromUserId: owned.user.id,
        toEmail: email,
        toFirstName: firstName,
        toLastName: lastName,
        toPhone: phone,
      },
    });
  });

  // Best-effort email — surface from-name from Clerk for a
  // more personal subject line.
  try {
    const clerk = await clerkClient();
    const inviter = await clerk.users.getUser(userId);
    const fromName =
      [inviter.firstName, inviter.lastName].filter(Boolean).join(" ").trim() ||
      inviter.primaryEmailAddress?.emailAddress ||
      "Someone";
    const origin =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
    await sendCapsuleTransferRequest({
      to: email,
      toFirstName: firstName,
      fromName,
      capsuleTitle: capsule.title,
      acceptUrl: `${origin}/capsules/transfer-accept/${transfer.token}`,
    });
  } catch (err) {
    console.error("[capsule transfer] email send failed:", err);
  }

  return NextResponse.json({ ok: true, transferId: transfer.id });
}
