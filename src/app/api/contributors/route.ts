import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database unreachable." }, { status: 500 });
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
    if (!user)
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    const vault = user.children[0]?.vault;
    if (!vault) return NextResponse.json({ contributors: [] });

    const contributors = await prisma.contributor.findMany({
      where: { vaultId: vault.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      contributors: contributors.map((c) => ({
        id: c.id,
        email: c.email,
        name: c.name,
        role: c.role,
        status: c.status,
        requiresApproval: c.requiresApproval,
        createdAt: c.createdAt.toISOString(),
        acceptedAt: c.acceptedAt?.toISOString() ?? null,
        inviteToken: c.status === "PENDING" ? c.inviteToken : null,
      })),
    });
  } catch (err) {
    console.error("[contributors GET] error:", err);
    return NextResponse.json(
      { error: "Couldn't load contributors." },
      { status: 500 },
    );
  }
}
