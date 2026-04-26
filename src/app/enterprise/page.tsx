import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Gift, Sparkles, Users } from "lucide-react";

import { getOrgContextByClerkId } from "@/lib/orgs";

export const metadata = {
  title: "Enterprise — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * /enterprise landing. Layout from spec:
 *   - Left rail in EnterpriseShell carries Roster + Stat Board
 *     for ADMIN+ (handled in shell).
 *   - This page is the body when nothing else is selected: a
 *     warm welcome + the prominent "Create a Gift Capsule" CTA
 *     in the centre, with quick links into Roster + Stats for
 *     admins.
 *
 * MEMBERs see only the centre CTA — no admin shortcuts.
 */
export default async function EnterprisePage() {
  // Layout already validated; ctx is guaranteed here.
  const { userId } = auth();
  const ctx = userId ? await getOrgContextByClerkId(userId) : null;
  const isAdmin = ctx?.role === "OWNER" || ctx?.role === "ADMIN";

  return (
    <div className="space-y-8">
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
          href="/capsules/new"
          className="inline-flex items-center gap-2 bg-amber text-white px-6 py-3 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors shadow-[0_4px_14px_rgba(196,122,58,0.25)]"
        >
          <Sparkles size={16} strokeWidth={2} aria-hidden="true" />
          Create a Gift Capsule
        </Link>
      </div>

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
    </div>
  );
}
