import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getOrgContextByClerkId } from "@/lib/orgs";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Stat Board — Enterprise — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function StatBoardPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  const ctx = await getOrgContextByClerkId(userId);
  if (!ctx) {
    redirect("/home");
  }
  if (ctx!.role !== "OWNER" && ctx!.role !== "ADMIN") {
    redirect("/enterprise");
  }

  // Server-side aggregation. Same shape as /api/orgs/[id]/stats
  // but inline so the page renders without a client roundtrip.
  const organizationId = ctx!.organizationId;
  const [byStatus, capsuleIdRows, distinctRecipients] = await Promise.all([
    prisma.memoryCapsule.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    }),
    prisma.memoryCapsule.findMany({
      where: { organizationId },
      select: { id: true },
    }),
    prisma.memoryCapsule.findMany({
      where: { organizationId, recipientEmail: { not: null } },
      distinct: ["recipientEmail"],
      select: { id: true },
    }),
  ]);
  const capsuleIds = capsuleIdRows.map((r) => r.id);
  let contributionsByType: Record<string, number> = {
    TEXT: 0,
    PHOTO: 0,
    VOICE: 0,
    VIDEO: 0,
  };
  let totalContributions = 0;
  if (capsuleIds.length > 0) {
    const grouped = await prisma.capsuleContribution.groupBy({
      by: ["type"],
      where: {
        capsuleId: { in: capsuleIds },
        approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
      },
      _count: { _all: true },
    });
    for (const g of grouped) {
      contributionsByType[g.type] = g._count._all;
      totalContributions += g._count._all;
    }
  }
  const statusCounts: Record<string, number> = {
    DRAFT: 0,
    ACTIVE: 0,
    SEALED: 0,
    REVEALED: 0,
  };
  for (const s of byStatus) statusCounts[s.status] = s._count._all;
  const totalCapsules = capsuleIdRows.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[20px] font-extrabold text-navy">Stat Board</h2>
        <p className="text-[13px] text-ink-mid mt-0.5">
          Usage across every Gift Capsule built under {ctx!.organizationName}.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Capsules created" value={totalCapsules} />
        <Stat label="Distinct recipients" value={distinctRecipients.length} />
        <Stat label="Contributions collected" value={totalContributions} />
      </div>

      <section>
        <h3 className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-mid mb-2">
          Capsules by status
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Draft" value={statusCounts.DRAFT} muted />
          <Stat label="Active" value={statusCounts.ACTIVE} muted />
          <Stat label="Sealed" value={statusCounts.SEALED} muted />
          <Stat label="Revealed" value={statusCounts.REVEALED} muted />
        </div>
      </section>

      <section>
        <h3 className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-mid mb-2">
          Contribution mix
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Letters" value={contributionsByType.TEXT} muted />
          <Stat label="Photos" value={contributionsByType.PHOTO} muted />
          <Stat label="Voice notes" value={contributionsByType.VOICE} muted />
          <Stat label="Videos" value={contributionsByType.VIDEO} muted />
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border ${
        muted ? "border-navy/[0.06] bg-navy/[0.02]" : "border-amber/25 bg-amber-tint/30"
      } px-4 py-4`}
    >
      <div
        className={`text-[24px] font-extrabold ${muted ? "text-navy/85" : "text-amber-dark"}`}
      >
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mt-1">
        {label}
      </div>
    </div>
  );
}
