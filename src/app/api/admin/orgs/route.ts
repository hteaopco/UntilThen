import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only org provisioning. Sales/admin team manually
 * creates an Organization row + assigns an OWNER user via the
 * /admin/orgs page. Phase 1 has no self-serve org sign-up;
 * this endpoint is the sole creation path.
 *
 * POST body: { name, ownerEmail, billingContactEmail?, notes? }
 *   - Looks up the OWNER user by email (must already have an
 *     untilThen account). Returns 404 if not found — sales team
 *     asks the contact to sign up first, then retries.
 *   - Creates Organization + OrganizationMember(role: OWNER) in
 *     a single transaction. Idempotent on (name, ownerUserId)
 *     via the OrganizationMember unique constraint.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    ownerEmail?: string;
    billingContactEmail?: string;
    notes?: string;
  } | null;
  if (!body)
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const ownerEmail =
    typeof body.ownerEmail === "string"
      ? body.ownerEmail.trim().toLowerCase()
      : "";
  const billingContactEmail =
    typeof body.billingContactEmail === "string" &&
    body.billingContactEmail.trim()
      ? body.billingContactEmail.trim().toLowerCase()
      : null;
  const notes =
    typeof body.notes === "string" && body.notes.trim()
      ? body.notes.trim()
      : null;

  if (!name)
    return NextResponse.json({ error: "Org name required." }, { status: 400 });
  if (!ownerEmail)
    return NextResponse.json(
      { error: "Owner email required." },
      { status: 400 },
    );

  const { prisma } = await import("@/lib/prisma");
  const ownerUser = await prisma.user.findUnique({
    where: { email: ownerEmail },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!ownerUser)
    return NextResponse.json(
      {
        error:
          "No untilThen user matches that email. Ask the contact to sign up first, then retry.",
      },
      { status: 404 },
    );

  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: {
        name,
        billingContactEmail,
        notes,
      },
    });
    await tx.organizationMember.create({
      data: {
        organizationId: created.id,
        userId: ownerUser.id,
        role: "OWNER",
      },
    });
    return created;
  });

  await logAdminAction(
    req,
    "org.create",
    { type: "organization", id: org.id },
    { name: org.name, ownerEmail },
  );

  return NextResponse.json({ success: true, organizationId: org.id });
}

/** List all orgs for the admin /admin/orgs page. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ orgs: [] });

  const { prisma } = await import("@/lib/prisma");
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true, capsules: true } },
      members: {
        where: { role: "OWNER" },
        take: 1,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  return NextResponse.json({
    orgs: orgs.map((o) => ({
      id: o.id,
      name: o.name,
      billingContactEmail: o.billingContactEmail,
      notes: o.notes,
      memberCount: o._count.members,
      capsuleCount: o._count.capsules,
      ownerName:
        o.members[0]?.user.firstName + " " + (o.members[0]?.user.lastName ?? ""),
      ownerEmail: o.members[0]?.user.email ?? null,
      createdAt: o.createdAt.toISOString(),
    })),
  });
}
