import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { captureServerEvent } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/account/vaults/[id]/lock
 *
 * Locks a vault (makes it read-only). Always allowed — locking
 * frees up a slot so it never creates a constraint violation.
 *
 * DELETE /api/account/vaults/[id]/lock
 *
 * Unlocks a vault. Only allowed if the user's paid slot count
 * still has room (active vault count < baseCapsuleCount +
 * addonCapsuleCount). Otherwise returns 409 so the UI can prompt
 * the user to lock another vault or buy an addon first.
 */
async function ownedVault(userId: string, vaultId: string) {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) return null;
  const vault = await prisma.vault.findUnique({
    where: { id: vaultId },
    include: { child: { select: { parentId: true } } },
  });
  if (!vault || vault.child.parentId !== user.id) return null;
  return { userId: user.id, vault };
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });

  const { id } = await ctx.params;
  const owned = await ownedVault(userId, id);
  if (!owned) return NextResponse.json({ error: "Vault not found." }, { status: 404 });

  if (owned.vault.isLocked) return NextResponse.json({ success: true });

  const { prisma } = await import("@/lib/prisma");
  await prisma.vault.update({
    where: { id },
    data: { isLocked: true, lockedAt: new Date() },
  });
  await captureServerEvent(userId, "vault_locked", { vaultId: id });
  revalidatePath("/account/capsules");
  revalidatePath("/dashboard");
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });

  const { id } = await ctx.params;
  const owned = await ownedVault(userId, id);
  if (!owned) return NextResponse.json({ error: "Vault not found." }, { status: 404 });

  const { prisma } = await import("@/lib/prisma");

  if (!owned.vault.isLocked) return NextResponse.json({ success: true });

  // Slot check — unlocking only works if we're under the paid
  // slot total. The user has to lock another vault or buy an
  // addon before they can unlock.
  const sub = await prisma.subscription.findUnique({
    where: { userId: owned.userId },
    select: {
      status: true,
      baseCapsuleCount: true,
      addonCapsuleCount: true,
    },
  });
  if (!sub || sub.status !== "ACTIVE") {
    return NextResponse.json(
      {
        error:
          "You need an active subscription to unlock a capsule.",
        needsSubscription: true,
      },
      { status: 409 },
    );
  }
  const activeCount = await prisma.vault.count({
    where: {
      child: { parentId: owned.userId },
      isLocked: false,
    },
  });
  const totalSlots = sub.baseCapsuleCount + sub.addonCapsuleCount;
  if (activeCount >= totalSlots) {
    return NextResponse.json(
      {
        error:
          "You've used every slot on your plan. Lock another capsule first, or add a slot.",
        needsAddOn: true,
        usedSlots: activeCount,
        allowedSlots: totalSlots,
      },
      { status: 409 },
    );
  }

  await prisma.vault.update({
    where: { id },
    data: { isLocked: false, lockedAt: null },
  });
  await captureServerEvent(userId, "vault_unlocked", { vaultId: id });
  revalidatePath("/account/capsules");
  revalidatePath("/dashboard");
  return NextResponse.json({ success: true });
}
