import { auth } from "@clerk/nextjs/server";
import { EmployeeStatus, Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { requireOrgRole } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/orgs/[id]/employees/[employeeId]
 *
 * Edits a single employee row. Any subset of the editable fields
 * may appear; missing fields are left untouched.
 *
 *   firstName, lastName, email, phone, department, subTeam, status
 *
 * Email gets lowercased + trimmed and verified for format. Status
 * transitions stamp inactivatedAt: setting ARCHIVED or DELETED
 * fills it; setting ACTIVE clears it.
 *
 * Server-side org-membership check on every call so a member of
 * org A can never edit org B's employees by guessing the URL.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; employeeId: string }> },
): Promise<NextResponse> {
  const { userId: clerkId } = auth();
  if (!clerkId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id: organizationId, employeeId } = await ctx.params;
  const orgCtx = await requireOrgRole(clerkId, organizationId, "ADMIN");
  if (!orgCtx)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const existing = await prisma.organizationEmployee.findUnique({
    where: { id: employeeId },
    select: { organizationId: true, status: true },
  });
  if (!existing || existing.organizationId !== organizationId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const data: Prisma.OrganizationEmployeeUpdateInput = {};

  if (typeof body.firstName === "string") {
    const v = body.firstName.trim();
    if (!v)
      return NextResponse.json(
        { error: "firstName cannot be blank." },
        { status: 400 },
      );
    data.firstName = v.slice(0, 80);
  }
  if (typeof body.lastName === "string") {
    const v = body.lastName.trim();
    if (!v)
      return NextResponse.json(
        { error: "lastName cannot be blank." },
        { status: 400 },
      );
    data.lastName = v.slice(0, 80);
  }
  if (typeof body.email === "string") {
    const v = body.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v))
      return NextResponse.json(
        { error: "email format invalid." },
        { status: 400 },
      );
    data.email = v.slice(0, 200);
  }
  if (body.phone === null || typeof body.phone === "string") {
    data.phone =
      typeof body.phone === "string" && body.phone.trim()
        ? body.phone.trim().slice(0, 40)
        : null;
  }
  if (body.department === null || typeof body.department === "string") {
    data.department =
      typeof body.department === "string" && body.department.trim()
        ? body.department.trim().slice(0, 120)
        : null;
  }
  if (body.subTeam === null || typeof body.subTeam === "string") {
    data.subTeam =
      typeof body.subTeam === "string" && body.subTeam.trim()
        ? body.subTeam.trim().slice(0, 120)
        : null;
  }

  if (typeof body.status === "string") {
    const valid: EmployeeStatus[] = ["ACTIVE", "ARCHIVED", "DELETED"];
    if (!valid.includes(body.status as EmployeeStatus)) {
      return NextResponse.json(
        { error: "status must be ACTIVE, ARCHIVED, or DELETED." },
        { status: 400 },
      );
    }
    const next = body.status as EmployeeStatus;
    data.status = next;
    data.inactivatedAt = next === "ACTIVE" ? null : new Date();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No editable fields supplied." },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.organizationEmployee.update({
      where: { id: employeeId },
      data,
    });
    return NextResponse.json({
      success: true,
      employee: {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        phone: updated.phone,
        department: updated.department,
        subTeam: updated.subTeam,
        status: updated.status,
        inactivatedAt: updated.inactivatedAt?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Another employee already uses this email." },
        { status: 409 },
      );
    }
    console.error("[employees PATCH] error:", err);
    return NextResponse.json(
      { error: "Couldn't update the employee." },
      { status: 500 },
    );
  }
}
