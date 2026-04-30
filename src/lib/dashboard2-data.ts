import { effectiveStatus } from "@/lib/capsules";
import { prisma } from "@/lib/prisma";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";
import { ensureUserEmail, ensureUserPhone } from "@/lib/user-sync";
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
  archived: GiftCapsuleCreatingData[];
  received: GiftCapsuleReceivedData[];
}> {
  // Opportunistic email + phone sync so server-side reads of
  // User.email / User.phone stay current with what Clerk has.
  // ensureUserEmail is a one-shot backfill (no-op once filled);
  // ensureUserPhone reconciles each load so changes made in the
  // Clerk user-profile modal propagate without an explicit save.
  await Promise.all([
    ensureUserEmail(clerkUserId),
    ensureUserPhone(clerkUserId),
  ]);

  const [children, creatingCapsules, receivedCapsules] = await Promise.all([
    prisma.child.findMany({
      where: { parentId: userId, vault: { isNot: null } },
      include: { vault: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.memoryCapsule.findMany({
      // Wedding capsules live on a dedicated /weddings/dashboard
      // surface and are intentionally excluded from the Gift
      // Capsule list — the two products have different copy,
      // pricing, and contributor model, so co-listing them
      // confused the empty state and the price chip.
      //
      // Org-attributed (enterprise) capsules are also excluded
      // — those live on /enterprise where they're tracked
      // against the organisation's seat. Showing them in the
      // user's personal Gift Capsule list would double-count
      // them and let users "see" their org capsules as if they
      // were personal purchases.
      where: {
        organiserId: userId,
        occasionType: { not: "WEDDING" },
        organizationId: null,
      },
      include: {
        invites: {
          orderBy: { createdAt: "asc" },
          // Bumped from 4 → 6 because the dashboard card shows 3
          // visible avatars + an overflow counter; pulling 6 lets
          // us tell "+3 more" for capsules with 6+ invitees
          // without a second query.
          take: 6,
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

  // Same R2 sign-on-read pattern for the gift-capsule covers
  // (creating + received). Each row's `coverUrl` is an R2 object
  // key when set; we hand the dashboard cards a short-lived
  // signed GET URL instead. Misses (no key, or signing failed)
  // fall through to null so the card paints its gradient
  // placeholder. One Promise.all keeps the latency floor low.
  const allCapsuleRows = [...creatingCapsules, ...receivedCapsules];
  const signedCapsuleCovers = await Promise.all(
    allCapsuleRows.map(async (c) => {
      if (!c.coverUrl || !r2IsConfigured()) {
        return { id: c.id, url: null as string | null };
      }
      try {
        return { id: c.id, url: await signGetUrl(c.coverUrl) };
      } catch {
        return { id: c.id, url: null as string | null };
      }
    }),
  );
  const capsuleCoverById = new Map(
    signedCapsuleCovers.map((s) => [s.id, s.url]),
  );

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

  // Look up real-user avatars for invitees. Match invite.email →
  // User.email; only matches when the invitee has signed up to
  // untilThen and their User.email column has been populated
  // (new users at signup, existing users on next sign-in via
  // ensureUserEmail). Misses fall back to the placeholder avatar.
  const inviteEmails = Array.from(
    new Set(
      creatingCapsules.flatMap((c) =>
        c.invites.map((i) => i.email.toLowerCase()),
      ),
    ),
  );
  const matchedUsers =
    inviteEmails.length === 0
      ? []
      : await prisma.user.findMany({
          where: { email: { in: inviteEmails } },
          select: { email: true, avatarUrl: true },
        });
  const avatarKeyByEmail = new Map<string, string>();
  for (const u of matchedUsers) {
    if (u.email && u.avatarUrl) avatarKeyByEmail.set(u.email, u.avatarUrl);
  }
  // Sign R2 URLs for every avatar key we matched. Single-pass so
  // we don't await inside the per-card map below.
  const signedAvatars = new Map<string, string>();
  if (avatarKeyByEmail.size > 0 && r2IsConfigured()) {
    await Promise.all(
      Array.from(avatarKeyByEmail.entries()).map(async ([email, key]) => {
        try {
          const url = await signGetUrl(key);
          signedAvatars.set(email, url);
        } catch {
          /* skip — falls through to placeholder */
        }
      }),
    );
  }

  // Single map then split: archived capsules render the same
  // card shape as active ones — they just live behind the
  // 'Archived' pill on the dashboard. Splitting keeps the rest
  // of the data wiring (avatar lookups, contribution counts)
  // shared between the two lists.
  const allCards: GiftCapsuleCreatingData[] = creatingCapsules.map((c) => {
    const inviteNames = c.invites
      .map((i) => i.name?.trim() || i.email.split("@")[0])
      .filter(Boolean);
    const contributorAvatars = c.invites.map((i) => ({
      name: i.name?.trim() || i.email.split("@")[0] || null,
      avatarUrl: signedAvatars.get(i.email.toLowerCase()) ?? null,
    }));
    return {
      id: c.id,
      title: c.title,
      contributorCount: c._count.invites,
      newCount: newByCapsule.get(c.id) ?? 0,
      contributorNames: inviteNames,
      contributorAvatars,
      coverUrl: capsuleCoverById.get(c.id) ?? null,
      // effectiveStatus folds the manual seal (contributionsClosed)
      // and deadline-passed cases back into "SEALED" so the pill
      // reads the same regardless of which path got there.
      status: effectiveStatus(c),
      archivedAt: c.archivedAt ? c.archivedAt.toISOString() : null,
      revealDate: c.revealDate.toISOString(),
    };
  });
  const creating = allCards.filter((c) => !c.archivedAt);
  const archived = allCards.filter((c) => Boolean(c.archivedAt));

  const received: GiftCapsuleReceivedData[] = receivedCapsules.map((c) => {
    const stats = receivedStats.get(c.id) ?? {
      letters: 0,
      photos: 0,
      voices: 0,
    };
    return {
      id: c.id,
      accessToken: c.accessToken,
      title: c.title,
      coverUrl: capsuleCoverById.get(c.id) ?? null,
      entryCount: stats.letters,
      photoCount: stats.photos,
      voiceCount: stats.voices,
    };
  });

  return { vaults, creating, archived, received };
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
