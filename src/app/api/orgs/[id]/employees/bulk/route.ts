import { auth } from "@clerk/nextjs/server";
import { EmployeeStatus, Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { requireOrgRole } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/orgs/[id]/employees/bulk
 *
 * Body: { ids: string[], updates: { department?, subTeam?, status? } }
 *
 * Bulk-edits a set of selected rows. Only fields where overwrite-
 * everyone-with-the-same-value makes sense are bulk-editable:
 *
 *   - department  (set or clear)
 *   - subTeam     (set or clear)
 *   - status      (move many rows to ARCHIVED / DELETED / ACTIVE
 *                  in one shot — used by the Archive selected /
 *                  Delete selected / Restore selected actions)
 *
 * Personal fields (first/last name, email, phone) are deliberately
 * excluded — bulk-stamping a name across many people is almost
 * always a mistake. Use the per-row PATCH for those.
 *
 * The id list is constrained to rows belonging to this org so a
 * malicious caller can't mutate another org's roster by passing
 * arbitrary IDs.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId: clerkId } = auth();
  if (!clerkId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id: organizationId } = await ctx.params;
  const orgCtx = await requireOrgRole(clerkId, organizationId, "ADMIN");
  if (!orgCtx)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { ids?: unknown; updates?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((v): v is string => typeof v === "string")
    : [];
  if (ids.length === 0) {
    return NextResponse.json(
      { error: "ids must be a non-empty string array." },
      { status: 400 },
    );
  }

  const updates =
    body.updates && typeof body.updates === "object"
      ? (body.updates as Record<string, unknown>)
      : {};

  const data: Prisma.OrganizationEmployeeUpdateManyMutationInput = {};

  if (
    Object.prototype.hasOwnProperty.call(updates, "department") &&
    (updates.department === null || typeof updates.department === "string")
  ) {
    data.department =
      typeof updates.department === "string" && updates.department.trim()
        ? updates.department.trim().slice(0, 120)
        : null;
  }
  if (
    Object.prototype.hasOwnProperty.call(updates, "subTeam") &&
    (updates.subTeam === null || typeof updates.subTeam === "string")
  ) {
    data.subTeam =
      typeof updates.subTeam === "string" && updates.subTeam.trim()
        ? updates.subTeam.trim().slice(0, 120)
        : null;
  }
  if (typeof updates.status === "string") {
    const valid: EmployeeStatus[] = ["ACTIVE", "ARCHIVED", "DELETED"];
    if (!valid.includes(updates.status as EmployeeStatus)) {
      return NextResponse.json(
        { error: "status must be ACTIVE, ARCHIVED, or DELETED." },
        { status: 400 },
      );
    }
    const next = updates.status as EmployeeStatus;
    data.status = next;
    data.inactivatedAt = next === "ACTIVE" ? null : new Date();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No bulk-editable fields supplied." },
      { status: 400 },
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const result = await prisma.organizationEmployee.updateMany({
    where: { id: { in: ids }, organizationId },
    data,
  });

  return NextResponse.json({ success: true, updated: result.count });
}
