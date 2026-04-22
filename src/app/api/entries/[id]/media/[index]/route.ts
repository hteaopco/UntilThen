import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { deleteR2Object, r2IsConfigured } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; index: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );

  const { id, index } = await ctx.params;
  const idx = Number.parseInt(index, 10);
  if (!id || Number.isNaN(idx) || idx < 0) {
    return NextResponse.json(
      { error: "Invalid id or index." },
      { status: 400 },
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const entry = await prisma.entry.findUnique({ where: { id } });
    if (!entry)
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });

    const author = await prisma.user.findUnique({ where: { id: entry.authorId } });
    if (author?.clerkId !== userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (idx >= entry.mediaUrls.length) {
      return NextResponse.json(
        { error: "Media index out of range." },
        { status: 400 },
      );
    }

    const key = entry.mediaUrls[idx] ?? "";
    const nextUrls = [...entry.mediaUrls];
    const nextTypes = [...entry.mediaTypes];
    nextUrls.splice(idx, 1);
    nextTypes.splice(idx, 1);

    await prisma.entry.update({
      where: { id },
      data: {
        mediaUrls: { set: nextUrls },
        mediaTypes: { set: nextTypes },
      },
    });

    // Best-effort R2 delete (swallow failures; orphan keys can be cleaned later).
    if (key && r2IsConfigured()) {
      try {
        await deleteR2Object(key);
      } catch (err) {
        console.error("[media DELETE] R2 delete failed:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[media DELETE] error:", err);
    return NextResponse.json(
      { error: "Couldn't delete media." },
      { status: 500 },
    );
  }
}
