import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import type { Attachment } from "@/components/editor/MediaAttachments";
import { TopNav } from "@/components/ui/TopNav";
import { r2IsConfigured, signGetUrl, type MediaKind } from "@/lib/r2";

import { MemoryEditorForm, type ExistingEntry } from "./MemoryEditorForm";

export const metadata = {
  title: "Add a memory — untilThen",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Direct-to-editor route for vault owners adding (or editing) a
 * memory.
 *
 * Two modes, picked by query string:
 *   - ?collectionId=…  — new entry destined for that collection
 *   - ?entry=…         — edit an existing entry (any field, any
 *                        media). Only allowed before the vault's
 *                        reveal date passes; past-reveal entries
 *                        redirect back to the vault landing so
 *                        the recipient's experience can't be
 *                        retroactively changed.
 *
 * No query string at all → new entry destined for the Main
 * Capsule Diary (collectionId: null).
 */
export default async function NewMemoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ childId: string }>;
  searchParams: Promise<{
    collectionId?: string | string[];
    entry?: string | string[];
  }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { childId } = await params;
  const sp = await searchParams;
  const requestedCollectionId =
    typeof sp.collectionId === "string" ? sp.collectionId : null;
  const requestedEntryId =
    typeof sp.entry === "string" ? sp.entry : null;

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) redirect("/onboarding");

  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: {
      vault: {
        include: {
          collections: {
            orderBy: { createdAt: "desc" },
            select: { id: true, title: true, revealDate: true },
          },
        },
      },
    },
  });
  if (!child || child.parentId !== user.id || !child.vault) {
    redirect("/dashboard");
  }

  // Verify the requested collection actually belongs to this vault.
  const collectionId = child.vault.collections.find(
    (c) => c.id === requestedCollectionId,
  )
    ? requestedCollectionId
    : null;

  // Optional edit mode — load the existing entry, sign its media,
  // refuse if it's past the relevant reveal date.
  let existingEntry: ExistingEntry | null = null;
  if (requestedEntryId) {
    const entry = await prisma.entry.findUnique({
      where: { id: requestedEntryId },
      include: {
        collection: { select: { id: true, revealDate: true } },
      },
    });
    if (
      !entry ||
      entry.vaultId !== child.vault.id ||
      entry.authorId !== user.id
    ) {
      redirect(`/vault/${childId}`);
    }
    // Reveal-date guard. Entry's effective reveal date is
    // collection.revealDate when in a collection, otherwise the
    // vault.revealDate. Once that date passes, the recipient's
    // experience is frozen and we no longer permit edits.
    const effectiveReveal =
      entry.collection?.revealDate ?? child.vault.revealDate ?? null;
    if (effectiveReveal && effectiveReveal.getTime() <= Date.now()) {
      redirect(`/vault/${childId}`);
    }

    const attachments: Attachment[] = [];
    if (r2IsConfigured() && entry.mediaUrls.length > 0) {
      for (let i = 0; i < entry.mediaUrls.length; i++) {
        const key = entry.mediaUrls[i];
        const rawKind = entry.mediaTypes[i];
        const kind: Attachment["kind"] | null =
          rawKind === "photo" || rawKind === "voice" || rawKind === "video"
            ? (rawKind as MediaKind)
            : null;
        if (!kind) continue;
        try {
          attachments.push({
            key,
            kind,
            viewUrl: await signGetUrl(key),
            name: key.split("/").pop() ?? "attachment",
          });
        } catch {
          /* skip media we can't sign */
        }
      }
    }

    existingEntry = {
      id: entry.id,
      title: entry.title,
      body: entry.body,
      collectionId: entry.collectionId,
      attachments,
    };
  }

  return (
    <>
      <TopNav />
      <MemoryEditorForm
        vaultId={child.vault.id}
        childId={child.id}
        childFirstName={child.firstName}
        revealDate={child.vault.revealDate?.toISOString() ?? null}
        initialCollectionId={existingEntry?.collectionId ?? collectionId}
        collections={child.vault.collections.map((c) => ({
          id: c.id,
          title: c.title,
          revealDate: c.revealDate?.toISOString() ?? null,
        }))}
        existingEntry={existingEntry}
      />
    </>
  );
}
