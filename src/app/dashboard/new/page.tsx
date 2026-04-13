import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { NewEntryForm, type CollectionOption } from "./NewEntryForm";

export const metadata = {
  title: "Write a letter — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ collectionId?: string | string[] }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  if (!process.env.DATABASE_URL) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const collectionIdParam =
    typeof sp.collectionId === "string" ? sp.collectionId : null;

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      children: {
        include: {
          vault: {
            include: {
              collections: {
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) redirect("/onboarding");

  const child = user.children[0];
  if (!child || !child.vault) redirect("/onboarding");

  const collections: CollectionOption[] = child.vault.collections.map((c) => ({
    id: c.id,
    title: c.title,
    coverEmoji: c.coverEmoji,
    revealDate: c.revealDate?.toISOString() ?? null,
  }));

  // Verify the lock target actually belongs to the user.
  const lockedCollection = collectionIdParam
    ? collections.find((c) => c.id === collectionIdParam) ?? null
    : null;

  return (
    <NewEntryForm
      childFirstName={child.firstName}
      vaultRevealDate={child.vault.revealDate?.toISOString() ?? null}
      collections={collections}
      lockedCollectionId={lockedCollection?.id ?? null}
    />
  );
}
