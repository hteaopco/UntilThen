import { auth } from "@clerk/nextjs/server";
import {
  ArrowRight,
  CalendarHeart,
  Heart,
  Lock,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Footer } from "@/components/landing/Footer";
import { TopNav } from "@/components/ui/TopNav";
import { effectiveStatus } from "@/lib/capsules";
import { formatLong } from "@/lib/dateFormatters";

export const metadata = {
  title: "Wedding Dashboard — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Wedding-specific dashboard: lists every wedding capsule the
 * signed-in user organises (occasionType=WEDDING), with a clear
 * "Create new" CTA for first-time visitors. Mirrors the same
 * filtering pattern the gift-capsule list uses on /dashboard,
 * scoped down to weddings.
 *
 * Linked from the inline "Login to Weddings" CTA on /weddings.
 * Signed-out visitors get bounced through Clerk's sign-in with
 * redirect_url back here so the entry funnel is one tap.
 */
export default async function WeddingDashboardPage() {
  const { userId } = auth();
  if (!userId)
    redirect("/sign-in?redirect_url=%2Fweddings%2Fdashboard");
  if (!process.env.DATABASE_URL) redirect("/sign-in");

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, firstName: true },
  });
  if (!user) redirect("/onboarding");

  const capsules = await prisma.memoryCapsule.findMany({
    where: { organiserId: user.id, occasionType: "WEDDING" },
    include: { _count: { select: { contributions: true } } },
    orderBy: [{ status: "asc" }, { revealDate: "asc" }],
  });

  const firstName = user.firstName?.trim() || "";

  return (
    <>
      <TopNav />
      <main className="pt-10 sm:pt-14 pb-20 bg-cream min-h-screen">
        <section className="mx-auto max-w-[960px] px-5 lg:px-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-tint border border-amber/30 text-amber-dark text-[11px] font-bold uppercase tracking-[0.14em]">
                <Sparkles size={12} strokeWidth={2.25} />
                untilThen Weddings
              </span>
              <h1 className="mt-4 font-brush text-[42px] sm:text-[56px] leading-[0.95] text-navy">
                {firstName ? `${firstName}'s` : "Your"} wedding capsules
              </h1>
              <p className="mt-3 text-[15px] text-navy/70 max-w-[520px] leading-[1.55]">
                Create a new capsule, share the QR with your guests, and
                everything seals automatically until your first anniversary.
              </p>
            </div>
            <Link
              href="/capsules/new?occasion=WEDDING"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-amber-tint border border-amber/40 text-amber-dark text-[13px] font-bold hover:bg-amber/15 hover:border-amber/60 transition-colors whitespace-nowrap"
            >
              <Plus size={14} strokeWidth={2.25} />
              New wedding capsule
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-[960px] px-5 lg:px-10 mt-10">
          {capsules.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="grid sm:grid-cols-2 gap-4">
              {capsules.map((c) => {
                const status = effectiveStatus(c);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/capsules/${c.id}`}
                      className="group block rounded-2xl border border-navy/[0.08] bg-white px-5 py-5 hover:border-amber/40 hover:shadow-[0_8px_24px_-12px_rgba(15,31,61,0.18)] transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-[17px] font-extrabold text-navy tracking-[-0.3px] line-clamp-2">
                          {c.title}
                        </h2>
                        <StatusPill status={status} isPaid={c.isPaid} />
                      </div>
                      <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-ink-mid">
                        <Heart
                          size={11}
                          strokeWidth={2}
                          fill="currentColor"
                          className="text-amber"
                        />
                        {c.recipientName}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
                        <Stat
                          icon={
                            <CalendarHeart
                              size={12}
                              strokeWidth={1.75}
                              className="text-amber"
                            />
                          }
                          label="Reveals"
                          value={formatLong(c.revealDate.toISOString())}
                        />
                        <Stat
                          icon={
                            <Users
                              size={12}
                              strokeWidth={1.75}
                              className="text-amber"
                            />
                          }
                          label="Contributions"
                          value={`${c._count.contributions}`}
                        />
                      </div>
                      <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-dark group-hover:gap-2 transition-all">
                        Manage capsule
                        <ArrowRight size={12} strokeWidth={2.25} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-amber/40 bg-amber-tint/30 px-6 py-12 text-center">
      <Heart
        size={28}
        strokeWidth={1.5}
        className="text-amber mx-auto"
        aria-hidden="true"
        fill="currentColor"
      />
      <h2 className="mt-3 font-brush text-[34px] text-navy leading-none">
        No wedding capsules yet
      </h2>
      <p className="mt-3 text-[14px] text-navy/65 max-w-[420px] mx-auto leading-[1.55]">
        Set up your first capsule, print the QR for your easel and tables,
        and we&rsquo;ll seal everything until your one-year anniversary.
      </p>
      <Link
        href="/capsules/new?occasion=WEDDING"
        className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-amber-tint border border-amber/40 text-amber-dark text-[13px] font-bold hover:bg-amber/15 hover:border-amber/60 transition-colors"
      >
        <Plus size={14} strokeWidth={2.25} />
        Create your first wedding capsule
      </Link>
    </div>
  );
}

function StatusPill({
  status,
  isPaid,
}: {
  status: "DRAFT" | "ACTIVE" | "SEALED" | "SENT" | "REVEALED";
  isPaid: boolean;
}) {
  if (status === "DRAFT") {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy/[0.06] text-navy text-[10px] font-bold uppercase tracking-[0.1em]">
        Draft
      </span>
    );
  }
  if (status === "SEALED") {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy text-white text-[10px] font-bold uppercase tracking-[0.1em]">
        <Lock size={10} strokeWidth={2.25} aria-hidden="true" />
        Sealed
      </span>
    );
  }
  if (status === "SENT") {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber/15 border border-amber/40 text-amber-dark text-[10px] font-bold uppercase tracking-[0.1em]">
        <Lock size={10} strokeWidth={2.25} aria-hidden="true" />
        Sent
      </span>
    );
  }
  if (status === "REVEALED") {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber text-white text-[10px] font-bold uppercase tracking-[0.1em]">
        Revealed
      </span>
    );
  }
  // ACTIVE
  return (
    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-tint border border-amber/30 text-amber-dark text-[10px] font-bold uppercase tracking-[0.1em]">
      {isPaid ? "Live" : "Active"}
    </span>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-warm-surface/60 border border-navy/[0.04] px-2.5 py-2">
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] font-bold text-ink-mid">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-[12px] font-semibold text-navy">{value}</div>
    </div>
  );
}
