import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Role = "FAMILY" | "FRIEND" | "TEACHER" | "OTHER";

type PatchBody = {
  name?: string | null;
  role?: Role;
  requiresApproval?: boolean;
};

async function requireOwnership(clerkUserId: string, contributorId: string) {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    include: { children: { include: { vault: true } } },
  });
  if (!user) return { error: "User not found.", status: 404 as const };

  const contributor = await prisma.contributor.findUnique({
    where: { id: contributorId },
  });
  if (!contributor)
    return { error: "Contributor not found.", status: 404 as const };

  const ownsVault = user.children.some(
    (c) => c.vault?.id === contributor.vaultId,
  );
  if (!ownsVault) return { error: "Forbidden.", status: 403 as const };
  return { contributor };
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { id } = await ctx.params;
  const result = await requireOwnership(userId, id);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: result.status });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if ("name" in body) {
    const v = typeof body.name === "string" ? body.name.trim() : "";
    data.name = v.length > 0 ? v : null;
  }
  if (body.role) {
    if (!["FAMILY", "FRIEND", "TEACHER", "OTHER"].includes(body.role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }
    data.role = body.role;
  }
  if (typeof body.requiresApproval === "boolean") {
    data.requiresApproval = body.requiresApproval;
  }

  const { prisma } = await import("@/lib/prisma");
  await prisma.contributor.update({ where: { id }, data });
  revalidatePath("/account/contributors");
  revalidatePath("/dashboard");
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { id } = await ctx.params;
  const result = await requireOwnership(userId, id);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: result.status });

  const { prisma } = await import("@/lib/prisma");
  // Flip to REVOKED rather than hard-delete so any entries they
  // submitted keep their contributor relation. PENDING invites
  // that were never accepted are safe to hard-delete.
  if (result.contributor.status === "PENDING") {
    await prisma.contributor.delete({ where: { id } });
  } else {
    await prisma.contributor.update({
      where: { id },
      data: { status: "REVOKED" },
    });
  }
  revalidatePath("/account/contributors");
  revalidatePath("/dashboard");
  return NextResponse.json({ success: true });
}
