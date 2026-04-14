import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { CollectionDetail, type CollectionEntryRow } from "./CollectionDetail";

export const metadata = {
  title: "Collection — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  // Resolve the collection + its vault directly — ownership check
  // now uses authorId, which scales to any number of children the
  // parent has without a hardcoded first-child lookup.
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      vault: {
        include: { child: { select: { firstName: true } } },
      },
      entries: {
        orderBy: [
          { orderIndex: "asc" },
          { createdAt: "asc" },
        ],
      },
    },
  });

  if (!collection) redirect("/dashboard");
  if (collection.authorId !== user.id) redirect("/dashboard");

  const entries: CollectionEntryRow[] = collection.entries.map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    body: e.body,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <CollectionDetail
      collectionId={collection.id}
      title={collection.title}
      description={collection.description}
      coverEmoji={collection.coverEmoji}
      childFirstName={collection.vault.child.firstName}
      createdAt={collection.createdAt.toISOString()}
      revealDate={collection.revealDate?.toISOString() ?? null}
      vaultRevealDate={collection.vault.revealDate?.toISOString() ?? null}
      isSealed={collection.isSealed}
      entries={entries}
    />
  );
}
