import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public endpoint: anyone with the invite link can see the basic
// context (who invited them, for which child). No secrets leaked.
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await ctx.params;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database unreachable." }, { status: 500 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const contributor = await prisma.contributor.findUnique({
      where: { inviteToken: token },
      include: {
        vault: {
          include: { child: { include: { parent: true } } },
        },
      },
    });
    if (!contributor)
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    if (contributor.status === "REVOKED")
      return NextResponse.json(
        { error: "This invite is no longer valid." },
        { status: 410 },
      );

    return NextResponse.json({
      status: contributor.status,
      email: contributor.email,
      name: contributor.name,
      role: contributor.role,
      childFirstName: contributor.vault.child.firstName,
      parentFirstName: contributor.vault.child.parent.firstName,
      revealDate: contributor.vault.revealDate?.toISOString() ?? null,
      vaultId: contributor.vault.id,
      alreadyAccepted: contributor.status === "ACTIVE",
    });
  } catch (err) {
    console.error("[invites GET] error:", err);
    return NextResponse.json(
      { error: "Couldn't load invite." },
      { status: 500 },
    );
  }
}
