import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { EntryType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  title?: string | null;
  body?: string;
  type?: string;
  revealDate?: string | null;
  collectionId?: string | null;
}

const VALID_TYPES: EntryType[] = ["TEXT", "PHOTO", "VOICE", "VIDEO"];

export async function POST(req: Request) {
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

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title =
    typeof body.title === "string" ? body.title.trim() : "";
  const bodyText =
    typeof body.body === "string" ? body.body.trim() : "";
  const typeInput = typeof body.type === "string" ? body.type : "TEXT";
  const type = VALID_TYPES.includes(typeInput as EntryType)
    ? (typeInput as EntryType)
    : "TEXT";

  if (!bodyText) {
    return NextResponse.json(
      { error: "Please write something before sealing." },
      { status: 400 },
    );
  }

  let revealDate: Date | null = null;
  if (typeof body.revealDate === "string" && body.revealDate.trim()) {
    const parsed = new Date(body.revealDate);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "Invalid reveal date." },
        { status: 400 },
      );
    }
    revealDate = parsed;
  }

  const collectionId =
    typeof body.collectionId === "string" && body.collectionId.trim()
      ? body.collectionId.trim()
      : null;

  try {
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        children: {
          include: { vault: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    const vault = user.children[0]?.vault;
    if (!vault) {
      return NextResponse.json({ error: "No vault yet." }, { status: 404 });
    }

    // If collectionId was provided, verify ownership + clear per-entry
    // reveal date (the collection controls it).
    let orderIndex: number | null = null;
    if (collectionId) {
      const collection = await prisma.collection.findUnique({
        where: { id: collectionId },
        include: {
          _count: { select: { entries: true } },
        },
      });
      if (!collection || collection.authorId !== user.id || collection.vaultId !== vault.id) {
        return NextResponse.json(
          { error: "Collection not found." },
          { status: 404 },
        );
      }
      revealDate = null;
      orderIndex = collection._count.entries; // append to the end
    }

    const entry = await prisma.entry.create({
      data: {
        vaultId: vault.id,
        authorId: user.id,
        type,
        title: title || null,
        body: bodyText,
        revealDate,
        collectionId,
        orderIndex,
      },
    });

    return NextResponse.json({ success: true, id: entry.id });
  } catch (err) {
    console.error("[dashboard/entries POST] error:", err);
    return NextResponse.json(
      { error: "Couldn't seal your entry." },
      { status: 500 },
    );
  }
}
