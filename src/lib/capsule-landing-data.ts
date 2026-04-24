import { prisma } from "@/lib/prisma";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

export type CuratedSlide = {
  entryId: string;
  view: "letter" | "VOICE" | "PHOTO" | "VIDEO";
};

export type CapsuleLandingData = {
  child: {
    id: string;
    firstName: string;
    dateOfBirth: Date | null;
  };
  vault: {
    id: string;
    coverUrl: string | null;
    revealDate: Date | null;
    revealMode: "RANDOM" | "BUILD";
    curatedSlides: CuratedSlide[];
    revealSongId: string | null;
    revealSongName: string | null;
  };
  collections: CollectionRow[];
};

export type CollectionRow = {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  revealDate: Date | null;
  isSealed: boolean;
  stats: { photos: number; videos: number; letters: number; voices: number };
  /** True for the synthetic "Main Capsule Diary" row that represents
   * entries with collectionId=null. Used by the landing page to
   * tweak card behavior (different link, hidden edit, etc.). */
  isMainDiary?: boolean;
};

export const MAIN_DIARY_ID = "main-diary";

/**
 * All data the capsule landing page needs. Validates ownership and
 * returns null when the child doesn't belong to the caller. Signs the
 * vault cover URL so the bucket can stay private.
 */
export async function loadCapsuleLandingData({
  userId,
  childId,
}: {
  userId: string;
  childId: string;
}): Promise<CapsuleLandingData | null> {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) return null;

  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: {
      vault: {
        include: {
          revealSong: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!child || child.parentId !== user.id || !child.vault) return null;

  // Stats queries filter out entries that haven't cleared Hive
  // yet (SCANNING) or got flagged (FLAGGED) — same contract as
  // CapsuleContribution's vault landing. Otherwise the
  // letter/photo/voice counts on capsule cards would include
  // unmoderated content that the reader hasn't actually been
  // allowed to see.
  const [collections, looseEntries] = await Promise.all([
    prisma.collection.findMany({
      where: { vaultId: child.vault.id },
      orderBy: [{ revealDate: "asc" }, { createdAt: "asc" }],
      include: {
        entries: {
          where: {
            isSealed: true,
            approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
            moderationState: { notIn: ["SCANNING", "FLAGGED"] },
          },
          select: { type: true, mediaTypes: true },
        },
      },
    }),
    prisma.entry.findMany({
      where: {
        vaultId: child.vault.id,
        collectionId: null,
        isSealed: true,
        approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
        moderationState: { notIn: ["SCANNING", "FLAGGED"] },
      },
      select: { type: true, mediaTypes: true },
    }),
  ]);

  let signedCoverUrl: string | null = null;
  if (child.vault.coverUrl && r2IsConfigured()) {
    try {
      signedCoverUrl = await signGetUrl(child.vault.coverUrl);
    } catch {
      signedCoverUrl = null;
    }
  }

  // Sign each collection's cover in parallel so real thumbnails
  // render on the vault landing — otherwise the gradient
  // placeholder keeps showing even after a cover was uploaded.
  const signedCollectionCovers = await Promise.all(
    collections.map(async (c) => {
      if (!c.coverUrl || !r2IsConfigured()) return { id: c.id, url: null };
      try {
        return { id: c.id, url: await signGetUrl(c.coverUrl) };
      } catch {
        return { id: c.id, url: null };
      }
    }),
  );
  const coverByCollection = new Map(
    signedCollectionCovers.map((x) => [x.id, x.url]),
  );

  const mainDiaryRow: CollectionRow = {
    id: MAIN_DIARY_ID,
    title: "Main Capsule Diary",
    description: "Memories not tied to a specific collection.",
    coverUrl: null,
    revealDate: child.vault.revealDate,
    isSealed: false,
    stats: aggregateEntryStats(looseEntries),
    isMainDiary: true,
  };

  const collectionRows: CollectionRow[] = [
    mainDiaryRow,
    ...collections.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      coverUrl: coverByCollection.get(c.id) ?? null,
      revealDate: c.revealDate,
      isSealed: c.isSealed,
      stats: aggregateEntryStats(c.entries),
    })),
  ];

  return {
    child: {
      id: child.id,
      firstName: child.firstName,
      dateOfBirth: child.dateOfBirth,
    },
    vault: {
      id: child.vault.id,
      coverUrl: signedCoverUrl,
      revealDate: child.vault.revealDate,
      revealMode: child.vault.revealMode,
      curatedSlides: parseCuratedSlides(child.vault.curatedSlides),
      revealSongId: child.vault.revealSongId,
      revealSongName: child.vault.revealSong?.name ?? null,
    },
    collections: collectionRows,
  };
}

function parseCuratedSlides(raw: unknown): CuratedSlide[] {
  if (!Array.isArray(raw)) return [];
  const out: CuratedSlide[] = [];
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

function aggregateEntryStats(
  entries: { type: string; mediaTypes: string[] }[],
): { photos: number; videos: number; letters: number; voices: number } {
  const stats = { photos: 0, videos: 0, letters: 0, voices: 0 };
  for (const e of entries) {
    const isPhoto = e.type === "PHOTO" || e.mediaTypes.includes("photo");
    const isVideo = e.type === "VIDEO" || e.mediaTypes.includes("video");
    const isVoice = e.type === "VOICE" || e.mediaTypes.includes("voice");
    if (isPhoto) stats.photos += 1;
    if (isVideo) stats.videos += 1;
    if (isVoice) stats.voices += 1;
    if (e.type === "TEXT" && !isPhoto && !isVoice && !isVideo) stats.letters += 1;
  }
  return stats;
}

/**
 * Age a child will be on a given reveal date. Returns null if either
 * input is missing or the reveal date is in the past relative to the
 * DOB (shouldn't happen but defensive).
 */
export function ageOnDate(dob: Date | null, reveal: Date | null): number | null {
  if (!dob || !reveal) return null;
  let age = reveal.getFullYear() - dob.getFullYear();
  const m = reveal.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && reveal.getDate() < dob.getDate())) age -= 1;
  return age < 0 ? null : age;
}
