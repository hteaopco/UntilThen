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
  searchParams: Promise<{
    collectionId?: string | string[];
    vault?: string | string[];
  }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  if (!process.env.DATABASE_URL) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const collectionIdParam =
    typeof sp.collectionId === "string" ? sp.collectionId : null;
  const vaultParam = typeof sp.vault === "string" ? sp.vault : null;

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      children: {
        include: {
          vault: {
            include: {
              collections: { orderBy: { createdAt: "desc" } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) redirect("/onboarding");

  const childrenWithVaults = user.children.filter((c) => c.vault);
  if (childrenWithVaults.length === 0) redirect("/onboarding");

  // Pick the target child: URL `?vault=<childId>` if present and
  // owned; otherwise fall back to the first child so the legacy
  // single-vault flow still works.
  const targetChild =
    childrenWithVaults.find((c) => c.id === vaultParam) ??
    childrenWithVaults[0];
  const vault = targetChild.vault!;

  const collections: CollectionOption[] = vault.collections.map((c) => ({
    id: c.id,
    title: c.title,
    coverEmoji: c.coverEmoji,
    revealDate: c.revealDate?.toISOString() ?? null,
  }));

  // Verify the lock target actually belongs to this vault.
  const lockedCollection = collectionIdParam
    ? collections.find((c) => c.id === collectionIdParam) ?? null
    : null;

  return (
    <NewEntryForm
      childFirstName={targetChild.firstName}
      childDateOfBirth={targetChild.dateOfBirth?.toISOString() ?? null}
      vaultId={vault.id}
      vaultRevealDate={vault.revealDate?.toISOString() ?? null}
      collections={collections}
      lockedCollectionId={lockedCollection?.id ?? null}
    />
  );
}
