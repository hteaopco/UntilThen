import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import type {
  RevealCapsule,
  RevealContribution,
  RevealMedia,
} from "@/app/reveal/[token]/RevealExperience";
import { signStockVoiceUrls } from "@/lib/elevenlabs";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

import { VaultPreviewClient } from "./PreviewClient";

export const metadata = {
  title: "Reveal preview — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Organiser-only preview of a child vault's full reveal — what
 * the child will see when the vault opens on the reveal date.
 *
 * Loads every sealed + approved Entry across both the Main Diary
 * (collectionId: null) and all the child's Collections, resolves
 * author names + signed media URLs, and hands everything to a
 * client wrapper that renders through the same RevealExperience
 * component the gift-capsule recipient sees at /reveal/[token].
 *
 * Auth: Clerk-gated + ownership enforced (parent-of-child only).
 */
export default async function VaultPreviewPage({
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
    select: { id: true, firstName: true, displayName: true },
  });
  if (!user) redirect("/onboarding");

  const child = await prisma.child.findFirst({
    where: { id: childId, parentId: user.id },
    include: {
      vault: {
        include: {
          entries: {
            where: {
              isSealed: true,
              approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
              // Hide entries still mid-Hive-scan or flagged for
              // admin review so the reveal preview matches what
              // a recipient would actually see.
              moderationState: { notIn: ["SCANNING", "FLAGGED"] },
            },
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { firstName: true, displayName: true } },
              collection: { select: { title: true } },
            },
          },
          revealSong: { select: { id: true, r2Key: true } },
        },
      },
    },
  });
  if (!child || !child.vault) redirect("/dashboard");

  const r2 = r2IsConfigured();

  const contributions: RevealContribution[] = await Promise.all(
    child.vault.entries.map(async (entry) => {
      const media: RevealMedia[] = [];
      if (r2 && entry.mediaUrls.length > 0) {
        for (let i = 0; i < entry.mediaUrls.length; i++) {
          const key = entry.mediaUrls[i];
          const rawKind = entry.mediaTypes[i];
          if (
            rawKind !== "photo" &&
            rawKind !== "voice" &&
            rawKind !== "video"
          )
            continue;
          try {
            media.push({ kind: rawKind, url: await signGetUrl(key) });
          } catch {
            /* skip */
          }
        }
      }

      // Per-capsule "what they call you" wins over the user's
      // global display name. Falls through to displayName /
      // firstName when the capsule hasn't been customised.
      const authorName =
        child.parentDisplayName?.trim() ||
        entry.author.displayName?.trim() ||
        entry.author.firstName ||
        "Someone who loves you";

      return {
        id: entry.id,
        authorName,
        authorAvatarUrl: null,
        type: entry.type,
        title: entry.title,
        body: entry.body,
        media,
        createdAt: entry.createdAt.toISOString(),
        collectionTitle: entry.collection?.title ?? null,
      };
    }),
  );

  const capsule: RevealCapsule = {
    id: child.vault.id,
    title: `${child.firstName}'s Capsule`,
    recipientName: child.firstName,
    occasionType: "OTHER",
    tone: "LOVE",
    revealDate:
      child.vault.revealDate?.toISOString() ??
      new Date(Date.now() + 365 * 86400000).toISOString(),
    isFirstOpen: true,
    // Preview always starts at Phase 1. We don't want hasCompleted
    // short-circuiting to the gallery even if the parent has
    // previewed before.
    hasCompleted: false,
  };

  // BUILD-mode curator output. Falls back to Random in
  // VaultPreviewClient → RevealExperience when this is empty.
  const curatedSlides =
    child.vault.revealMode === "BUILD"
      ? parseCuratedSlides(child.vault.curatedSlides)
      : [];

  // Per-vault background music — sign the R2 key so the audio
  // element can stream it without exposing the bucket.
  let musicUrl: string | null = null;
  if (r2 && child.vault.revealSong?.r2Key) {
    try {
      musicUrl = await signGetUrl(child.vault.revealSong.r2Key);
    } catch {
      musicUrl = null;
    }
  }

  // Sign the stock-voice URLs so the "Full demo" voice card plays
  // the admin-uploaded vault-mom MP3 instead of the W3C horse
  // fallback baked into the static MOCK_CONTRIBUTIONS export.
  const stockVoices = await signStockVoiceUrls();

  return (
    <VaultPreviewClient
      realCapsule={capsule}
      realContributions={contributions}
      childId={child.id}
      curatedSlides={curatedSlides}
      musicUrl={musicUrl}
      stockVoices={stockVoices}
    />
  );
}

function parseCuratedSlides(
  raw: unknown,
): { entryId: string; view: "letter" | "VOICE" | "PHOTO" | "VIDEO" }[] {
  if (!Array.isArray(raw)) return [];
  const out: { entryId: string; view: "letter" | "VOICE" | "PHOTO" | "VIDEO" }[] = [];
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
