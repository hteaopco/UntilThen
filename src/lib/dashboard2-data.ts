import { prisma } from "@/lib/prisma";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";
import type { VaultCardData } from "@/components/dashboard2/VaultCard";
import type { GiftCapsuleCreatingData } from "@/components/dashboard2/GiftCapsuleCreatingCard";
import type { GiftCapsuleReceivedData } from "@/components/dashboard2/GiftCapsuleReceivedCard";

type EntryLite = {
  vaultId: string;
  type: string;
  mediaTypes: string[];
};

type ContribLite = {
  capsuleId: string;
  type: string;
  mediaTypes: string[];
};

/**
 * All server data the dashboard2 page needs, fetched in parallel. Keeps
 * query logic out of the page component so the component stays layout-
 * focused and the data shape maps 1:1 to the card components.
 */
export async function loadDashboard2Data({
  userId,
  clerkUserId,
}: {
  userId: string;
  clerkUserId: string;
}): Promise<{
  vaults: VaultCardData[];
  creating: GiftCapsuleCreatingData[];
  received: GiftCapsuleReceivedData[];
}> {
  const [children, creatingCapsules, receivedCapsules] = await Promise.all([
    prisma.child.findMany({
      where: { parentId: userId, vault: { isNot: null } },
      include: { vault: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.memoryCapsule.findMany({
      where: { organiserId: userId },
      include: {
        invites: {
          orderBy: { createdAt: "asc" },
          take: 4,
          select: { name: true, email: true },
        },
        _count: { select: { invites: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.memoryCapsule.findMany({
      where: { recipientClerkId: clerkUserId },
      orderBy: { revealDate: "asc" },
    }),
  ]);

  const vaultIds = children
    .map((c) => c.vault?.id)
    .filter((id): id is string => Boolean(id));
  const creatingIds = creatingCapsules.map((c) => c.id);
  const receivedIds = receivedCapsules.map((c) => c.id);

  const [entries, newCounts, receivedContributions] = await Promise.all([
    vaultIds.length === 0
      ? Promise.resolve<EntryLite[]>([])
      : prisma.entry.findMany({
          where: {
            vaultId: { in: vaultIds },
            isSealed: true,
            approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
          },
          select: { vaultId: true, type: true, mediaTypes: true },
        }),
    creatingIds.length === 0
      ? Promise.resolve<{ capsuleId: string; _count: number }[]>([])
      : countNewPerCapsule(creatingIds),
    receivedIds.length === 0
      ? Promise.resolve<ContribLite[]>([])
      : prisma.capsuleContribution.findMany({
          where: {
            capsuleId: { in: receivedIds },
            approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
          },
          select: { capsuleId: true, type: true, mediaTypes: true },
        }),
  ]);

  const vaultStats = aggregateStats(entries, "vaultId");
  const receivedStats = aggregateStats(receivedContributions, "capsuleId");
  const newByCapsule = new Map(newCounts.map((n) => [n.capsuleId, n._count]));

  // Sign a short-lived GET URL for each vault cover so the bucket
  // can stay private. Falls back to null if R2 isn't configured —
  // the card component then renders its gradient placeholder.
  const signedCovers = await Promise.all(
    children.map(async (c) => {
      const key = c.vault?.coverUrl;
      if (!key || !r2IsConfigured()) return { vaultId: c.vault?.id ?? "", url: null };
      try {
        const url = await signGetUrl(key);
        return { vaultId: c.vault!.id, url };
      } catch {
        return { vaultId: c.vault!.id, url: null };
      }
    }),
  );
  const coverByVault = new Map(signedCovers.map((s) => [s.vaultId, s.url]));

  const vaults: VaultCardData[] = children
    .filter((c) => c.vault !== null)
    .map((c) => {
      const stats = vaultStats.get(c.vault!.id) ?? {
        letters: 0,
        photos: 0,
        voices: 0,
      };
      return {
        childId: c.id,
        vaultId: c.vault!.id,
        firstName: c.firstName,
        coverUrl: coverByVault.get(c.vault!.id) ?? null,
        letterCount: stats.letters,
        photoCount: stats.photos,
        voiceCount: stats.voices,
      };
    });

  const creating: GiftCapsuleCreatingData[] = creatingCapsules.map((c) => {
    const inviteNames = c.invites
      .map((i) => i.name?.trim() || i.email.split("@")[0])
      .filter(Boolean);
    return {
      id: c.id,
      title: c.title,
      contributorCount: c._count.invites,
      newCount: newByCapsule.get(c.id) ?? 0,
      contributorNames: inviteNames,
      coverUrl: null,
      status: c.status,
    };
  });

  const received: GiftCapsuleReceivedData[] = receivedCapsules.map((c) => {
    const stats = receivedStats.get(c.id) ?? {
      letters: 0,
      photos: 0,
      voices: 0,
    };
    return {
      id: c.id,
      title: c.title,
      coverUrl: null,
      entryCount: stats.letters,
      photoCount: stats.photos,
      voiceCount: stats.voices,
    };
  });

  return { vaults, creating, received };
}

function aggregateStats(
  rows: { type: string; mediaTypes: string[] }[],
  idKey: "vaultId" | "capsuleId",
): Map<string, { letters: number; photos: number; voices: number }> {
  // "letters" counts text-only memories so the three pills stay
  // distinct — an entry with a photo attached is a photo, not a
  // letter + a photo.
  const out = new Map<string, { letters: number; photos: number; voices: number }>();
  for (const r of rows) {
    const key = (r as unknown as Record<string, string>)[idKey];
    const current = out.get(key) ?? { letters: 0, photos: 0, voices: 0 };
    const hasPhoto = r.type === "PHOTO" || r.mediaTypes.includes("photo");
    const hasVoice = r.type === "VOICE" || r.mediaTypes.includes("voice");
    const hasVideo = r.type === "VIDEO" || r.mediaTypes.includes("video");
    if (hasPhoto) current.photos += 1;
    if (hasVoice) current.voices += 1;
    if (r.type === "TEXT" && !hasPhoto && !hasVoice && !hasVideo) {
      current.letters += 1;
    }
    out.set(key, current);
  }
  return out;
}

/**
 * "New" = pending-review contributions + AUTO_APPROVED contributions
 * from the last 7 days that weren't authored by the organiser. Matches
 * the badge count semantics so the card pill and the dashboard chip
 * agree.
 */
async function countNewPerCapsule(
  capsuleIds: string[],
): Promise<{ capsuleId: string; _count: number }[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
  const [pending, recent] = await Promise.all([
    prisma.capsuleContribution.groupBy({
      by: ["capsuleId"],
      where: {
        capsuleId: { in: capsuleIds },
        approvalStatus: "PENDING_REVIEW",
      },
      _count: { _all: true },
    }),
    prisma.capsuleContribution.groupBy({
      by: ["capsuleId"],
      where: {
        capsuleId: { in: capsuleIds },
        approvalStatus: "AUTO_APPROVED",
        createdAt: { gte: sevenDaysAgo },
        clerkUserId: null,
      },
      _count: { _all: true },
    }),
  ]);

  const totals = new Map<string, number>();
  for (const row of pending) totals.set(row.capsuleId, (totals.get(row.capsuleId) ?? 0) + row._count._all);
  for (const row of recent) totals.set(row.capsuleId, (totals.get(row.capsuleId) ?? 0) + row._count._all);

  return Array.from(totals.entries()).map(([capsuleId, _count]) => ({ capsuleId, _count }));
}
