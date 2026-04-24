import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import {
  CollectionLandingView,
  type CollectionLandingEntry,
} from "@/components/capsule-landing/CollectionLandingView";
import { TopNav } from "@/components/ui/TopNav";
import { userHasCapsuleAccess } from "@/lib/paywall";

export const metadata = {
  title: "Main Capsule Diary — untilThen",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Synthetic "Main Capsule Diary" landing. Represents every sealed
 * entry in the vault whose collectionId is null. Renders through
 * CollectionLandingView so its UI stays identical to every real
 * collection landing — edit in one place, reflects everywhere.
 */
export default async function MainDiaryPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { childId } = await params;

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) redirect("/onboarding");

  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: { vault: true },
  });
  if (!child || child.parentId !== user.id || !child.vault) {
    redirect("/dashboard");
  }

  const rows = await prisma.entry.findMany({
    where: {
      vaultId: child.vault.id,
      collectionId: null,
      isSealed: true,
      approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
      // Hide entries still mid-Hive-scan or flagged for admin
      // review. See src/lib/entry-moderation.ts.
      moderationState: { notIn: ["SCANNING", "FLAGGED"] },
    },
    select: {
      id: true,
      title: true,
      body: true,
      type: true,
      mediaTypes: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const entries: CollectionLandingEntry[] = rows.map((e) => ({
    id: e.id,
    title: e.title,
    body: e.body,
    type: e.type,
    mediaTypes: e.mediaTypes,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-cream pb-16">
      <TopNav />
      <CollectionLandingView
        title="Main Capsule Diary"
        description={`Memories for ${child.firstName} that aren't tied to a specific collection.`}
        coverUrl={null}
        revealLine={null}
        isDiary={true}
        addMemoryHref={`/vault/${child.id}/new`}
        childFirstName={child.firstName}
        childId={child.id}
        entries={entries}
        hasWriteAccess={await userHasCapsuleAccess(user.id)}
        squareApplicationId={process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? ""}
        squareLocationId={process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? ""}
      />
    </main>
  );
}
