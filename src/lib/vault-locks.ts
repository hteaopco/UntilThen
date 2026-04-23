import type { PrismaClient, Prisma } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

/**
 * Bring vault lock state in line with a user's paid slot count.
 * Counts the user's currently-unlocked vaults and locks the
 * most recently created ones until unlocked ≤ total slots.
 *
 * Called after any subscription state change that could shrink
 * the paid slot total (resubscribe with fewer addons, addon
 * removal, subscription lapse). Running this in one place
 * prevents the 4-capsules-3-slots mismatch we hit after the
 * reset + resubscribe testing flow.
 *
 * Safe when there's no subscription (treats slots as 0 for
 * lapsed users). No-op when unlocked count is already within
 * bounds.
 */
export async function reconcileVaultLocks(
  userId: string,
  tx?: Tx,
): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const client: Tx = tx ?? prisma;

  const sub = await client.subscription.findUnique({
    where: { userId },
    select: {
      status: true,
      baseCapsuleCount: true,
      addonCapsuleCount: true,
    },
  });
  // Only ACTIVE subs grant slots. CANCELLED users keep access
  // through currentPeriodEnd (enforced elsewhere); locking would
  // be premature. For LAPSED / missing sub we treat slots as 0.
  const totalSlots =
    sub && sub.status === "ACTIVE"
      ? sub.baseCapsuleCount + sub.addonCapsuleCount
      : 0;

  const unlockedVaults = await client.vault.findMany({
    where: {
      child: { parentId: userId },
      isLocked: false,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const overQuota = unlockedVaults.length - totalSlots;
  if (overQuota <= 0) return;

  const toLock = unlockedVaults.slice(0, overQuota).map((v) => v.id);
  await client.vault.updateMany({
    where: { id: { in: toLock } },
    data: { isLocked: true, lockedAt: new Date() },
  });
}
