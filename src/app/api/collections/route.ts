import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateBody {
  title?: string;
  description?: string | null;
  coverEmoji?: string | null;
  revealDate?: string | null;
}

async function getUserAndVault(userId: string) {
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
  if (!user) return null;
  const vault = user.children[0]?.vault ?? null;
  return { user, vault };
}

export async function GET() {
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

  try {
    const ctx = await getUserAndVault(userId);
    if (!ctx?.user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (!ctx.vault) {
      return NextResponse.json({ collections: [] });
    }
    const { prisma } = await import("@/lib/prisma");
    const collections = await prisma.collection.findMany({
      where: { vaultId: ctx.vault.id },
      include: { _count: { select: { entries: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      collections: collections.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        coverEmoji: c.coverEmoji,
        revealDate: c.revealDate?.toISOString() ?? null,
        isSealed: c.isSealed,
        entryCount: c._count.entries,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[collections GET] error:", err);
    return NextResponse.json(
      { error: "Couldn't load collections." },
      { status: 500 },
    );
  }
}

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

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json(
      { error: "Collection title is required." },
      { status: 400 },
    );
  }

  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const coverEmoji =
    typeof body.coverEmoji === "string" && body.coverEmoji.trim()
      ? body.coverEmoji.trim().slice(0, 8)
      : null;

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

  try {
    const ctx = await getUserAndVault(userId);
    if (!ctx?.user || !ctx.vault) {
      return NextResponse.json(
        { error: "No vault to add this collection to." },
        { status: 400 },
      );
    }
    const { prisma } = await import("@/lib/prisma");
    const collection = await prisma.collection.create({
      data: {
        vaultId: ctx.vault.id,
        authorId: ctx.user.id,
        title,
        description,
        coverEmoji,
        revealDate,
      },
    });
    return NextResponse.json({ success: true, id: collection.id });
  } catch (err) {
    console.error("[collections POST] error:", err);
    return NextResponse.json(
      { error: "Couldn't create the collection." },
      { status: 500 },
    );
  }
}
