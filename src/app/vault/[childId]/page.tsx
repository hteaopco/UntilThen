import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { CapsuleHero } from "@/components/capsule-landing/CapsuleHero";
import { CollectionCard } from "@/components/capsule-landing/CollectionCard";
import { RevealReelCard } from "@/components/capsule-landing/RevealReelCard";
import { TopNav } from "@/components/ui/TopNav";
import {
  ageOnDate,
  loadCapsuleLandingData,
} from "@/lib/capsule-landing-data";
import { userHasCapsuleAccess } from "@/lib/paywall";

export const metadata = {
  title: "Time Capsule — untilThen",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CapsuleLandingPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { childId } = await params;
  const data = await loadCapsuleLandingData({ userId, childId });
  if (!data) redirect("/dashboard");

  const { child, vault, collections } = data;

  // Look up the paying-user id from the Clerk id so the paywall
  // helper can check subscription status. loadCapsuleLandingData
  // already validated ownership so this is a cheap second read.
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  const hasWriteAccess = user ? await userHasCapsuleAccess(user.id) : false;
  const squareApplicationId =
    process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "";
  const squareLocationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "";

  return (
    <main className="min-h-screen bg-cream pb-16 overflow-x-clip">
      <TopNav />

      <div className="mx-auto max-w-[900px] px-5 sm:px-6 lg:px-10 pt-6 space-y-8 sm:space-y-10">
        <CapsuleHero
          vaultId={vault.id}
          childFirstName={child.firstName}
          vaultCoverUrl={vault.coverUrl}
          vaultRevealDate={vault.revealDate?.toISOString() ?? null}
        />

        <section>
          <div className="flex items-center justify-between gap-3 mb-5">
            <h2 className="text-[28px] sm:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-[1.05] min-w-0 flex-1">
              {child.firstName}&rsquo;s Collections
            </h2>
            <RevealReelCard
              vaultId={vault.id}
              childId={child.id}
              initialMode={vault.revealMode}
              curatedSlideCount={vault.validCuratedSlideCount}
            />
          </div>

          {collections.length === 0 ? (
            <EmptyCollections childFirstName={child.firstName} />
          ) : (
            <ul className="space-y-4">
              {collections.map((c) => (
                <li key={c.id}>
                  <CollectionCard
                    childId={child.id}
                    collection={c}
                    age={ageOnDate(child.dateOfBirth, c.revealDate)}
                    hasWriteAccess={hasWriteAccess}
                    squareApplicationId={squareApplicationId}
                    squareLocationId={squareLocationId}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function EmptyCollections({ childFirstName }: { childFirstName: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-navy/10 bg-white/60 px-6 py-10 text-center">
      <p className="text-[14px] text-ink-mid leading-[1.5]">
        No collections yet for {childFirstName}. Create your first milestone
        below to start collecting moments.
      </p>
    </div>
  );
}

/**
 * Routes to the vault's polished memory editor (modeled on the gift
 * capsule contributor form) without a collectionId, so new entries
 * land in the "Main Capsule Diary" bucket (collectionId: null).
 */
