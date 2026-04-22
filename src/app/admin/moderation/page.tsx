import { AdminHeader } from "@/app/admin/AdminHeader";
import { ModerationClient } from "@/app/admin/moderation/ModerationClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PendingEntry = {
  id: string;
  kind: "vault" | "capsule";
  title: string | null;
  body: string | null;
  authorName: string;
  targetName: string;
  type: string;
  createdAt: string;
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

  const capsuleContributions = await prisma.capsuleContribution.findMany({
    where: { approvalStatus: "PENDING_REVIEW" },
    include: { capsule: true },
    orderBy: { createdAt: "desc" },
  });

  const items: PendingEntry[] = capsuleContributions.map((c) => ({
    id: c.id,
    kind: "capsule" as const,
    title: c.title,
    body: c.body,
    authorName: c.authorName,
    targetName: (c.capsule as Record<string, unknown>)?.title as string ?? "Unknown",
    type: c.type,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <AdminHeader />
        <ModerationClient items={items} />
      </div>
    </main>
  );
}
