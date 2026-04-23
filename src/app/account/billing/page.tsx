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
                where: { isDraft: false },
                select: { type: true, mediaTypes: true },
              },
            },
          },
        },
      },
    },
  });
  if (!user) redirect("/onboarding");

  // A media stat = the total number of photos / voice clips /
  // video clips the user has saved. Entries can be primary type
  // PHOTO / VOICE / VIDEO _and_ carry additional attachments in
  // `mediaTypes[]` (e.g. a TEXT entry with a photo attached). We
  // sum the attachments array so every file shows up — otherwise
  // a letter with a photo counted as 0 photos, which is what the
  // old `e.type === "PHOTO"` check was doing.
  const entries = user.children.flatMap((c) => c.vault?.entries ?? []);
  let photoCount = 0;
  let voiceCount = 0;
  let videoCount = 0;
  for (const entry of entries) {
    for (const mt of entry.mediaTypes) {
      const m = mt.toLowerCase();
      if (m === "photo") photoCount += 1;
      else if (m === "voice") voiceCount += 1;
      else if (m === "video") videoCount += 1;
    }
    // Primary-type entries that don't populate mediaTypes still
    // need to be counted exactly once.
    if (entry.mediaTypes.length === 0) {
      if (entry.type === "PHOTO") photoCount += 1;
      else if (entry.type === "VOICE") voiceCount += 1;
      else if (entry.type === "VIDEO") videoCount += 1;
    }
  }
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
    photoCount,
    voiceCount,
    videoCount,
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
