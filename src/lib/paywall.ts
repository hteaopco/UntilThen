import type { PrismaClient } from "@prisma/client";

/**
 * Paywall helpers. One central module so every caller — vault
 * creation, Gift Capsule activation, onboarding, admin UI —
 * applies identical logic.
 *
 * The global switch is AppConfig.paywallEnabled. When it's
 * false, every helper short-circuits to "allowed" regardless
 * of subscription state. This is how pre-launch testing runs
 * and also serves as a kill switch if Square ever goes down.
 *
 * Per-user overrides (User.freeVaultAccess / User.freeGiftAccess)
 * bypass the subscription check entirely. These are comped
 * employees / testers, flipped from the admin Users table.
 *
 * All helpers accept an optional pre-fetched `user` so callers
 * that already loaded the user row aren't forced to round-trip
 * the DB a second time.
 */

// Lazy-loaded Prisma client — matches the pattern used across
// the rest of the API surface (dynamic import keeps the cold-
// start bundle lean).
async function getPrisma(): Promise<PrismaClient> {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

/** True when the global paywall is on. Reads from AppConfig. */
export async function isPaywallEnabled(): Promise<boolean> {
  try {
    const prisma = await getPrisma();
    const config = await prisma.appConfig.findUnique({
      where: { id: "singleton" },
      select: { paywallEnabled: true },
    });
    return config?.paywallEnabled ?? false;
  } catch {
    // Defensive fallback — if the config table isn't reachable
    // for any reason, leave the paywall OFF rather than locking
    // every user out of the product.
    return false;
  }
}

type UserPaywallShape = {
  id: string;
  freeVaultAccess: boolean;
  freeGiftAccess: boolean;
  subscription:
    | {
        status: "ACTIVE" | "CANCELLED" | "PAST_DUE" | "LOCKED";
        baseCapsuleCount: number;
        addonCapsuleCount: number;
      }
    | null;
  children: { id: string }[];
};

async function loadUser(userId: string): Promise<UserPaywallShape | null> {
  const prisma = await getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      freeVaultAccess: true,
      freeGiftAccess: true,
      subscription: {
        select: {
          status: true,
          baseCapsuleCount: true,
          addonCapsuleCount: true,
        },
      },
      children: { select: { id: true } },
    },
  });
  return user;
}

/**
 * May this user create or manage a Time Capsule (child vault)?
 * Used on /api/account/children POST + the "Add a time capsule"
 * button gate.
 */
export async function userHasCapsuleAccess(
  userId: string,
  preLoaded?: UserPaywallShape,
): Promise<boolean> {
  if (!(await isPaywallEnabled())) return true;
  const user = preLoaded ?? (await loadUser(userId));
  if (!user) return false;
  if (user.freeVaultAccess) return true;
  return user.subscription?.status === "ACTIVE";
}

/**
 * Per-vault write gate. Returns true when the vault can be
 * written to — meaning the owner has capsule access AND the
 * vault itself isn't locked (over-quota after an addon was
 * removed, or explicitly locked from the capsules page).
 */
export async function vaultIsWritable(
  userId: string,
  vaultId: string,
): Promise<boolean> {
  if (!(await userHasCapsuleAccess(userId))) return false;
  const prisma = await getPrisma();
  const vault = await prisma.vault.findUnique({
    where: { id: vaultId },
    select: { isLocked: true },
  });
  if (!vault) return false;
  return !vault.isLocked;
}

/**
 * May this user create + activate a Gift Capsule? Separate from
 * vault access because the $9.99 one-time is a per-capsule
 * charge — even subscribed users pay per gift capsule they send,
 * unless they've been granted freeGiftAccess.
 */
export async function userHasGiftAccess(
  userId: string,
  preLoaded?: UserPaywallShape,
): Promise<boolean> {
  if (!(await isPaywallEnabled())) return true;
  const user = preLoaded ?? (await loadUser(userId));
  if (!user) return false;
  if (user.freeGiftAccess) return true;
  return user.subscription?.status === "ACTIVE";
}

/**
 * Does this user have a free capsule slot available? Returns
 * true when the paywall is off, when the user is comped, or
 * when they have fewer active children than their plan allows
 * (base + add-on). Used before POST /api/account/children to
 * decide whether to show an AddOnCheckout upsell.
 */
export async function userCapsuleSlotAvailable(
  userId: string,
  preLoaded?: UserPaywallShape,
): Promise<boolean> {
  if (!(await isPaywallEnabled())) return true;
  const user = preLoaded ?? (await loadUser(userId));
  if (!user) return false;
  if (user.freeVaultAccess) return true;
  if (!user.subscription || user.subscription.status !== "ACTIVE") return false;
  const allowed =
    user.subscription.baseCapsuleCount + user.subscription.addonCapsuleCount;
  return user.children.length < allowed;
}

/**
 * Combined helper — returns the shape the UI needs to decide
 * whether to show checkout, show an upsell, or just let the
 * action through.
 */
export type CapsuleAccessVerdict = {
  paywallEnabled: boolean;
  hasAccess: boolean;
  needsSubscription: boolean;
  needsAddOn: boolean;
  /** Current slot usage — for copy like "You've used all 3
   *  capsule slots." */
  usedSlots: number;
  allowedSlots: number;
};

export async function capsuleAccessVerdict(
  userId: string,
): Promise<CapsuleAccessVerdict> {
  const paywallEnabled = await isPaywallEnabled();
  const user = await loadUser(userId);
  const usedSlots = user?.children.length ?? 0;
  const allowedSlots =
    (user?.subscription?.baseCapsuleCount ?? 0) +
    (user?.subscription?.addonCapsuleCount ?? 0);

  if (!paywallEnabled || user?.freeVaultAccess) {
    return {
      paywallEnabled,
      hasAccess: true,
      needsSubscription: false,
      needsAddOn: false,
      usedSlots,
      allowedSlots,
    };
  }
  if (!user?.subscription || user.subscription.status !== "ACTIVE") {
    return {
      paywallEnabled,
      hasAccess: false,
      needsSubscription: true,
      needsAddOn: false,
      usedSlots,
      allowedSlots,
    };
  }
  if (usedSlots >= allowedSlots) {
    return {
      paywallEnabled,
      hasAccess: false,
      needsSubscription: false,
      needsAddOn: true,
      usedSlots,
      allowedSlots,
    };
  }
  return {
    paywallEnabled,
    hasAccess: true,
    needsSubscription: false,
    needsAddOn: false,
    usedSlots,
    allowedSlots,
  };
}
