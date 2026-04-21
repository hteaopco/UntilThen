import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import {
  CollectionLandingView,
  type CollectionLandingEntry,
} from "@/components/capsule-landing/CollectionLandingView";
import { TopNav } from "@/components/ui/TopNav";
import { formatLong } from "@/lib/dateFormatters";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";
import { ageOnDate } from "@/lib/capsule-landing-data";

export const metadata = {
  title: "Collection — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Real (DB-backed) collection landing at
 * /vault/{childId}/collection/{collectionId}. Nested under the vault
 * route so every collection surface lives in one consistent tree:
 *
 *   /vault/{childId}                               ← vault landing
 *   /vault/{childId}/diary                         ← Main Capsule Diary
 *   /vault/{childId}/collection/{collectionId}     ← a named Collection
 *   /vault/{childId}/new                           ← memory editor
 *
 * Shares CollectionLandingView with the diary so UI tweaks land once.
 */
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ childId: string; collectionId: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { childId, collectionId } = await params;

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) redirect("/onboarding");

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: {
      vault: {
        include: {
          child: {
            select: { id: true, firstName: true, dateOfBirth: true, parentId: true },
          },
        },
      },
      entries: {
        where: {
          isSealed: true,
          approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
        },
        orderBy: [
          { orderIndex: "asc" },
          { createdAt: "desc" },
        ],
        select: {
          id: true,
          title: true,
          body: true,
          type: true,
          mediaTypes: true,
          createdAt: true,
        },
      },
    },
  });

  if (!collection) redirect(`/vault/${childId}`);
  if (collection.authorId !== user.id) redirect(`/vault/${childId}`);
  // Defensive: if the URL's childId doesn't match the collection's
  // parent child, redirect to the correct vault so the breadcrumb
  // stays honest.
  if (collection.vault.child.id !== childId) {
    redirect(`/vault/${collection.vault.child.id}/collection/${collection.id}`);
  }

  // Sibling collections on the same vault — feed the "move entries
  // to…" dropdown inside DeleteCollectionModal.
  const siblings = await prisma.collection.findMany({
    where: {
      vaultId: collection.vaultId,
      NOT: { id: collection.id },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true },
  });

  const entries: CollectionLandingEntry[] = collection.entries.map((e) => ({
    id: e.id,
    title: e.title,
    body: e.body,
    type: e.type,
    mediaTypes: e.mediaTypes,
    createdAt: e.createdAt.toISOString(),
  }));

  let signedCoverUrl: string | null = null;
  if (collection.coverUrl && r2IsConfigured()) {
    try {
      signedCoverUrl = await signGetUrl(collection.coverUrl);
    } catch {
      signedCoverUrl = null;
    }
  }

  const age = ageOnDate(
    collection.vault.child.dateOfBirth,
    collection.revealDate,
  );
  const revealLine = collection.revealDate
    ? `Opens ${formatLong(collection.revealDate.toISOString())}${age !== null ? ` · Age ${age}` : ""}`
    : "Reveal date not set yet";

  return (
    <main className="min-h-screen bg-cream pb-16">
      <TopNav />
      <CollectionLandingView
        title={collection.title}
        description={collection.description}
        coverUrl={signedCoverUrl}
        revealLine={revealLine}
        isDiary={false}
        addMemoryHref={`/vault/${collection.vault.child.id}/new?collectionId=${collection.id}`}
        childFirstName={collection.vault.child.firstName}
        entries={entries}
        collectionId={collection.id}
        childId={collection.vault.child.id}
        vaultRevealDate={collection.vault.revealDate?.toISOString() ?? null}
        collectionRevealDate={collection.revealDate?.toISOString() ?? null}
        siblingCollections={siblings}
      />
    </main>
  );
}
