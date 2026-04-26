import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { sendOrgInviteExisting, sendOrgInviteNew } from "@/lib/emails";
import { requireOrgRole } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: "ADMIN" | "MEMBER";
}

interface PostBody {
  invites?: InviteInput[];
}

/**
 * POST /api/orgs/[id]/invites
 *
 * Bulk-add (or single-add) employees to the org. ADMIN+ only.
 * Each input row goes through three branches:
 *
 *   1. Already a member of this org → skip silently.
 *   2. Email matches an existing User (primary or any verified
 *      Clerk email) → auto-join + send "heads-up" email. No
 *      OrganizationInvite row is needed since they're already
 *      in.
 *   3. New email → create OrganizationInvite (PENDING) + send
 *      magic-link "set up your account" email. Accept flow at
 *      POST /api/orgs/invites/[token]/accept finishes the join.
 *
 * Phase 1 caps role choices to ADMIN/MEMBER (OWNER can't be
 * granted via invite — only by /admin/orgs).
 *
 * Returns counts so the client can show a summary
 * ("3 added, 2 already in org, 1 invite sent").
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId: clerkId } = auth();
  if (!clerkId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 },
    );

  const { id: organizationId } = await ctx.params;
  const orgCtx = await requireOrgRole(clerkId, organizationId, "ADMIN");
  if (!orgCtx)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawInvites = Array.isArray(body.invites) ? body.invites : [];
  const normalised = rawInvites
    .map((i) => ({
      email:
        typeof i?.email === "string" ? i.email.trim().toLowerCase() : "",
      firstName:
        typeof i?.firstName === "string" && i.firstName.trim()
          ? i.firstName.trim()
          : null,
      lastName:
        typeof i?.lastName === "string" && i.lastName.trim()
          ? i.lastName.trim()
          : null,
      phone:
        typeof i?.phone === "string" && i.phone.trim()
          ? i.phone.trim()
          : null,
      role: i?.role === "ADMIN" ? "ADMIN" : "MEMBER",
    }))
    .filter((i) => EMAIL_RE.test(i.email));

  if (normalised.length === 0)
    return NextResponse.json(
      { error: "No valid invitee emails." },
      { status: 400 },
    );

  // Dedup the input itself in case the CSV has duplicates.
  const seenInput = new Set<string>();
  const unique = normalised.filter((i) => {
    if (seenInput.has(i.email)) return false;
    seenInput.add(i.email);
    return true;
  });

  const { prisma } = await import("@/lib/prisma");
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!org)
    return NextResponse.json({ error: "Org not found." }, { status: 404 });

  // Inviter name for the email body. Best-effort — Clerk lookup
  // can hiccup; falls back to "Your team."
  let inviterName = "Your team";
  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(clerkId);
    inviterName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      "Your team";
  } catch {
    /* */
  }

  // Pre-fetch all existing memberships + Users so we can branch
  // each row in one pass.
  const emails = unique.map((i) => i.email);
  const existingUsers = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  });
  const userByEmail = new Map<string, { id: string; email: string | null }>();
  for (const u of existingUsers) {
    if (u.email) userByEmail.set(u.email.toLowerCase(), u);
  }

  const existingMembers = await prisma.organizationMember.findMany({
    where: {
      organizationId,
      userId: { in: existingUsers.map((u) => u.id) },
    },
    select: { userId: true },
  });
  const memberUserIds = new Set(existingMembers.map((m) => m.userId));

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";

  let addedExistingUsers = 0;
  let createdInvites = 0;
  let alreadyInOrg = 0;
  let sentEmails = 0;
  const errors: string[] = [];

  for (const i of unique) {
    const matchedUser = userByEmail.get(i.email);
    try {
      if (matchedUser) {
        if (memberUserIds.has(matchedUser.id)) {
          alreadyInOrg++;
          continue;
        }
        // Existing untilThen user — auto-join, no token flow.
        await prisma.organizationMember.create({
          data: {
            organizationId,
            userId: matchedUser.id,
            role: i.role as "ADMIN" | "MEMBER",
          },
        });
        addedExistingUsers++;
        try {
          await sendOrgInviteExisting({
            to: i.email,
            organizationName: org.name,
            inviterName,
            dashboardUrl: `${origin}/home`,
          });
          sentEmails++;
        } catch (err) {
          console.warn("[orgs/invites] heads-up send failed:", err);
        }
      } else {
        // New email — create invite + send accept link.
        const invite = await prisma.organizationInvite.upsert({
          where: {
            organizationId_email: {
              organizationId,
              email: i.email,
            },
          },
          create: {
            organizationId,
            email: i.email,
            firstName: i.firstName,
            lastName: i.lastName,
            phone: i.phone,
            role: i.role as "ADMIN" | "MEMBER",
          },
          update: {
            // Refresh metadata + role on the existing PENDING row.
            // We don't reset inviteToken so the original email
            // link stays valid.
            firstName: i.firstName,
            lastName: i.lastName,
            phone: i.phone,
            role: i.role as "ADMIN" | "MEMBER",
            status: "PENDING",
          },
        });
        createdInvites++;
        try {
          await sendOrgInviteNew({
            to: i.email,
            organizationName: org.name,
            inviterName,
            acceptUrl: `${origin}/enterprise/invite/${invite.inviteToken}`,
          });
          sentEmails++;
        } catch (err) {
          console.warn("[orgs/invites] accept-link send failed:", err);
        }
      }
    } catch (err) {
      console.error("[orgs/invites] per-row error:", i.email, err);
      errors.push(i.email);
    }
  }

  return NextResponse.json({
    success: true,
    addedExistingUsers,
    createdInvites,
    alreadyInOrg,
    sentEmails,
    errors,
  });
}
