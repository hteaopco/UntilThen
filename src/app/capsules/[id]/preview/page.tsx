import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import type {
  RevealCapsule,
  RevealContribution,
  RevealMedia,
} from "@/app/reveal/[token]/RevealExperience";
import { findOwnedCapsule } from "@/lib/capsules";
import { signStockVoiceUrls } from "@/lib/elevenlabs";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

import { PreviewClient } from "./PreviewClient";

export const metadata = {
  title: "Preview capsule — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Organiser-only preview. Loads the capsule + approved
 * contributions, signs media URLs, and hands both to a client
 * wrapper that lets the organiser toggle between:
 *
 *   1. "This capsule" — the actual contributions collected so far
 *      (may be 0 if nothing has come in yet).
 *   2. "Full demo" — seeded contributions with stock media so the
 *      organiser can see what the reveal FEELS like even when
 *      their own capsule only has one note.
 *
 * Both render through the same RevealExperience component, so the
 * preview matches the real recipient flow 1:1.
 */
export default async function CapsulePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const owned = await findOwnedCapsule(userId, id);
  if (!owned.ok) redirect("/dashboard");

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { id },
    include: {
      contributions: {
        where: {
          approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
          moderationState: { notIn: ["SCANNING", "FLAGGED"] },
        },
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!capsule) redirect("/dashboard");

  const r2 = r2IsConfigured();

  // Batch-resolve avatars for any signed-in contributors so the
  // preview picks up profile photos when they exist.
  const contributorClerkIds = Array.from(
    new Set(
      capsule.contributions
        .map((c) => c.clerkUserId)
        .filter((v): v is string => !!v),
    ),
  );
  const avatarByClerkId = new Map<string, string>();
  if (r2 && contributorClerkIds.length > 0) {
    const authors = await prisma.user.findMany({
      where: { clerkId: { in: contributorClerkIds } },
      select: { clerkId: true, avatarUrl: true },
    });
    await Promise.all(
      authors
        .filter((a) => a.avatarUrl)
        .map(async (a) => {
          try {
            avatarByClerkId.set(a.clerkId, await signGetUrl(a.avatarUrl!));
          } catch {
            /* fall back to initials */
          }
        }),
    );
  }

  const realContributions: RevealContribution[] = await Promise.all(
    capsule.contributions.map(async (c) => {
      const media: RevealMedia[] = [];
      if (r2 && c.mediaUrls.length > 0) {
        for (let i = 0; i < c.mediaUrls.length; i++) {
          const key = c.mediaUrls[i];
          const rawKind = c.mediaTypes[i];
          if (rawKind !== "photo" && rawKind !== "voice" && rawKind !== "video")
            continue;
          try {
            media.push({ kind: rawKind, url: await signGetUrl(key) });
          } catch {
            /* skip */
          }
        }
      }
      return {
        id: c.id,
        authorName: c.authorName,
        authorAvatarUrl: c.clerkUserId
          ? avatarByClerkId.get(c.clerkUserId) ?? null
          : null,
        type: c.type,
        title: c.title,
        body: c.body,
        media,
        createdAt: c.createdAt.toISOString(),
      };
    }),
  );

  // Pretend the recipient has never opened it — we always want
  // the preview to start at the Entry screen. hasCompleted=false
  // forces Phase 1 regardless of the real capsule's state.
  const realCapsule: RevealCapsule = {
    id: capsule.id,
    title: capsule.title,
    recipientName: capsule.recipientName,
    occasionType: capsule.occasionType,
    tone: capsule.tone,
    revealDate: capsule.revealDate.toISOString(),
    isFirstOpen: true,
    hasCompleted: false,
  };

  // Sign the stock-voice URLs so the "Full demo" toggle plays the
  // admin-uploaded MP3 (gift capsule = capsule-birthday slot)
  // instead of the W3C horse fallback baked into the static
  // mockData arrays.
  const stockVoices = await signStockVoiceUrls();

  return (
    <PreviewClient
      realCapsule={realCapsule}
      realContributions={realContributions}
      capsuleId={capsule.id}
      stockVoices={stockVoices}
    />
  );
}
