import { clerkClient } from "@clerk/nextjs/server";
import { AlertCircle, CheckCircle, Gift, Inbox, Lock, Users } from "lucide-react";

import { AdminHeader } from "@/app/admin/AdminHeader";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminDashboard() {
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

  const [
    totalUsers,
    usersThisWeek,
    totalChildren,
    totalVaults,
    totalEntries,
    entriesThisWeek,
    sealedEntries,
    draftEntries,
    totalCapsules,
    capsulesByStatus,
    totalContributions,
    totalContributors,
    pendingReviewEntries,
    pendingReviewContributions,
    recentUsers,
    recentCapsules,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    }),
    prisma.child.count(),
    prisma.vault.count(),
    prisma.entry.count(),
    prisma.entry.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    }),
    prisma.entry.count({ where: { isSealed: true } }),
    prisma.entry.count({ where: { isDraft: true } }),
    prisma.memoryCapsule.count(),
    Promise.all([
      prisma.memoryCapsule.count({ where: { status: "DRAFT" } }),
      prisma.memoryCapsule.count({ where: { status: "ACTIVE" } }),
      prisma.memoryCapsule.count({ where: { status: "SEALED" } }),
      prisma.memoryCapsule.count({ where: { status: "REVEALED" } }),
    ]),
    prisma.capsuleContribution.count(),
    prisma.contributor.count(),
    prisma.entry.findMany({
      where: { approvalStatus: "PENDING_REVIEW" },
      include: { contributor: true, vault: { include: { child: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.capsuleContribution.findMany({
      where: { approvalStatus: "PENDING_REVIEW" },
      include: { capsule: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { _count: { select: { children: true, entries: true, memoryCapsules: true } } },
    }),
    prisma.memoryCapsule.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        organiser: { select: { firstName: true, lastName: true } },
        _count: { select: { contributions: true, invites: true } },
      },
    }),
  ]);

  const [draftCapsules, activeCapsules, sealedCapsules, revealedCapsules] = capsulesByStatus;

  let clerkUsers: Record<string, { email: string | null }> = {};
  try {
    const clerk = await clerkClient();
    const ids = recentUsers.map((u) => u.clerkId);
    if (ids.length > 0) {
      const resp = await clerk.users.getUserList({ userId: ids, limit: 10 });
      for (const cu of resp.data) {
        clerkUsers[cu.id] = {
          email: (cu.emailAddresses as Array<{ emailAddress: string }>)?.[0]?.emailAddress ?? null,
        };
      }
    }
  } catch { /* ignore */ }

  const pendingTotal = pendingReviewEntries.length + pendingReviewContributions.length;

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <AdminHeader />

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Stat icon={<Users size={18} strokeWidth={1.5} />} label="Total Users" value={totalUsers} sub={`+${usersThisWeek} this week`} />
          <Stat icon={<Lock size={18} strokeWidth={1.5} />} label="Time Capsules" value={totalVaults} sub={`${totalChildren} children`} />
          <Stat icon={<Gift size={18} strokeWidth={1.5} />} label="Gift Capsules" value={totalCapsules} sub={`${totalContributions} contributions`} />
          <Stat icon={<Inbox size={18} strokeWidth={1.5} />} label="Total Entries" value={totalEntries} sub={`+${entriesThisWeek} this week`} />
        </div>

        {/* Pending Review Alert */}
        {pendingTotal > 0 && (
          <div className="mb-8 rounded-xl border border-amber/30 bg-amber-tint/60 px-5 py-4 flex items-start gap-3">
            <AlertCircle size={20} strokeWidth={1.5} className="text-amber shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-navy">
                {pendingTotal} item{pendingTotal !== 1 ? "s" : ""} pending review
              </p>
              <p className="text-xs text-ink-mid mt-0.5">
                {pendingReviewEntries.length} vault {pendingReviewEntries.length === 1 ? "entry" : "entries"} · {pendingReviewContributions.length} gift capsule {pendingReviewContributions.length === 1 ? "contribution" : "contributions"}
              </p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Gift Capsule Pipeline */}
          <Card title="Gift Capsule Pipeline">
            <div className="space-y-2">
              <PipelineRow label="Draft" count={draftCapsules} color="bg-ink-light" total={totalCapsules} />
              <PipelineRow label="Active (collecting)" count={activeCapsules} color="bg-amber" total={totalCapsules} />
              <PipelineRow label="Sealed" count={sealedCapsules} color="bg-gold" total={totalCapsules} />
              <PipelineRow label="Revealed" count={revealedCapsules} color="bg-sage" total={totalCapsules} />
            </div>
          </Card>

          {/* Entry Breakdown */}
          <Card title="Entry Breakdown">
            <div className="space-y-2">
              <Row label="Sealed entries" value={sealedEntries.toLocaleString()} />
              <Row label="Draft entries" value={draftEntries.toLocaleString()} />
              <Row label="Total contributors (vault)" value={totalContributors.toLocaleString()} />
              <Row label="Gift capsule contributions" value={totalContributions.toLocaleString()} />
              <Row label="Pending review" value={pendingTotal.toLocaleString()} highlight={pendingTotal > 0} />
            </div>
          </Card>
        </div>

        {/* Pending Review Queue */}
        {pendingTotal > 0 && (
          <Card title={`Pending Review · ${pendingTotal}`} className="mb-8">
            <div className="space-y-2">
              {pendingReviewEntries.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 py-2 border-b border-navy/[0.04] last:border-0">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-amber uppercase tracking-[0.08em]">Vault Entry</span>
                    <p className="text-sm font-semibold text-navy truncate">{e.title || "Untitled"}</p>
                    <p className="text-xs text-ink-light">
                      by {(e.contributor as Record<string, unknown>)?.name as string ?? "Unknown"} · for {(e.vault as Record<string, unknown> & { child: Record<string, unknown> })?.child?.firstName as string ?? "Unknown"}
                    </p>
                  </div>
                  <span className="text-[9px] uppercase tracking-[0.1em] font-bold text-gold bg-gold-tint px-2 py-0.5 rounded shrink-0">Pending</span>
                </div>
              ))}
              {pendingReviewContributions.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-2 border-b border-navy/[0.04] last:border-0">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-amber uppercase tracking-[0.08em]">Gift Capsule</span>
                    <p className="text-sm font-semibold text-navy truncate">{c.title || "Untitled"}</p>
                    <p className="text-xs text-ink-light">
                      by {c.authorName} · for {(c.capsule as Record<string, unknown>)?.title as string ?? "Unknown"}
                    </p>
                  </div>
                  <span className="text-[9px] uppercase tracking-[0.1em] font-bold text-gold bg-gold-tint px-2 py-0.5 rounded shrink-0">Pending</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Users */}
          <Card title="Recent Users">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-ink-light">No users yet.</p>
            ) : (
              <div className="space-y-2">
                {recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3 py-2 border-b border-navy/[0.04] last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy truncate">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-ink-light truncate">
                        {clerkUsers[u.clerkId]?.email ?? "—"} · {u._count.children} capsule{u._count.children !== 1 ? "s" : ""} · {u._count.entries} entr{u._count.entries !== 1 ? "ies" : "y"} · {u._count.memoryCapsules} gift
                      </p>
                    </div>
                    <span className="text-[10px] text-ink-light whitespace-nowrap">
                      {formatAgo(u.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Gift Capsules */}
          <Card title="Recent Gift Capsules">
            {recentCapsules.length === 0 ? (
              <p className="text-sm text-ink-light">No capsules yet.</p>
            ) : (
              <div className="space-y-2">
                {recentCapsules.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 py-2 border-b border-navy/[0.04] last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy truncate">{c.title}</p>
                      <p className="text-xs text-ink-light truncate">
                        by {c.organiser.firstName} {c.organiser.lastName} · {c._count.contributions} contribution{c._count.contributions !== 1 ? "s" : ""} · {c._count.invites} invite{c._count.invites !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className={`text-[9px] uppercase tracking-[0.1em] font-bold px-2 py-0.5 rounded shrink-0 ${
                      c.status === "ACTIVE" ? "text-amber bg-amber-tint"
                      : c.status === "SEALED" ? "text-gold bg-gold-tint"
                      : c.status === "REVEALED" ? "text-green-700 bg-green-50"
                      : "text-ink-light bg-[#f1f5f9]"
                    }`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub: string }) {
  return (
    <div className="rounded-xl border border-navy/10 p-5">
      <div className="flex items-center gap-2 text-ink-mid mb-2">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.12em] font-bold">{label}</span>
      </div>
      <div className="text-3xl font-extrabold text-navy tracking-[-0.5px]">{value.toLocaleString()}</div>
      <div className="text-xs text-ink-light mt-1">{sub}</div>
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-navy/10 p-5 ${className}`}>
      <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-4">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-navy/[0.04] last:border-0">
      <span className="text-sm text-ink-mid">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${highlight ? "text-amber" : "text-navy"}`}>{value}</span>
    </div>
  );
}

function PipelineRow({ label, count, color, total }: { label: string; count: number; color: string; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-ink-mid">{label}</span>
        <span className="font-bold text-navy tabular-nums">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-navy/[0.06]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function formatAgo(d: Date): string {
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
