import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchBody {
  name?: string;
  billingContactEmail?: string | null;
  notes?: string | null;
}

/**
 * PATCH /api/admin/orgs/[id]
 *
 * Admin-only edit for the three Organization metadata fields:
 * name, billingContactEmail, notes. Phase 1 doesn't allow
 * changing the OWNER through this endpoint — sales would do
 * that by inviting the new owner via /enterprise then deleting
 * the old OrganizationMember row in the DB. Building out a
 * proper "transfer ownership" flow is a follow-up.
 *
 * Body field semantics:
 *   - name: required when present, trimmed.
 *   - billingContactEmail: pass null/empty string to clear,
 *     pass a string to set. Lowercased + trimmed at write.
 *   - notes: same null-to-clear pattern.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 },
    );

  const { id } = await ctx.params;
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, string | null> = {};

  if ("name" in body) {
    if (typeof body.name !== "string" || !body.name.trim())
      return NextResponse.json(
        { error: "Org name can't be empty." },
        { status: 400 },
      );
    data.name = body.name.trim();
  }
  if ("billingContactEmail" in body) {
    const v = body.billingContactEmail;
    data.billingContactEmail =
      typeof v === "string" && v.trim() ? v.trim().toLowerCase() : null;
  }
  if ("notes" in body) {
    const v = body.notes;
    data.notes = typeof v === "string" && v.trim() ? v.trim() : null;
  }

  if (Object.keys(data).length === 0)
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const { prisma } = await import("@/lib/prisma");
  const existing = await prisma.organization.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing)
    return NextResponse.json({ error: "Org not found." }, { status: 404 });

  await prisma.organization.update({ where: { id }, data });

  await logAdminAction(
    req,
    "org.update",
    { type: "organization", id },
    { fields: Object.keys(data) },
  );

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/orgs/[id]
 *
 * Hard-delete an Organization. Cascades:
 *   - OrganizationMember rows → deleted (FK ON DELETE CASCADE)
 *   - OrganizationInvite rows → deleted (FK ON DELETE CASCADE)
 *   - MemoryCapsule.organizationId → set to NULL (FK ON DELETE
 *     SET NULL). Capsules themselves stay on the user's
 *     personal account per spec.
 *
 * Per Phase 1 there's no soft-delete / archive — used only for
 * mistakes during sales provisioning. Real deprovisioning needs
 * a follow-up that handles billing wind-down + member-side
 * notification.
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 },
    );

  const { id } = await ctx.params;
  const { prisma } = await import("@/lib/prisma");
  const existing = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!existing)
    return NextResponse.json({ error: "Org not found." }, { status: 404 });

  await prisma.organization.delete({ where: { id } });

  await logAdminAction(
    req,
    "org.delete",
    { type: "organization", id },
    { name: existing.name },
  );

  return NextResponse.json({ success: true });
}
