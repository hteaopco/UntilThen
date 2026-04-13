import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findOwned(clerkUserId: string, contributorId: string) {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
  if (!user) return { error: 404 as const, user: null, contributor: null };
  const contributor = await prisma.contributor.findUnique({
    where: { id: contributorId },
    include: { vault: { include: { child: true } } },
  });
  if (!contributor) return { error: 404 as const, user, contributor: null };
  if (contributor.vault.child.parentId !== user.id)
    return { error: 403 as const, user, contributor: null };
  return { user, contributor };
}

interface PatchBody {
  name?: string | null;
  role?: string;
  requiresApproval?: boolean;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database unreachable." }, { status: 500 });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const owned = await findOwned(userId, id);
  if (owned.error === 404 || !owned.contributor)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (owned.error === 403)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const data: Record<string, unknown> = {};
  if ("name" in body) {
    data.name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : null;
  }
  if (
    typeof body.role === "string" &&
    ["FAMILY", "FRIEND", "TEACHER", "OTHER"].includes(body.role)
  ) {
    data.role = body.role;
  }
  if (typeof body.requiresApproval === "boolean") {
    data.requiresApproval = body.requiresApproval;
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.contributor.update({ where: { id }, data });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contributors PATCH] error:", err);
    return NextResponse.json(
      { error: "Couldn't update contributor." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database unreachable." }, { status: 500 });
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const owned = await findOwned(userId, id);
  if (owned.error === 404 || !owned.contributor)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (owned.error === 403)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  try {
    const { prisma } = await import("@/lib/prisma");
    // Revoke by status change; keep their existing entries in the
    // vault (brief requirement).
    await prisma.contributor.update({
      where: { id },
      data: { status: "REVOKED" },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contributors DELETE] error:", err);
    return NextResponse.json(
      { error: "Couldn't revoke contributor." },
      { status: 500 },
    );
  }
}
