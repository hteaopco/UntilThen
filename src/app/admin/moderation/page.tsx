import { AdminHeader } from "@/app/admin/AdminHeader";
import { ModerationClient } from "@/app/admin/moderation/ModerationClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HiveFlags = {
  flags?: Partial<Record<"sexual" | "violence" | "hate" | "drugs", number>>;
  top?: Array<{ className: string; score: number }>;
};

type PendingEntry = {
  id: string;
  kind: "vault" | "capsule";
  title: string | null;
  body: string | null;
  authorName: string;
  targetName: string;
  type: string;
  createdAt: string;
  moderationState: "NOT_SCANNED" | "SCANNING" | "PASS" | "FLAGGED" | "FAILED_OPEN";
  moderationFlags: HiveFlags | null;
  moderationRunAt: string | null;
};

export default async function ModerationPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <AdminHeader />
          <p className="text-sm text-red-600">DATABASE_URL is not set.</p>
        </div>
      </main>
    );
  }

  const { prisma } = await import("@/lib/prisma");

  // Two buckets across BOTH row types:
  //  - Scanning: Hive scan still in flight. Shown at top so we
  //    can always see the queue; normally resolves in <10s. The
  //    /api/cron/moderation-cleanup cron reclaims anything stuck
  //    >5 minutes as FAILED_OPEN.
  //  - Pending review: everything awaiting a human decision —
  //    includes both Hive-flagged items (which get a red badge +
  //    category scores) and non-flagged PENDING_REVIEW items.
  //
  // Gift Capsule contributions and Time Capsule entries both
  // follow the same moderationState lifecycle, so they're unioned
  // client-side via the `kind` discriminator.
  const [
    scanningCapsules,
    pendingCapsules,
    scanningEntries,
    pendingEntries,
  ] = await Promise.all([
    prisma.capsuleContribution.findMany({
      where: { moderationState: "SCANNING" },
      include: { capsule: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.capsuleContribution.findMany({
      where: { approvalStatus: "PENDING_REVIEW" },
      include: { capsule: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.entry.findMany({
      where: { moderationState: "SCANNING" },
      include: {
        author: { select: { firstName: true, lastName: true } },
        vault: { include: { child: { select: { firstName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.entry.findMany({
      where: { approvalStatus: "PENDING_REVIEW" },
      include: {
        author: { select: { firstName: true, lastName: true } },
        vault: { include: { child: { select: { firstName: true } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const mapCapsule = (c: (typeof pendingCapsules)[number]): PendingEntry => ({
    id: c.id,
    kind: "capsule" as const,
    title: c.title,
    body: c.body,
    authorName: c.authorName,
    targetName: c.capsule.title ?? "Unknown",
    type: c.type,
    createdAt: c.createdAt.toISOString(),
    moderationState: c.moderationState,
    moderationFlags: c.moderationFlags as HiveFlags | null,
    moderationRunAt: c.moderationRunAt?.toISOString() ?? null,
  });

  const mapEntry = (e: (typeof pendingEntries)[number]): PendingEntry => ({
    id: e.id,
    kind: "vault" as const,
    title: e.title,
    body: e.body,
    authorName:
      [e.author.firstName, e.author.lastName].filter(Boolean).join(" ") ||
      "Vault owner",
    targetName: e.vault.child.firstName
      ? `${e.vault.child.firstName}'s vault`
      : "Vault",
    type: e.type,
    createdAt: e.createdAt.toISOString(),
    moderationState: e.moderationState,
    moderationFlags: e.moderationFlags as HiveFlags | null,
    moderationRunAt: e.moderationRunAt?.toISOString() ?? null,
  });

  const scanningItems: PendingEntry[] = [
    ...scanningCapsules.map(mapCapsule),
    ...scanningEntries.map(mapEntry),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const items: PendingEntry[] = [
    ...pendingCapsules.map(mapCapsule),
    ...pendingEntries.map(mapEntry),
  ].sort((a, b) => {
    // Flagged first, then by createdAt desc.
    const aFlag = a.moderationState === "FLAGGED" ? 0 : 1;
    const bFlag = b.moderationState === "FLAGGED" ? 0 : 1;
    if (aFlag !== bFlag) return aFlag - bFlag;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <AdminHeader />
        <ModerationClient items={items} scanning={scanningItems} />
      </div>
    </main>
  );
}
