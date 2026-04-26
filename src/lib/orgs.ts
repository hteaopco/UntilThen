import { prisma } from "@/lib/prisma";
import type { OrganizationRole } from "@prisma/client";

export type OrgContext = {
  organizationId: string;
  organizationName: string;
  role: OrganizationRole;
};

/**
 * Resolve the current viewer's primary organization membership.
 * A user can technically belong to multiple orgs (the schema
 * allows it for future flexibility), but Phase 1 surfaces only
 * the most-recently-joined membership so the dashboard's
 * Enterprise tab + capsule attribution logic stay simple.
 *
 * Returns null when the user isn't an org member or doesn't
 * exist locally yet.
 */
export async function getOrgContextByClerkId(
  clerkId: string,
): Promise<OrgContext | null> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  if (!user) return null;

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    orderBy: { joinedAt: "desc" },
    include: { organization: { select: { id: true, name: true } } },
  });
  if (!membership) return null;

  return {
    organizationId: membership.organization.id,
    organizationName: membership.organization.name,
    role: membership.role,
  };
}

/**
 * Same as getOrgContextByClerkId but takes the local User.id.
 * Skip the Clerk lookup when the caller already has the user
 * row in hand.
 */
export async function getOrgContextByUserId(
  userId: string,
): Promise<OrgContext | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: "desc" },
    include: { organization: { select: { id: true, name: true } } },
  });
  if (!membership) return null;

  return {
    organizationId: membership.organization.id,
    organizationName: membership.organization.name,
    role: membership.role,
  };
}

/**
 * Throw-style guard for API routes. Returns the org context if
 * the user is in the given org with at least the required role;
 * returns null otherwise (caller responds with 403/404).
 *
 * Role rank: OWNER > ADMIN > MEMBER. A required role of "ADMIN"
 * accepts ADMIN + OWNER; "MEMBER" accepts everyone.
 */
const ROLE_RANK: Record<OrganizationRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1,
};

export async function requireOrgRole(
  clerkId: string,
  organizationId: string,
  minimumRole: OrganizationRole,
): Promise<OrgContext | null> {
  const ctx = await getOrgContextByClerkId(clerkId);
  if (!ctx) return null;
  if (ctx.organizationId !== organizationId) return null;
  if (ROLE_RANK[ctx.role] < ROLE_RANK[minimumRole]) return null;
  return ctx;
}
