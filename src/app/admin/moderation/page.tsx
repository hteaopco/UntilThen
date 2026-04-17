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

  const [vaultEntries, capsuleContributions] = await Promise.all([
    prisma.entry.findMany({
      where: { approvalStatus: "PENDING_REVIEW" },
      include: {
        contributor: true,
        vault: { include: { child: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.capsuleContribution.findMany({
      where: { approvalStatus: "PENDING_REVIEW" },
      include: { capsule: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const items: PendingEntry[] = [
    ...vaultEntries.map((e) => ({
      id: e.id,
      kind: "vault" as const,
      title: e.title,
      body: e.body,
      authorName: (e.contributor as Record<string, unknown>)?.name as string ?? (e.contributor as Record<string, unknown>)?.email as string ?? "Unknown",
      targetName: `${(e.vault as Record<string, unknown> & { child: Record<string, unknown> })?.child?.firstName as string ?? "Unknown"}'s vault`,
      type: e.type,
      createdAt: e.createdAt.toISOString(),
    })),
    ...capsuleContributions.map((c) => ({
      id: c.id,
      kind: "capsule" as const,
      title: c.title,
      body: c.body,
      authorName: c.authorName,
      targetName: (c.capsule as Record<string, unknown>)?.title as string ?? "Unknown",
      type: c.type,
      createdAt: c.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <AdminHeader />
        <ModerationClient items={items} />
      </div>
    </main>
  );
}
