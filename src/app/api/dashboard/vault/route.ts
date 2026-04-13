import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  revealDate?: string | null;
}

export async function PATCH(req: Request) {
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

  let revealDate: Date | null = null;
  if (typeof body.revealDate === "string" && body.revealDate.trim()) {
    const parsed = new Date(body.revealDate);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "Invalid reveal date." },
        { status: 400 },
      );
    }
    // Must be in the future — we'll compare at day granularity.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsed.getTime() < today.getTime()) {
      return NextResponse.json(
        { error: "Reveal date can't be in the past." },
        { status: 400 },
      );
    }
    revealDate = parsed;
  } else if (body.revealDate === null) {
    revealDate = null;
  } else {
    return NextResponse.json(
      { error: "revealDate is required." },
      { status: 400 },
    );
  }

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

    await prisma.vault.update({
      where: { id: vault.id },
      data: { revealDate },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[dashboard/vault PATCH] error:", err);
    return NextResponse.json(
      { error: "Couldn't update the vault." },
      { status: 500 },
    );
  }
}
