import { auth } from "@clerk/nextjs/server";
import { EmployeeStatus, Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { requireOrgRole } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/orgs/[id]/employees
 *
 * Lists OrganizationEmployee rows for the org. ADMIN+ only.
 *
 * Query params:
 *   status      ACTIVE | ARCHIVED | DELETED   (default ACTIVE)
 *   q           free-text search across firstName, lastName, email
 *   sort        name | lastName | department | subTeam | createdAt
 *               (default lastName)
 *   dir         asc | desc                    (default asc)
 *   page        1-based page number           (default 1)
 *   pageSize    50 | 100 | 250 | 500          (default 50)
 *
 * Returns the page of rows + total count + the available
 * department + subTeam values (for the picker's group-by chips).
 */
export async function GET(
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

  const sp = req.nextUrl.searchParams;
  const status = parseStatus(sp.get("status"));
  const q = (sp.get("q") ?? "").trim();
  const sort = parseSort(sp.get("sort"));
  const dir: "asc" | "desc" = sp.get("dir") === "desc" ? "desc" : "asc";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = parsePageSize(sp.get("pageSize"));

  const where: Prisma.OrganizationEmployeeWhereInput = {
    organizationId,
    status,
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy = buildOrderBy(sort, dir);

  const { prisma } = await import("@/lib/prisma");
  const [rows, total, allActive] = await Promise.all([
    prisma.organizationEmployee.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.organizationEmployee.count({ where }),
    // Department / subTeam options come from the ACTIVE pool
    // regardless of the current view's status filter, so the
    // group-by chips don't disappear when the user toggles to
    // Archived / Deleted.
    prisma.organizationEmployee.findMany({
      where: { organizationId, status: "ACTIVE" },
      select: { department: true, subTeam: true },
      distinct: ["department", "subTeam"],
    }),
  ]);

  const departments = Array.from(
    new Set(allActive.map((r) => r.department).filter(Boolean) as string[]),
  ).sort((a, b) => a.localeCompare(b));
  const subTeams = Array.from(
    new Set(allActive.map((r) => r.subTeam).filter(Boolean) as string[]),
  ).sort((a, b) => a.localeCompare(b));

  return NextResponse.json({
    rows: rows.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      phone: r.phone,
      department: r.department,
      subTeam: r.subTeam,
      status: r.status,
      inactivatedAt: r.inactivatedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    departments,
    subTeams,
  });
}

function parseStatus(v: string | null): EmployeeStatus {
  if (v === "ARCHIVED" || v === "DELETED") return v;
  return "ACTIVE";
}

const VALID_SORTS = [
  "firstName",
  "lastName",
  "department",
  "subTeam",
  "createdAt",
] as const;
type Sort = (typeof VALID_SORTS)[number];
function parseSort(v: string | null): Sort {
  if (v === "name") return "firstName";
  return (VALID_SORTS as readonly string[]).includes(v ?? "")
    ? (v as Sort)
    : "lastName";
}

function buildOrderBy(
  sort: Sort,
  dir: "asc" | "desc",
): Prisma.OrganizationEmployeeOrderByWithRelationInput[] {
  // Stable secondary sort keeps pagination deterministic.
  if (sort === "lastName") {
    return [{ lastName: dir }, { firstName: dir }];
  }
  if (sort === "firstName") {
    return [{ firstName: dir }, { lastName: dir }];
  }
  return [{ [sort]: dir }, { lastName: "asc" }];
}

function parsePageSize(v: string | null): number {
  const n = parseInt(v ?? "50", 10);
  if (n === 100 || n === 250 || n === 500) return n;
  return 50;
}
