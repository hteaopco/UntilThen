import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { MemoryEditorForm } from "./MemoryEditorForm";

export const metadata = {
  title: "Add a memory — untilThen",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Direct-to-editor route for vault owners adding a new memory. Modeled
 * on the gift-capsule contributor editor at /contribute/capsule/[token]
 * but authenticated via Clerk and writing to the Entry table rather
 * than CapsuleContribution.
 *
 * Accepts an optional ?collectionId= query param. When absent the
 * entry lands with collectionId=null, which is how the vault's "Main
 * Capsule Diary" bucket is represented today.
 */
export default async function NewMemoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ childId: string }>;
  searchParams: Promise<{ collectionId?: string | string[] }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { childId } = await params;
  const sp = await searchParams;
  const requestedCollectionId =
    typeof sp.collectionId === "string" ? sp.collectionId : null;

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
            select: { id: true, title: true },
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

  return (
    <MemoryEditorForm
      vaultId={child.vault.id}
      childId={child.id}
      childFirstName={child.firstName}
      revealDate={child.vault.revealDate?.toISOString() ?? null}
      initialCollectionId={collectionId}
    />
  );
}
