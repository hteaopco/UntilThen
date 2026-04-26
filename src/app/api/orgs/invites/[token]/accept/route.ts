import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/orgs/invites/[token]/accept
 *
 * Claims a magic-link org invite. Caller must be signed in
 * (Clerk session). Two acceptance paths:
 *
 *   1. The invite email matches one of the caller's verified
 *      Clerk emails (primary or any secondary). Auto-claim:
 *      create the OrganizationMember row, mark invite ACCEPTED.
 *      This handles the personal-vs-work-email case described
 *      in the spec — the user signs up with personal email,
 *      then the work-email invite still works because Clerk
 *      stores both addresses on one account.
 *
 *   2. Email doesn't match any of the caller's Clerk emails.
 *      We don't auto-add it to Clerk silently; instead we
 *      return a 409 with addEmailRequired:true so the client
 *      can prompt "Add work@company.com to your account to
 *      claim this invite" and call Clerk's add-email API
 *      directly. Once added + verified, retry the accept.
 *
 * After successful claim:
 *   - OrganizationInvite.status → ACCEPTED
 *   - OrganizationInvite.acceptedUserId → User.id
 *   - OrganizationMember row exists with the invite's role
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { userId: clerkId } = auth();
  if (!clerkId)
    return NextResponse.json({ error: "Sign in to accept the invite." }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });

  const { token } = await ctx.params;

  const { prisma } = await import("@/lib/prisma");
  const invite = await prisma.organizationInvite.findUnique({
    where: { inviteToken: token },
    include: { organization: { select: { id: true, name: true } } },
  });
  if (!invite)
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  if (invite.status !== "PENDING")
    return NextResponse.json(
      { error: "This invite is no longer active." },
      { status: 410 },
    );

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, email: true },
  });
  if (!user)
    return NextResponse.json(
      { error: "Finish onboarding first." },
      { status: 404 },
    );

  // Look up the caller's Clerk emails. The invite is claim-able
  // if the invite.email matches ANY verified email on the
  // account, not just primary.
  let verifiedEmails: string[] = [];
  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(clerkId);
    verifiedEmails = clerkUser.emailAddresses
      .filter((e) => e.verification?.status === "verified")
      .map((e) => e.emailAddress.toLowerCase());
  } catch (err) {
    console.warn("[orgs/accept] clerk lookup failed:", err);
  }

  const inviteEmail = invite.email.toLowerCase();
  if (!verifiedEmails.includes(inviteEmail)) {
    return NextResponse.json(
      {
        error: `Add ${invite.email} to your account to claim this invite.`,
        addEmailRequired: true,
        email: invite.email,
      },
      { status: 409 },
    );
  }

  // Idempotent: if they're already in the org, just mark the
  // invite ACCEPTED and return success.
  const existingMembership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: invite.organizationId,
        userId: user.id,
      },
    },
  });

  if (!existingMembership) {
    await prisma.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId: user.id,
        role: invite.role,
      },
    });
  }

  await prisma.organizationInvite.update({
    where: { id: invite.id },
    data: {
      status: "ACCEPTED",
      acceptedAt: new Date(),
      acceptedUserId: user.id,
    },
  });

  // Mirror the verified email into User.email if it's still
  // null — keeps the avatar / contributor lookup pipeline
  // populated for users who came in via an org invite.
  if (!user.email) {
    await prisma.user
      .update({
        where: { id: user.id },
        data: { email: inviteEmail },
      })
      .catch(() => {
        /* unique-violation is fine; some other path filled it */
      });
  }

  return NextResponse.json({
    success: true,
    organizationId: invite.organizationId,
    organizationName: invite.organization.name,
    role: invite.role,
  });
}
