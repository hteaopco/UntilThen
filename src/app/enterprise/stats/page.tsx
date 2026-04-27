import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";

import { effectiveStatus } from "@/lib/capsules";
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
  //
  // Every query scopes to enterprise (gift) capsules only — wedding
  // capsules a member happens to build under their account are
  // counted under the consumer wedding product, not the company's
  // enterprise stat board.
  const organizationId = ctx!.organizationId;
  const enterpriseScope = {
    organizationId,
    occasionType: { not: "WEDDING" as const },
  };
  const [byStatus, capsuleIdRows, distinctRecipients, recipientCapsules] =
    await Promise.all([
      prisma.memoryCapsule.groupBy({
        by: ["status"],
        where: enterpriseScope,
        _count: { _all: true },
      }),
      prisma.memoryCapsule.findMany({
        where: enterpriseScope,
        select: { id: true },
      }),
      prisma.memoryCapsule.findMany({
        where: { ...enterpriseScope, recipientEmail: { not: null } },
        distinct: ["recipientEmail"],
        select: { id: true },
      }),
      // Recipient roster — every gift sent under this org. Drafts
      // are excluded because nothing has been "sent" yet; everything
      // else (ACTIVE / SEALED / REVEALED) shows up so the admin can
      // see who got what and when.
      prisma.memoryCapsule.findMany({
        where: {
          ...enterpriseScope,
          status: { in: ["ACTIVE", "SEALED", "REVEALED"] },
        },
        select: {
          id: true,
          title: true,
          recipientName: true,
          recipientEmail: true,
          revealDate: true,
          status: true,
          contributionsClosed: true,
          contributorDeadline: true,
          firstOpenedAt: true,
          _count: { select: { contributions: true } },
        },
        orderBy: { revealDate: "desc" },
      }),
    ]);
  const capsuleIds = capsuleIdRows.map((r) => r.id);
  const contributionsByType: Record<string, number> = {
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

      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-mid">
            Recipients
          </h3>
          <span className="text-[11px] text-ink-light">
            {recipientCapsules.length}{" "}
            {recipientCapsules.length === 1 ? "gift" : "gifts"} sent
          </span>
        </div>
        {recipientCapsules.length === 0 ? (
          <div className="rounded-xl border border-navy/[0.06] bg-navy/[0.02] px-4 py-6 text-center">
            <p className="text-[13px] text-ink-mid">
              No gifts have gone out yet. Recipients land here once a capsule
              is activated.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {recipientCapsules.map((c) => {
              const status = effectiveStatus(c);
              const reveal = new Date(c.revealDate);
              const sentLabel =
                reveal.getTime() <= Date.now()
                  ? `Sent ${formatDate(reveal)}`
                  : `Scheduled for ${formatDate(reveal)}`;
              return (
                <li key={c.id}>
                  <Link
                    href={`/capsules/${c.id}`}
                    className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-navy/[0.08] hover:border-navy/30 hover:shadow-[0_4px_14px_rgba(15,31,61,0.05)] transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-[14px] font-bold text-navy truncate">
                          {c.recipientName}
                        </span>
                        <RecipientStatusBadge status={status} />
                      </div>
                      <p className="mt-0.5 text-[12px] text-ink-mid leading-[1.4] truncate">
                        {c.title} · {sentLabel} ·{" "}
                        {c._count.contributions}{" "}
                        {c._count.contributions === 1
                          ? "contribution"
                          : "contributions"}
                      </p>
                      {c.recipientEmail && (
                        <p className="mt-0.5 text-[11px] text-ink-light flex items-center gap-1 truncate">
                          <Mail
                            size={10}
                            strokeWidth={2}
                            aria-hidden="true"
                            className="shrink-0"
                          />
                          <span className="truncate">{c.recipientEmail}</span>
                        </p>
                      )}
                    </div>
                    <ArrowRight
                      size={16}
                      strokeWidth={2}
                      aria-hidden="true"
                      className="text-ink-light group-hover:text-navy transition-colors shrink-0"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RecipientStatusBadge({
  status,
}: {
  status: "DRAFT" | "ACTIVE" | "SEALED" | "REVEALED";
}) {
  const styles =
    status === "ACTIVE"
      ? "bg-sage-tint text-sage"
      : status === "SEALED"
        ? "bg-navy/10 text-navy"
        : status === "REVEALED"
          ? "bg-gold-tint text-gold"
          : "bg-amber-tint text-amber-dark";
  const label =
    status === "ACTIVE"
      ? "Live"
      : status === "SEALED"
        ? "Sealed"
        : status === "REVEALED"
          ? "Opened"
          : "Draft";
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded ${styles}`}
    >
      {label}
    </span>
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
