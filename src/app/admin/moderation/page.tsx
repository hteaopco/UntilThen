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
  moderationState: "NOT_SCANNED" | "PASS" | "FLAGGED" | "FAILED_OPEN";
  moderationFlags: HiveFlags | null;
  moderationRunAt: string | null;
};

export default async function ModerationPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <AdminHeader />
          <p className="text-sm text-red-600">DATABASE_URL is not set.</p>
        </div>
      </main>
    );
  }

  const { prisma } = await import("@/lib/prisma");

  // Every PENDING_REVIEW contribution. Hive-flagged items live
  // in this bucket too (FLAGGED items always get approvalStatus
  // forced to PENDING_REVIEW at submit time) — the client puts
  // them at the top and renders the category + score.
  const capsuleContributions = await prisma.capsuleContribution.findMany({
    where: { approvalStatus: "PENDING_REVIEW" },
    include: { capsule: true },
    orderBy: { createdAt: "desc" },
  });

  const items: PendingEntry[] = capsuleContributions
    .map((c) => ({
      id: c.id,
      kind: "capsule" as const,
      title: c.title,
      body: c.body,
      authorName: c.authorName,
      targetName: (c.capsule as Record<string, unknown>)?.title as string ?? "Unknown",
      type: c.type,
      createdAt: c.createdAt.toISOString(),
      moderationState: c.moderationState,
      moderationFlags: c.moderationFlags as HiveFlags | null,
      moderationRunAt: c.moderationRunAt?.toISOString() ?? null,
    }))
    // Flagged first — admins should see those at the top.
    .sort((a, b) => {
      const aFlag = a.moderationState === "FLAGGED" ? 0 : 1;
      const bFlag = b.moderationState === "FLAGGED" ? 0 : 1;
      if (aFlag !== bFlag) return aFlag - bFlag;
      return b.createdAt.localeCompare(a.createdAt);
    });

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <AdminHeader />
        <ModerationClient items={items} />
      </div>
    </main>
  );
}
