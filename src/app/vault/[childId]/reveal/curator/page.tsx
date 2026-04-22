import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { TopNav } from "@/components/ui/TopNav";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

import { CuratorClient, type CuratorEntry, type CuratorSlide } from "./CuratorClient";

export const metadata = {
  title: "Customize the reveal — untilThen",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Curator surface for vault.revealMode === BUILD. Loads every
 * sealed entry on this vault, expands each into its modality
 * slides (letter / voice / photo / video), and hands them to the
 * client as a "library" the user picks 5 from.
 *
 * Saving writes to /api/account/vaults/[id]/reveal which we built
 * alongside the Build/Random pill. Preview re-uses
 * VaultPreviewClient with a temporary { contributions } payload
 * derived from the picked slides + selected song.
 */
export default async function CuratorPage({
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
    include: {
      vault: {
        include: {
          entries: {
            where: { isSealed: true, approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] } },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              title: true,
              body: true,
              type: true,
              mediaUrls: true,
              mediaTypes: true,
              createdAt: true,
              collection: { select: { id: true, title: true } },
            },
          },
          revealSong: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!child || child.parentId !== user.id || !child.vault) {
    redirect("/dashboard");
  }

  const r2 = r2IsConfigured();

  // Build a flat library of slides (one per modality per entry).
  // We sign every media URL up front so the picker's previews +
  // the inline reveal preview both work without a second round
  // trip per click.
  const library: CuratorEntry[] = await Promise.all(
    child.vault.entries.map(async (e) => {
      const signedMedia: { kind: "photo" | "voice" | "video"; url: string }[] = [];
      if (r2) {
        for (let i = 0; i < e.mediaUrls.length; i++) {
          const key = e.mediaUrls[i];
          const rawKind = e.mediaTypes[i];
          if (rawKind !== "photo" && rawKind !== "voice" && rawKind !== "video")
            continue;
          try {
            signedMedia.push({ kind: rawKind, url: await signGetUrl(key) });
          } catch {
            /* skip */
          }
        }
      }
      const bodyText = (e.body ?? "").replace(/<[^>]+>/g, " ").trim();
      return {
        id: e.id,
        title: e.title,
        bodySnippet: bodyText.slice(0, 200),
        bodyHasContent: bodyText.length > 0 || (e.title?.trim().length ?? 0) > 0,
        type: e.type,
        media: signedMedia,
        createdAt: e.createdAt.toISOString(),
        collectionTitle: e.collection?.title ?? null,
      };
    }),
  );

  const initialSlides: CuratorSlide[] = parseInitialSlides(child.vault.curatedSlides);

  return (
    <>
      <TopNav />
      <CuratorClient
        vaultId={child.vault.id}
        childId={child.id}
        childFirstName={child.firstName}
        revealDate={child.vault.revealDate?.toISOString() ?? null}
        library={library}
        initialSlides={initialSlides}
        initialSongId={child.vault.revealSongId}
      />
    </>
  );
}

function parseInitialSlides(raw: unknown): CuratorSlide[] {
  if (!Array.isArray(raw)) return [];
  const out: CuratorSlide[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    if (typeof obj.entryId !== "string") continue;
    if (
      obj.view !== "letter" &&
      obj.view !== "VOICE" &&
      obj.view !== "PHOTO" &&
      obj.view !== "VIDEO"
    )
      continue;
    out.push({ entryId: obj.entryId, view: obj.view });
  }
  return out;
}
