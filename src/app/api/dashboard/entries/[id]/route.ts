import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    // Only allow the author to delete their own entry.
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const entry = await prisma.entry.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });
    if (!entry) {
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }
    if (entry.authorId !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    await prisma.entry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[dashboard/entries DELETE] error:", err);
    return NextResponse.json(
      { error: "Couldn't delete the entry." },
      { status: 500 },
    );
  }
}
