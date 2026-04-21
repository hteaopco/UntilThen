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
 * Real (DB-backed) collection landing. Shares the exact same
 * CollectionLandingView as the synthetic Main Capsule Diary so UI
 * tweaks land once and reflect in both surfaces.
 */
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { id } = await params;

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) redirect("/onboarding");

  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      vault: {
        include: { child: { select: { id: true, firstName: true, dateOfBirth: true } } },
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

  if (!collection) redirect("/dashboard");
  if (collection.authorId !== user.id) redirect("/dashboard");

  const entries: CollectionLandingEntry[] = collection.entries.map((e) => ({
    id: e.id,
    title: e.title,
    body: e.body,
    type: e.type,
    mediaTypes: e.mediaTypes,
    createdAt: e.createdAt.toISOString(),
  }));

  // Sign the cover key for rendering. Bucket stays private; URL is
  // short-lived. Gracefully falls back to the gradient BookHeart
  // placeholder if R2 isn't configured or signing fails.
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
      />
    </main>
  );
}
