import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import {
  NewEntryForm,
  type CollectionOption,
  type InitialEntry,
} from "@/app/dashboard/new/NewEntryForm";
import type { Attachment } from "@/components/editor/MediaAttachments";
import { r2IsConfigured, signGetUrl, type MediaKind } from "@/lib/r2";

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
    select: { id: true },
  });
  if (!user) redirect("/onboarding");

  // Resolve the entry + its vault directly so this works for
  // any of the user's vaults, not just the first one.
  const entry = await prisma.entry.findUnique({
    where: { id },
    include: {
      collection: true,
      vault: {
        include: {
          child: true,
          collections: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (!entry) redirect("/dashboard");
  if (entry.authorId !== user.id) redirect("/dashboard");

  const unlockDate =
    entry.revealDate ??
    entry.collection?.revealDate ??
    entry.vault.revealDate ??
    null;
  if (unlockDate && new Date(unlockDate).getTime() <= Date.now()) {
    redirect(`/dashboard/entry/${entry.id}/preview`);
  }

  const collections: CollectionOption[] = entry.vault.collections.map((c) => ({
    id: c.id,
    title: c.title,
    coverEmoji: c.coverEmoji,
    revealDate: c.revealDate?.toISOString() ?? null,
  }));

  // Hydrate existing media with presigned GET urls so the editor can
  // render thumbnails / preview audio for what's already attached.
  const attachments: Attachment[] = r2IsConfigured()
    ? await Promise.all(
        entry.mediaUrls.map(async (key, i): Promise<Attachment> => {
          const kind = (entry.mediaTypes[i] ?? "photo") as MediaKind;
          const viewUrl = await signGetUrl(key);
          const name = key.split("/").pop() ?? "attachment";
          return { key, kind, viewUrl, name };
        }),
      )
    : [];

  const initialEntry: InitialEntry = {
    id: entry.id,
    title: entry.title,
    body: entry.body,
    collectionId: entry.collectionId,
    customRevealDate: entry.revealDate
      ? entry.revealDate.toISOString().split("T")[0] ?? null
      : null,
    attachments,
  };

  return (
    <NewEntryForm
      childFirstName={entry.vault.child.firstName}
      childDateOfBirth={entry.vault.child.dateOfBirth?.toISOString() ?? null}
      vaultId={entry.vault.id}
      vaultRevealDate={entry.vault.revealDate?.toISOString() ?? null}
      collections={collections}
      lockedCollectionId={null}
      initialEntry={initialEntry}
    />
  );
}
