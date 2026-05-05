import { auth, clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { ArrowRight, Gift, Plus, Sparkles, Users } from "lucide-react";

import { OrgUpdatesPanel } from "@/components/enterprise/OrgUpdatesPanel";
import { effectiveStatus } from "@/lib/capsules";
import { getOrgContextByClerkId } from "@/lib/orgs";

export const metadata = {
  title: "Enterprise — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EnterpriseCapsuleRow = {
  id: string;
  title: string;
  recipientName: string;
  revealDate: string;
  effectiveStatus: "DRAFT" | "ACTIVE" | "SEALED" | "SENT" | "REVEALED";
  contributionCount: number;
};

/**
 * /enterprise landing.
 *
 * Two layouts depending on whether the current user has any
 * org-attributed gift capsules under their name:
 *
 *   Empty:   the original "Build a Gift Capsule" hero card,
 *            big centered CTA. Same first-run feel.
 *   Has any: a tighter header with the create CTA in the
 *            top-right corner pill, and a list of the user's
 *            org capsules below. Each row is a deep link into
 *            /capsules/[id] so the manager can jump straight
 *            into the capsule they're working on.
 *
 * MEMBERs see only this surface — no Roster/Stats shortcuts.
 */
export default async function EnterprisePage() {
  // Layout already validated; ctx is guaranteed here.
  const { userId } = auth();
  const ctx = userId ? await getOrgContextByClerkId(userId) : null;
  const isAdmin = ctx?.role === "OWNER" || ctx?.role === "ADMIN";

  // Resolve the viewer's email for the recipient-of-self filter.
  // Same approach as /enterprise/stats — best-effort; on failure
  // we fall through and skip the filter rather than 500ing the
  // dashboard.
  let viewerEmail: string | null = null;
  if (userId) {
    try {
      const clerk = await clerkClient();
      const u = await clerk.users.getUser(userId);
      viewerEmail =
        u.primaryEmailAddress?.emailAddress?.toLowerCase() ??
        u.emailAddresses[0]?.emailAddress?.toLowerCase() ??
        null;
    } catch {
      /* ignore */
    }
  }

  const capsules = await loadEnterpriseCapsules(
    userId,
    ctx?.organizationId,
    isAdmin,
    viewerEmail,
  );
  const hasCapsules = capsules.length > 0;

  return (
    <div className="space-y-8">
      {hasCapsules ? (
        <ManageCard capsules={capsules} />
      ) : (
        <EmptyHeroCard isAdmin={isAdmin} />
      )}

      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/enterprise/roster"
            className="rounded-xl border border-navy/[0.08] bg-white px-5 py-5 hover:border-navy/30 hover:shadow-[0_6px_20px_rgba(15,31,61,0.06)] transition-all"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-10 h-10 rounded-lg bg-navy/[0.05] text-navy flex items-center justify-center">
                <Users size={18} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-navy">Roster</div>
                <p className="text-[13px] text-ink-mid mt-0.5 leading-[1.5]">
                  Invite, search, promote, and remove team members.
                </p>
              </div>
            </div>
          </Link>
          <Link
            href="/enterprise/stats"
            className="rounded-xl border border-navy/[0.08] bg-white px-5 py-5 hover:border-navy/30 hover:shadow-[0_6px_20px_rgba(15,31,61,0.06)] transition-all"
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-10 h-10 rounded-lg bg-amber-tint text-amber flex items-center justify-center">
                <Sparkles size={18} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-navy">Stat Board</div>
                <p className="text-[13px] text-ink-mid mt-0.5 leading-[1.5]">
                  Capsules sent, contributions collected, recipients reached.
                </p>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* OWNER + ADMIN can post org-wide updates that surface on
          every member's /dashboard/updates page. Hidden for
          plain MEMBERs since they're read-only consumers of the
          announcement feed. */}
      {isAdmin && ctx?.organizationId && (
        <OrgUpdatesPanel orgId={ctx.organizationId} />
      )}
    </div>
  );
}

function EmptyHeroCard({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="rounded-2xl border border-amber/25 bg-amber-tint/40 px-6 py-10 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber/15 text-amber mb-4">
        <Gift size={26} strokeWidth={1.75} aria-hidden="true" />
      </div>
      <h2 className="text-[22px] sm:text-[26px] font-extrabold text-navy tracking-[-0.4px] mb-2">
        Build a Gift Capsule for someone on your team.
      </h2>
      <p className="text-sm sm:text-[15px] text-ink-mid max-w-[480px] mx-auto leading-[1.6] mb-6">
        Birthdays, retirements, anniversaries — collect messages from
        colleagues and deliver them all at once.{" "}
        {isAdmin
          ? "Anyone on your roster can build one; you'll see them all in the Stat Board."
          : "Your company has covered the cost — go ahead."}
      </p>
      <Link
        href="/capsules/new?source=enterprise"
        className="inline-flex items-center gap-2 bg-amber text-white px-6 py-3 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors shadow-[0_4px_14px_rgba(196,122,58,0.25)]"
      >
        <Sparkles size={16} strokeWidth={2} aria-hidden="true" />
        Create a Gift Capsule
      </Link>
    </div>
  );
}

function ManageCard({ capsules }: { capsules: EnterpriseCapsuleRow[] }) {
  return (
    <div className="rounded-2xl border border-amber/25 bg-amber-tint/40 px-6 py-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber/15 text-amber mb-3">
            <Gift size={20} strokeWidth={1.75} aria-hidden="true" />
          </div>
          <h2 className="text-[20px] sm:text-[22px] font-extrabold text-navy tracking-[-0.3px]">
            Your Gift Capsules
          </h2>
          <p className="mt-1 text-[13px] text-ink-mid leading-[1.55]">
            Tap a row to open the capsule and manage contributors.
          </p>
        </div>
        <Link
          href="/capsules/new?source=enterprise"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber text-white text-[13px] font-bold hover:bg-amber-dark transition-colors shadow-[0_4px_14px_rgba(196,122,58,0.25)] whitespace-nowrap shrink-0"
        >
          <Plus size={14} strokeWidth={2.25} aria-hidden="true" />
          Create New Gift Capsule
        </Link>
      </div>

      <ul className="mt-5 space-y-2">
        {capsules.map((c) => (
          <li key={c.id}>
            <Link
              href={`/capsules/${c.id}`}
              className="group flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white border border-navy/[0.08] hover:border-navy/30 hover:shadow-[0_4px_14px_rgba(15,31,61,0.05)] transition-all"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[14px] font-bold text-navy truncate">
                    {c.title}
                  </span>
                  <StatusBadge status={c.effectiveStatus} />
                </div>
                <p className="mt-0.5 text-[12px] text-ink-mid leading-[1.4]">
                  For {c.recipientName} · Reveals{" "}
                  {new Date(c.revealDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  ·{" "}
                  {c.contributionCount}{" "}
                  {c.contributionCount === 1
                    ? "contribution"
                    : "contributions"}
                </p>
              </div>
              <ArrowRight
                size={16}
                strokeWidth={2}
                aria-hidden="true"
                className="text-ink-light group-hover:text-navy transition-colors shrink-0"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "DRAFT" | "ACTIVE" | "SEALED" | "SENT" | "REVEALED";
}) {
  const styles =
    status === "DRAFT"
      ? "bg-amber-tint text-amber-dark"
      : status === "ACTIVE"
        ? "bg-sage-tint text-sage"
        : status === "SEALED"
          ? "bg-navy/10 text-navy"
          : status === "SENT"
            ? "bg-amber/15 text-amber-dark"
            : "bg-gold-tint text-gold";
  const label =
    status === "DRAFT"
      ? "Draft"
      : status === "ACTIVE"
        ? "Live"
        : status === "SEALED"
          ? "Sealed"
          : status === "SENT"
            ? "Sent"
            : "Opened";
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded ${styles}`}
    >
      {label}
    </span>
  );
}

async function loadEnterpriseCapsules(
  clerkUserId: string | null,
  organizationId: string | undefined,
  isAdmin: boolean,
  viewerEmail: string | null,
): Promise<EnterpriseCapsuleRow[]> {
  if (!clerkUserId || !organizationId) return [];
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });
  if (!user) return [];
  // Admins see every gift capsule attributed to the org so they
  // can manage on behalf of teammates. MEMBERs are scoped to their
  // own — surfacing other people's drafts to a non-admin would
  // leak intent before reveal.
  const rows = await prisma.memoryCapsule.findMany({
    where: {
      ...(isAdmin ? {} : { organiserId: user.id }),
      organizationId,
      occasionType: { not: "WEDDING" },
    },
    select: {
      id: true,
      title: true,
      recipientName: true,
      recipientEmail: true,
      recipient2Email: true,
      additionalRecipients: true,
      revealDate: true,
      status: true,
      contributionsClosed: true,
      contributorDeadline: true,
      firstOpenedAt: true,
      deliveryTime: true,
      timezone: true,
      // NET contribution count — only items the recipient will
      // actually see. Excludes REJECTED (organiser denied),
      // FLAGGED (sitting in admin moderation), and SCANNING
      // (still mid-Hive scan; the cleanup cron may reclaim).
      _count: {
        select: {
          contributions: {
            where: {
              approvalStatus: { in: ["AUTO_APPROVED", "APPROVED", "PENDING_REVIEW"] },
              moderationState: { notIn: ["FLAGGED", "SCANNING"] },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  // Hide capsules destined for the viewer themselves so a manager
  // who's also a recipient doesn't get spoiled by seeing their
  // own incoming gift on the dashboard. Mirrors the stat board's
  // filter exactly.
  const visible = viewerEmail
    ? rows.filter((r) => {
        if (r.recipientEmail?.toLowerCase() === viewerEmail) return false;
        if (r.recipient2Email?.toLowerCase() === viewerEmail) return false;
        // Multi-recipient capsules keep extras in additionalRecipients;
        // each entry is `{ firstName, lastName, email }`. Cast through
        // the JsonValue union for the lookup.
        const extras = Array.isArray(r.additionalRecipients)
          ? (r.additionalRecipients as Array<{ email?: string }>)
          : [];
        if (
          extras.some((x) => typeof x?.email === "string" && x.email.toLowerCase() === viewerEmail)
        ) {
          return false;
        }
        return true;
      })
    : rows;
  return visible.map((r) => ({
    id: r.id,
    title: r.title,
    recipientName: r.recipientName,
    revealDate: r.revealDate.toISOString(),
    effectiveStatus: effectiveStatus(r),
    contributionCount: r._count.contributions,
  }));
}
