import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import {
  NewEntryForm,
  type CollectionOption,
  type InitialEntry,
} from "@/app/dashboard/new/NewEntryForm";

export const metadata = {
  title: "Edit a moment — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EditEntryPage({
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

  const entry = await prisma.entry.findUnique({
    where: { id },
    include: { collection: true },
  });
  if (!entry) redirect("/dashboard");
  if (entry.authorId !== user.id) redirect("/dashboard");

  // If the reveal date has passed, lock the entry from further edits.
  const unlockDate =
    entry.revealDate ??
    entry.collection?.revealDate ??
    child.vault.revealDate ??
    null;
  if (unlockDate && new Date(unlockDate).getTime() <= Date.now()) {
    redirect(`/dashboard/entry/${entry.id}/preview`);
  }

  const collections: CollectionOption[] = child.vault.collections.map((c) => ({
    id: c.id,
    title: c.title,
    coverEmoji: c.coverEmoji,
    revealDate: c.revealDate?.toISOString() ?? null,
  }));

  const initialEntry: InitialEntry = {
    id: entry.id,
    title: entry.title,
    body: entry.body,
    collectionId: entry.collectionId,
    customRevealDate: entry.revealDate
      ? entry.revealDate.toISOString().split("T")[0] ?? null
      : null,
  };

  return (
    <NewEntryForm
      childFirstName={child.firstName}
      vaultRevealDate={child.vault.revealDate?.toISOString() ?? null}
      collections={collections}
      lockedCollectionId={null}
      initialEntry={initialEntry}
    />
  );
}
