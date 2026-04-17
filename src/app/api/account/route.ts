import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PatchBody = {
  firstName?: string;
  lastName?: string;
  displayName?: string | null;
};

export async function GET(): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { prisma } = await import("@/lib/prisma");
  // User profile rarely changes; 60s TTL keeps the account header
  // snappy. PATCH below doesn't bust the Accelerate cache, so a
  // self-edit can take up to a minute to surface — acceptable for
  // the name-change UX.
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
    },
    cacheStrategy: { ttl: 60 },
  });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.firstName === "string") {
    const v = body.firstName.trim();
    if (!v)
      return NextResponse.json(
        { error: "First name is required." },
        { status: 400 },
      );
    data.firstName = v;
  }
  if (typeof body.lastName === "string") {
    const v = body.lastName.trim();
    if (!v)
      return NextResponse.json(
        { error: "Last name is required." },
        { status: 400 },
      );
    data.lastName = v;
  }
  if ("displayName" in body) {
    const v =
      typeof body.displayName === "string" ? body.displayName.trim() : "";
    data.displayName = v.length > 0 ? v : null;
  }

  const { prisma } = await import("@/lib/prisma");
  await prisma.user.update({ where: { clerkId: userId }, data });
  revalidatePath("/account");
  revalidatePath("/dashboard");
  return NextResponse.json({ success: true });
}

/**
 * Soft-delete: mark the account for deletion. Full purge wiring
 * (email + 30-day retention) would go through Resend + a scheduled
 * job; that's out of scope here. For now this just deletes the
 * user's Prisma records cascade-style so they're signed out and
 * their vault is inaccessible.
 */
export async function DELETE(): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });
    if (!user)
      return NextResponse.json({ error: "User not found." }, { status: 404 });

    const id = user.id;

    await prisma.$transaction(async (tx) => {
      await tx.notificationPreferences.deleteMany({ where: { userId: id } });

      await tx.entry.deleteMany({ where: { authorId: id } });

      const children = await tx.child.findMany({
        where: { parentId: id },
        select: { id: true },
      });
      const childIds = children.map((c) => c.id);
      if (childIds.length > 0) {
        const vaults = await tx.vault.findMany({
          where: { childId: { in: childIds } },
          select: { id: true },
        });
        const vaultIds = vaults.map((v) => v.id);
        if (vaultIds.length > 0) {
          await tx.entry.deleteMany({ where: { vaultId: { in: vaultIds } } });
          await tx.collection.deleteMany({ where: { vaultId: { in: vaultIds } } });
          await tx.contributor.deleteMany({ where: { vaultId: { in: vaultIds } } });
          await tx.vault.deleteMany({ where: { id: { in: vaultIds } } });
        }
        await tx.child.deleteMany({ where: { id: { in: childIds } } });
      }

      await tx.memoryCapsule.deleteMany({ where: { organiserId: id } });

      await tx.user.delete({ where: { id } });
    });

    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const clerk = await clerkClient();
      await clerk.users.deleteUser(userId);
    } catch (err) {
      console.error("[account DELETE] clerk delete failed:", err);
    }

    try {
      const { sendAccountDeleted } = await import("@/lib/emails");
      const { clerkClient } = await import("@clerk/nextjs/server");
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId).catch(() => null);
      const email =
        clerkUser?.primaryEmailAddress?.emailAddress ??
        clerkUser?.emailAddresses[0]?.emailAddress;
      if (email) {
        await sendAccountDeleted({
          to: email,
          firstName: user.firstName,
        });
      }
    } catch (err) {
      console.error("[account DELETE] confirmation email failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[account DELETE] error:", err);
    return NextResponse.json(
      { error: "Failed to delete account." },
      { status: 500 },
    );
  }
}
