import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { validateImportRows } from "@/lib/employee-import";
import { requireOrgRole } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/orgs/[id]/employees/import/preview
 *
 * Body: { rows: object[] } — already parsed from the uploaded CSV
 * by the client. Pre-flight diff against the org's current ACTIVE
 * employees:
 *
 *   - errors        — per-row validation problems (row #, field, msg)
 *   - newRows       — rows whose email isn't already in ACTIVE pool
 *   - duplicates    — rows whose email IS already in ACTIVE pool;
 *                     includes the existing id so the client can
 *                     show "will update" vs "will skip" depending
 *                     on the chosen import mode.
 *   - toDelete      — ACTIVE employees NOT present in the upload.
 *                     Only relevant for OVERWRITE mode; the client
 *                     renders these as a deselectable list (default
 *                     all-checked) and sends back the explicit IDs
 *                     to delete on commit.
 *
 * No database writes. Pure read + diff.
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

  let body: { rows?: unknown };
  try {
    body = (await req.json()) as { rows?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body.rows)) {
    return NextResponse.json(
      { error: "Body must include rows: []." },
      { status: 400 },
    );
  }

  const { rows, errors } = validateImportRows(body.rows);

  const { prisma } = await import("@/lib/prisma");
  const existing = await prisma.organizationEmployee.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  const existingByEmail = new Map(existing.map((e) => [e.email, e]));

  const newRows: typeof rows = [];
  const duplicates: { row: number; existingId: string; email: string }[] = [];
  const importedEmails = new Set<string>();
  rows.forEach((r, i) => {
    importedEmails.add(r.email);
    const match = existingByEmail.get(r.email);
    if (match) {
      duplicates.push({ row: i + 1, existingId: match.id, email: r.email });
    } else {
      newRows.push(r);
    }
  });

  const toDelete = existing
    .filter((e) => !importedEmails.has(e.email))
    .map((e) => ({
      id: e.id,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
    }));

  return NextResponse.json({
    errors,
    newRows,
    duplicates,
    toDelete,
    counts: {
      total: body.rows.length,
      valid: rows.length,
      errors: errors.length,
      newRows: newRows.length,
      duplicates: duplicates.length,
      toDelete: toDelete.length,
    },
  });
}
