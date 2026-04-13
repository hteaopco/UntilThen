import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchBody {
  title?: string | null;
  body?: string;
  revealDate?: string | null;
  collectionId?: string | null;
  isSealed?: boolean;
  isDraft?: boolean;
}

async function requireUser(clerkUserId: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.user.findUnique({ where: { clerkId: clerkUserId } });
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
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const user = await requireUser(userId);
    if (!user)
      return NextResponse.json({ error: "User not found." }, { status: 404 });

    const entry = await prisma.entry.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        collectionId: true,
        contributorId: true,
      },
    });
    if (!entry)
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    if (entry.authorId !== user.id)
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const data: Record<string, unknown> = {};
    if ("title" in body) {
      const t = typeof body.title === "string" ? body.title.trim() : "";
      data.title = t || null;
    }
    if ("body" in body) {
      data.body =
        typeof body.body === "string" && body.body.length > 0
          ? body.body
          : null;
    }
    if ("collectionId" in body) {
      const coll =
        typeof body.collectionId === "string" && body.collectionId.trim()
          ? body.collectionId.trim()
          : null;
      if (coll) {
        const c = await prisma.collection.findUnique({ where: { id: coll } });
        if (!c || c.authorId !== user.id)
          return NextResponse.json(
            { error: "Collection not found." },
            { status: 404 },
          );
      }
      data.collectionId = coll;
      // Clear per-entry reveal date when attached to a collection.
      if (coll) data.revealDate = null;
    }
    if ("revealDate" in body && !data.collectionId) {
      if (body.revealDate === null || body.revealDate === "") {
        data.revealDate = null;
      } else if (typeof body.revealDate === "string") {
        const parsed = new Date(body.revealDate);
        if (Number.isNaN(parsed.getTime()))
          return NextResponse.json(
            { error: "Invalid reveal date." },
            { status: 400 },
          );
        data.revealDate = parsed;
      }
    }
    if (typeof body.isSealed === "boolean") {
      data.isSealed = body.isSealed;
      if (body.isSealed === true) data.isDraft = false;
    }
    if (typeof body.isDraft === "boolean") {
      data.isDraft = body.isDraft;
    }

    await prisma.entry.update({ where: { id }, data });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[dashboard/entries PATCH] error:", err);
    return NextResponse.json(
      { error: "Couldn't save the entry." },
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
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const { prisma } = await import("@/lib/prisma");
    const user = await requireUser(userId);
    if (!user)
      return NextResponse.json({ error: "User not found." }, { status: 404 });

    const entry = await prisma.entry.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });
    if (!entry)
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    if (entry.authorId !== user.id)
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });

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
