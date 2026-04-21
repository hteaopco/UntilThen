import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchBody {
  title?: string;
  description?: string | null;
  coverEmoji?: string | null;
  revealDate?: string | null;
}

async function getCurrentUser(userId: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.user.findUnique({ where: { clerkId: userId } });
}

async function findOwnedCollection(clerkUserId: string, collectionId: string) {
  const { prisma } = await import("@/lib/prisma");
  const user = await getCurrentUser(clerkUserId);
  if (!user) return { error: 404 as const, user: null, collection: null };
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });
  if (!collection) return { error: 404 as const, user, collection: null };
  if (collection.authorId !== user.id)
    return { error: 403 as const, user, collection: null };
  return { user, collection };
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

  const owned = await findOwnedCollection(userId, id);
  if (owned.error === 404 || !owned.collection) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (owned.error === 403) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title)
      return NextResponse.json(
        { error: "Title can't be empty." },
        { status: 400 },
      );
    data.title = title;
  }
  if ("description" in body) {
    data.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
  }
  if ("coverEmoji" in body) {
    data.coverEmoji =
      typeof body.coverEmoji === "string" && body.coverEmoji.trim()
        ? body.coverEmoji.trim().slice(0, 8)
        : null;
  }
  if ("revealDate" in body) {
    if (body.revealDate === null || body.revealDate === "") {
      data.revealDate = null;
    } else if (typeof body.revealDate === "string") {
      const parsed = new Date(body.revealDate);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Invalid reveal date." },
          { status: 400 },
        );
      }
      data.revealDate = parsed;
    }
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.collection.update({ where: { id }, data });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[collections PATCH] error:", err);
    return NextResponse.json(
      { error: "Couldn't update the collection." },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

  // Three delete modes:
  //   { deleteEntries: true }             — hard-delete everything
  //     (entries + collection) in one transaction.
  //   { moveEntriesTo: "<collectionId>" } — reparent entries to
  //     another sibling collection, then drop the collection. Use
  //     an empty string / null / "main-diary" to mean "move to the
  //     Main Capsule Diary" (i.e. collectionId = null).
  //   (neither)                           — detach the entries
  //     (collectionId: null, orderIndex: null) and drop the
  //     collection. Keeps the previous default.
  let deleteEntries = false;
  let moveEntriesTo: string | null | undefined = undefined;
  try {
    const body = (await req.json().catch(() => null)) as
      | { deleteEntries?: unknown; moveEntriesTo?: unknown }
      | null;
    if (body && body.deleteEntries === true) deleteEntries = true;
    if (body && typeof body.moveEntriesTo === "string") {
      moveEntriesTo =
        body.moveEntriesTo.trim() && body.moveEntriesTo !== "main-diary"
          ? body.moveEntriesTo.trim()
          : null;
    } else if (body && body.moveEntriesTo === null) {
      moveEntriesTo = null;
    }
  } catch {
    /* no body — keep default */
  }

  const owned = await findOwnedCollection(userId, id);
  if (owned.error === 404 || !owned.collection) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (owned.error === 403) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    // Validate the move target if one was supplied (sibling
    // collection on the same vault, owned by the caller). A null
    // target means "Main Capsule Diary" (collectionId = null on
    // each entry) and is always allowed.
    let safeTarget: string | null | undefined = moveEntriesTo;
    if (typeof safeTarget === "string") {
      const target = await prisma.collection.findUnique({
        where: { id: safeTarget },
        select: { vaultId: true, authorId: true },
      });
      if (
        !target ||
        target.authorId !== owned.user?.id ||
        target.vaultId !== owned.collection.vaultId
      ) {
        return NextResponse.json(
          { error: "Invalid target collection." },
          { status: 400 },
        );
      }
    }

    if (deleteEntries) {
      // Hard delete every memory inside the collection, then the
      // collection itself. Single transaction so a failure mid-way
      // doesn't leave orphaned entries pointing at a missing FK.
      await prisma.$transaction([
        prisma.entry.deleteMany({ where: { collectionId: id } }),
        prisma.collection.delete({ where: { id } }),
      ]);
    } else if (moveEntriesTo !== undefined) {
      // Reparent entries to the chosen target (null = Main Diary,
      // a string = a sibling Collection). Drop orderIndex so
      // re-ordered positions don't leak into the new parent.
      await prisma.$transaction([
        prisma.entry.updateMany({
          where: { collectionId: id },
          data: { collectionId: safeTarget ?? null, orderIndex: null },
        }),
        prisma.collection.delete({ where: { id } }),
      ]);
    } else {
      // Detach entries (keep them as standalone) before deleting
      // the collection so we don't violate the FK. `ON DELETE SET
      // NULL` handles this at the DB level too, but being explicit
      // is clearer.
      await prisma.$transaction([
        prisma.entry.updateMany({
          where: { collectionId: id },
          data: { collectionId: null, orderIndex: null },
        }),
        prisma.collection.delete({ where: { id } }),
      ]);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[collections DELETE] error:", err);
    return NextResponse.json(
      { error: "Couldn't delete the collection." },
      { status: 500 },
    );
  }
}
