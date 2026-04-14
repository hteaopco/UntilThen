import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateBody {
  vaultId?: string;
  title?: string;
  description?: string | null;
  coverEmoji?: string | null;
  revealDate?: string | null;
}

async function getUserWithVaults(userId: string) {
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
  const ownedVaults = user.children
    .map((c) => c.vault)
    .filter((v): v is NonNullable<typeof v> => Boolean(v));
  return { user, ownedVaults };
}

function resolveVaultId(
  ownedVaults: { id: string }[],
  requestedVaultId: string | undefined,
): string | null {
  if (requestedVaultId) {
    const owned = ownedVaults.find((v) => v.id === requestedVaultId);
    return owned?.id ?? null;
  }
  return ownedVaults[0]?.id ?? null;
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
    const ctx = await getUserWithVaults(userId);
    if (!ctx?.user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    if (ctx.ownedVaults.length === 0) {
      return NextResponse.json({ collections: [] });
    }
    const { prisma } = await import("@/lib/prisma");
    // GET is used by multi-vault pickers (NewEntryForm collection
    // dropdown) — return collections across every vault the user
    // owns. Per-vault filtering happens on the client.
    const collections = await prisma.collection.findMany({
      where: { vaultId: { in: ctx.ownedVaults.map((v) => v.id) } },
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
    const ctx = await getUserWithVaults(userId);
    if (!ctx?.user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    const targetVaultId = resolveVaultId(ctx.ownedVaults, body.vaultId);
    if (!targetVaultId) {
      return NextResponse.json(
        { error: "No vault to add this collection to." },
        { status: 400 },
      );
    }
    const { prisma } = await import("@/lib/prisma");
    const collection = await prisma.collection.create({
      data: {
        vaultId: targetVaultId,
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
