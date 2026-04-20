import { prisma } from "@/lib/prisma";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

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
};

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
    include: { vault: true },
  });
  if (!child || child.parentId !== user.id || !child.vault) return null;

  const collections = await prisma.collection.findMany({
    where: { vaultId: child.vault.id },
    orderBy: [{ revealDate: "asc" }, { createdAt: "asc" }],
    include: {
      entries: {
        where: {
          isSealed: true,
          approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
        },
        select: { type: true, mediaTypes: true },
      },
    },
  });

  let signedCoverUrl: string | null = null;
  if (child.vault.coverUrl && r2IsConfigured()) {
    try {
      signedCoverUrl = await signGetUrl(child.vault.coverUrl);
    } catch {
      signedCoverUrl = null;
    }
  }

  const collectionRows: CollectionRow[] = collections.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    coverUrl: null,
    revealDate: c.revealDate,
    isSealed: c.isSealed,
    stats: aggregateEntryStats(c.entries),
  }));

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
    },
    collections: collectionRows,
  };
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
