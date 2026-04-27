import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { validateImportRows } from "@/lib/employee-import";
import { requireOrgRole } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/orgs/[id]/employees/import
 *
 * Body:
 *   {
 *     mode: "OVERWRITE" | "ADD_NEW",
 *     rows: object[],          // raw parsed CSV rows
 *     deleteIds?: string[]     // for OVERWRITE only — the explicit
 *                              // employee IDs to mark DELETED.
 *                              // The client built this list from
 *                              // /import/preview's toDelete and the
 *                              // user's deselect choices.
 *   }
 *
 * Behaviour:
 *
 *   ADD_NEW
 *     - Insert rows whose email isn't already in the org.
 *     - Existing rows (by email) are silently left untouched.
 *
 *   OVERWRITE
 *     - Insert rows whose email isn't already in the org.
 *     - Existing rows (by email) get their non-email fields
 *       updated to the upload's values.
 *     - Every employee id in deleteIds is flipped to status
 *       DELETED + inactivatedAt stamped. The client guarantees
 *       these IDs were sourced from the diff; we still verify
 *       each belongs to this org before flipping.
 *
 * One transaction per import — partial commits aren't useful;
 * if anything trips, the org sees zero churn.
 */
export async function POST(
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

  let body: {
    mode?: "OVERWRITE" | "ADD_NEW";
    rows?: unknown;
    deleteIds?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.mode !== "OVERWRITE" && body.mode !== "ADD_NEW") {
    return NextResponse.json(
      { error: "mode must be OVERWRITE or ADD_NEW." },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.rows)) {
    return NextResponse.json(
      { error: "Body must include rows: []." },
      { status: 400 },
    );
  }

  const { rows, errors } = validateImportRows(body.rows);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Some rows are invalid; fix and re-upload.", errors },
      { status: 400 },
    );
  }

  const deleteIds: string[] = Array.isArray(body.deleteIds)
    ? body.deleteIds.filter((v): v is string => typeof v === "string")
    : [];

  const { prisma } = await import("@/lib/prisma");
  const existing = await prisma.organizationEmployee.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { id: true, email: true },
  });
  const existingByEmail = new Map(existing.map((e) => [e.email, e.id]));

  const inserts: typeof rows = [];
  const updates: { id: string; data: (typeof rows)[number] }[] = [];
  for (const r of rows) {
    const existingId = existingByEmail.get(r.email);
    if (existingId) {
      if (body.mode === "OVERWRITE") {
        updates.push({ id: existingId, data: r });
      }
      // ADD_NEW: skip duplicates silently.
    } else {
      inserts.push(r);
    }
  }

  // Verify deleteIds all belong to this org's ACTIVE pool. Anything
  // that doesn't is silently dropped — possible if the user's
  // preview is stale (someone else mutated the roster between the
  // preview and the commit). Better to drop than to delete the
  // wrong rows.
  const safeDeleteIds = existing
    .filter((e) => deleteIds.includes(e.id))
    .map((e) => e.id);

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    let inserted = 0;
    let updated = 0;
    let deleted = 0;

    if (inserts.length > 0) {
      const created = await tx.organizationEmployee.createMany({
        data: inserts.map((r) => ({
          organizationId,
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
          phone: r.phone,
          department: r.department,
          subTeam: r.subTeam,
        })),
        // skipDuplicates protects against a race where another
        // import landed between our existing-pool read and the
        // insert — Postgres unique violation would otherwise
        // abort the whole transaction.
        skipDuplicates: true,
      });
      inserted = created.count;
    }

    for (const u of updates) {
      await tx.organizationEmployee.update({
        where: { id: u.id },
        data: {
          firstName: u.data.firstName,
          lastName: u.data.lastName,
          phone: u.data.phone,
          department: u.data.department,
          subTeam: u.data.subTeam,
          // Email is the natural key — leave it alone on update
          // even though the row in the upload uses the same
          // address (case can differ, but we lowercased earlier).
        },
      });
      updated++;
    }

    if (body.mode === "OVERWRITE" && safeDeleteIds.length > 0) {
      const flipped = await tx.organizationEmployee.updateMany({
        where: { id: { in: safeDeleteIds }, organizationId },
        data: { status: "DELETED", inactivatedAt: now },
      });
      deleted = flipped.count;
    }

    return { inserted, updated, deleted };
  });

  return NextResponse.json({ success: true, ...result });
}
