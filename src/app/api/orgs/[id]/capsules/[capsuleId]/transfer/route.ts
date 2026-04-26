import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { sendOrgCapsuleTransferred } from "@/lib/emails";
import { requireOrgRole } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PostBody {
  toUserId?: string;
}

/**
 * POST /api/orgs/[id]/capsules/[capsuleId]/transfer
 *
 * Transfer an org-attributed capsule from one member to
 * another. OWNER-only — ADMIN can view but not transfer.
 *
 * Body: { toUserId: string } — destination user must be a
 * current member of the same org. The capsule's organiserId
 * is updated; the organizationId stays the same so the
 * org-link is preserved (still counts in usage reporting and
 * remains transferrable later).
 *
 * The recipient (in the email sense, the new organiser) gets
 * sendOrgCapsuleTransferred so they know they own it now.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; capsuleId: string }> },
): Promise<NextResponse> {
  const { userId: clerkId } = auth();
  if (!clerkId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 },
    );

  const { id: organizationId, capsuleId } = await ctx.params;
  const orgCtx = await requireOrgRole(clerkId, organizationId, "OWNER");
  if (!orgCtx)
    return NextResponse.json(
      { error: "Only the org OWNER can transfer capsules." },
      { status: 403 },
    );

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const toUserId = typeof body.toUserId === "string" ? body.toUserId : "";
  if (!toUserId)
    return NextResponse.json(
      { error: "toUserId required." },
      { status: 400 },
    );

  const { prisma } = await import("@/lib/prisma");

  // Capsule must exist + be attributed to this org.
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { id: capsuleId },
    select: { id: true, organizationId: true, organiserId: true, title: true },
  });
  if (!capsule || capsule.organizationId !== organizationId)
    return NextResponse.json(
      { error: "Capsule not found in this org." },
      { status: 404 },
    );

  if (capsule.organiserId === toUserId)
    return NextResponse.json(
      { error: "Capsule is already owned by that user." },
      { status: 400 },
    );

  // Destination must be a current member of the same org.
  const destMembership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId: toUserId },
    },
    include: {
      user: { select: { firstName: true, email: true } },
    },
  });
  if (!destMembership)
    return NextResponse.json(
      { error: "Destination user is not a member of this org." },
      { status: 400 },
    );

  await prisma.memoryCapsule.update({
    where: { id: capsule.id },
    data: { organiserId: toUserId },
  });

  // Best-effort notify. Failure here doesn't roll back the
  // transfer — the OWNER can re-send if needed.
  if (destMembership.user.email) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      });
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
      await sendOrgCapsuleTransferred({
        to: destMembership.user.email,
        newOrganiserName: destMembership.user.firstName,
        capsuleTitle: capsule.title,
        organizationName: org?.name ?? "your team",
        capsuleUrl: `${origin}/capsules/${capsule.id}`,
      });
    } catch (err) {
      console.warn("[orgs/transfer] email send failed:", err);
    }
  }

  return NextResponse.json({ success: true });
}
