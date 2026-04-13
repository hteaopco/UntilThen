import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database unreachable." },
      { status: 500 },
    );
  }

  const { token } = await ctx.params;
  if (!token)
    return NextResponse.json({ error: "Missing token" }, { status: 400 });

  try {
    const { prisma } = await import("@/lib/prisma");
    const contributor = await prisma.contributor.findUnique({
      where: { inviteToken: token },
      include: { vault: true },
    });
    if (!contributor)
      return NextResponse.json({ error: "Invite not found." }, { status: 404 });
    if (contributor.status === "REVOKED")
      return NextResponse.json(
        { error: "This invite is no longer valid." },
        { status: 410 },
      );

    // Fetch Clerk user to populate firstName/lastName on the local
    // User record we create for them.
    let firstName = "Contributor";
    let lastName = "";
    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      firstName = clerkUser.firstName ?? firstName;
      lastName = clerkUser.lastName ?? "";
    } catch (err) {
      console.error("[invites/accept] clerk fetch error:", err);
    }

    // Ensure a User row exists for this Clerk user. Contributors and
    // parents share the User table.
    await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: {
        clerkId: userId,
        firstName,
        lastName,
        role: "CONTRIBUTOR",
      },
    });

    await prisma.contributor.update({
      where: { id: contributor.id },
      data: {
        status: "ACTIVE",
        clerkUserId: userId,
        acceptedAt: new Date(),
      },
    });

    // Let the parent know the invite landed. Best-effort — we don't
    // want email failures to break the accept flow.
    try {
      const parent = await prisma.user.findFirst({
        where: { clerkId: contributor.invitedBy },
      });
      const child = await prisma.child.findUnique({
        where: { id: contributor.vault.childId },
      });
      if (parent && child) {
        const { sendInviteAccepted } = await import("@/lib/emails");
        await sendInviteAccepted({
          parentEmail: "", // Clerk email lookup is overkill for the TEMP routing setup
          parentFirstName: parent.firstName,
          contributorName: contributor.name ?? firstName ?? "Someone",
          childFirstName: child.firstName,
        });
      }
    } catch (err) {
      console.error("[invites/accept] notify error:", err);
    }

    return NextResponse.json({ success: true, vaultId: contributor.vaultId });
  } catch (err) {
    console.error("[invites/accept] error:", err);
    return NextResponse.json(
      { error: "Couldn't accept invite." },
      { status: 500 },
    );
  }
}
