import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
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
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found." }, { status: 404 });

    const collection = await prisma.collection.findUnique({
      where: { id },
      select: { id: true, authorId: true, isSealed: true },
    });
    if (!collection)
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (collection.authorId !== user.id)
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    await prisma.collection.update({
      where: { id },
      data: { isSealed: true },
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[collections seal] error:", err);
    return NextResponse.json(
      { error: "Couldn't seal the collection." },
      { status: 500 },
    );
  }
}
