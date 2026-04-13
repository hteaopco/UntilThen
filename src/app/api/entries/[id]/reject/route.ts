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
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "Database unreachable." }, { status: 500 });
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const { prisma } = await import("@/lib/prisma");
    const parent = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!parent)
      return NextResponse.json({ error: "User not found." }, { status: 404 });

    const entry = await prisma.entry.findUnique({
      where: { id },
      include: {
        contributor: true,
        vault: { include: { child: true } },
      },
    });
    if (!entry)
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    if (entry.vault.child.parentId !== parent.id)
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    await prisma.entry.update({
      where: { id },
      data: { approvalStatus: "REJECTED" },
    });

    if (entry.contributor) {
      try {
        const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
        const { sendEntryRejected } = await import("@/lib/emails");
        await sendEntryRejected({
          contributorEmail: entry.contributor.email,
          contributorName: entry.contributor.name ?? entry.contributor.email,
          childFirstName: entry.vault.child.firstName,
          entryTitle: entry.title ?? "Your entry",
          contributorDashboardUrl: `${base}/contribute/${entry.vaultId}`,
        });
      } catch (err) {
        console.error("[entries reject] notify error:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[entries reject] error:", err);
    return NextResponse.json(
      { error: "Couldn't reject entry." },
      { status: 500 },
    );
  }
}
