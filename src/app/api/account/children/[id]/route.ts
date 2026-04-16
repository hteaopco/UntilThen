import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PatchBody = {
  firstName?: string;
  dateOfBirth?: string | null;
  revealDate?: string | null;
  trusteeName?: string | null;
  trusteeEmail?: string | null;
};

async function requireOwnership(clerkUserId: string, childId: string) {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });
  if (!user) return { error: "User not found.", status: 404 as const };
  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { id: true, parentId: true, vault: { select: { id: true } } },
  });
  if (!child) return { error: "Child not found.", status: 404 as const };
  if (child.parentId !== user.id)
    return { error: "Forbidden.", status: 403 as const };
  return { user, child };
}

function parseDate(value: unknown): Date | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
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

  const childData: Record<string, unknown> = {};
  if (typeof body.firstName === "string") {
    const v = body.firstName.trim();
    if (!v)
      return NextResponse.json(
        { error: "Child's name is required." },
        { status: 400 },
      );
    childData.firstName = v;
  }
  if ("dateOfBirth" in body) {
    const d = parseDate(body.dateOfBirth);
    if (d === undefined)
      return NextResponse.json(
        { error: "Invalid date of birth." },
        { status: 400 },
      );
    childData.dateOfBirth = d;
  }
  if ("trusteeName" in body) {
    const v =
      typeof body.trusteeName === "string" ? body.trusteeName.trim() : "";
    childData.trusteeName = v.length > 0 ? v : null;
  }
  if ("trusteeEmail" in body) {
    const v =
      typeof body.trusteeEmail === "string" ? body.trusteeEmail.trim() : "";
    childData.trusteeEmail = v.length > 0 ? v : null;
  }

  const { prisma } = await import("@/lib/prisma");
  await prisma.child.update({ where: { id }, data: childData });

  // Reveal date lives on the vault; update separately when provided.
  if ("revealDate" in body && result.child.vault) {
    const d = parseDate(body.revealDate);
    if (d === undefined)
      return NextResponse.json(
        { error: "Invalid reveal date." },
        { status: 400 },
      );
    await prisma.vault.update({
      where: { id: result.child.vault.id },
      data: { revealDate: d },
    });
  }

  revalidatePath("/account/capsules");
  revalidatePath(`/account/capsules/${id}`);
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

  // Manual cascade in the right order so we don't trip foreign-key
  // constraints: entries → collections → contributors → vault → child.
  if (result.child.vault) {
    await prisma.entry.deleteMany({ where: { vaultId: result.child.vault.id } });
    await prisma.collection.deleteMany({
      where: { vaultId: result.child.vault.id },
    });
    await prisma.contributor.deleteMany({
      where: { vaultId: result.child.vault.id },
    });
    await prisma.vault.delete({ where: { id: result.child.vault.id } });
  }
  await prisma.child.delete({ where: { id } });

  revalidatePath("/account/capsules");
  revalidatePath("/dashboard");
  return NextResponse.json({ success: true });
}
