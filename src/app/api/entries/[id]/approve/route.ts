import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function decision(
  userId: string,
  entryId: string,
  next: "APPROVED" | "REJECTED",
): Promise<NextResponse> {
  const { prisma } = await import("@/lib/prisma");
  const parent = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!parent)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    include: { vault: { include: { child: true } } },
  });
  if (!entry)
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  if (entry.vault.child.parentId !== parent.id)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  await prisma.entry.update({
    where: { id: entryId },
    data: { approvalStatus: next },
  });
  return NextResponse.json({ success: true });
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "Database unreachable." }, { status: 500 });
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    return await decision(userId, id, "APPROVED");
  } catch (err) {
    console.error("[entries approve] error:", err);
    return NextResponse.json(
      { error: "Couldn't approve entry." },
      { status: 500 },
    );
  }
}
