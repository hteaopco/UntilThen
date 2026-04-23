import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { BillingClient, type BillingClientProps } from "@/components/account/BillingClient";

export const metadata = {
  title: "Billing — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AccountBillingPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      squareCustomerId: true,
      squareCardBrand: true,
      squareCardLast4: true,
      freeVaultAccess: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          baseCapsuleCount: true,
          addonCapsuleCount: true,
          currentPeriodEnd: true,
          pendingPlan: true,
          pendingEffectiveDate: true,
        },
      },
      children: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          firstName: true,
          vault: {
            select: {
              id: true,
              isLocked: true,
              lastLockToggleAt: true,
              entries: {
                where: { isSealed: true },
                select: { type: true },
              },
            },
          },
        },
      },
    },
  });
  if (!user) redirect("/onboarding");

  const entries = user.children.flatMap((c) => c.vault?.entries ?? []);
  const capsules = user.children
    .map((c) => ({
      childId: c.id,
      vaultId: c.vault?.id ?? null,
      firstName: c.firstName,
      isLocked: c.vault?.isLocked ?? false,
      lastLockToggleAtIso:
        c.vault?.lastLockToggleAt?.toISOString() ?? null,
    }));

  const props: BillingClientProps = {
    capsuleCount: user.children.length,
    photoCount: entries.filter((e) => e.type === "PHOTO").length,
    voiceCount: entries.filter((e) => e.type === "VOICE").length,
    videoCount: entries.filter((e) => e.type === "VIDEO").length,
    hasCustomerOnFile: Boolean(user.squareCustomerId),
    cardBrand: user.squareCardBrand,
    cardLast4: user.squareCardLast4,
    freeVaultAccess: user.freeVaultAccess,
    capsules,
    subscription: user.subscription
      ? {
          plan: user.subscription.plan,
          status: user.subscription.status,
          baseCapsuleCount: user.subscription.baseCapsuleCount,
          addonCapsuleCount: user.subscription.addonCapsuleCount,
          currentPeriodEndIso: user.subscription.currentPeriodEnd.toISOString(),
          pendingPlan: user.subscription.pendingPlan,
          pendingEffectiveDateIso:
            user.subscription.pendingEffectiveDate?.toISOString() ?? null,
        }
      : null,
    squareApplicationId: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "",
    squareLocationId: process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "",
  };

  return <BillingClient {...props} />;
}
