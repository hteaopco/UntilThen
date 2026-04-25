import { auth, clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift, Heart, Lock, Plus, Sparkles } from "lucide-react";

import { DashboardGreeting } from "@/components/dashboard2/DashboardGreeting";
import { GiftCapsuleReceivedCard } from "@/components/dashboard2/GiftCapsuleReceivedCard";
import { GiftCapsulesSection } from "@/components/dashboard2/GiftCapsulesSection";
import { HorizontalCardRail } from "@/components/dashboard2/HorizontalCardRail";
import { SectionHeader } from "@/components/dashboard2/SectionHeader";
import { VaultCard } from "@/components/dashboard2/VaultCard";
import { TopNav } from "@/components/ui/TopNav";
import { countDashboardUpdates } from "@/lib/dashboard-updates";
import { loadDashboard2Data } from "@/lib/dashboard2-data";

export const metadata = {
  title: "Your Vault — untilThen",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) return <DbMissing />;

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, firstName: true },
  });
  if (!user) redirect("/onboarding");

  let firstName = user.firstName?.trim() ?? "";
  if (!firstName) {
    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      firstName = clerkUser.firstName ?? "";
    } catch {
      // Non-fatal — greeting degrades to generic copy below.
    }
  }

  const [updatesCount, data] = await Promise.all([
    countDashboardUpdates(user.id),
    loadDashboard2Data({ userId: user.id, clerkUserId: userId }),
  ]);

  return (
    <main className="min-h-screen bg-cream pb-16">
      <TopNav />

      <div className="mx-auto max-w-[960px] px-6 lg:px-10 pt-6">
        <DashboardGreeting firstName={firstName} updatesCount={updatesCount} />

        <section className="mt-4 sm:mt-10">
          <SectionHeader
            icon={<Lock size={18} strokeWidth={1.75} />}
            title="Your Time Capsules"
            viewAllHref={data.vaults.length > 0 ? "/account/capsules" : undefined}
          />
          {data.vaults.length === 0 ? (
            <EmptyState
              copy="Start writing to someone you love."
              ctaHref="/account/capsules/new"
              ctaLabel="Start a Time Capsule"
            />
          ) : (
            <HorizontalCardRail ariaLabel="Your time capsules">
              {data.vaults.map((v) => (
                <VaultCard key={v.childId} vault={v} />
              ))}
              <Link
                href="/account/capsules/new"
                prefetch={false}
                aria-label="Add a time capsule"
                className="shrink-0 w-[50vw] max-w-[182px] sm:w-[168px] rounded-2xl bg-white border-2 border-dashed border-amber/40 hover:border-amber/60 transition-colors overflow-hidden flex flex-col"
              >
                {/* Mirrors VaultCard's cover/footer layout exactly so
                    total card height lines up with the rest of the
                    row — bottoms align without per-breakpoint
                    aspect-ratio guesswork. */}
                <div className="aspect-[4/3] sm:aspect-square flex items-center justify-center">
                  {/* Lighter button — smaller, two-stop amber
                      gradient (light → amber) with a soft drop
                      shadow. Plus icon sized down + thinner stroke
                      so it reads as a tap target, not a heavy CTA. */}
                  <span
                    aria-hidden="true"
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-light to-amber text-white flex items-center justify-center shadow-[0_3px_10px_-2px_rgba(196,122,58,0.3)]"
                  >
                    <Plus size={22} strokeWidth={2} />
                  </span>
                </div>
                <div className="p-3 text-center">
                  <h3 className="text-[15px] font-bold text-navy tracking-[-0.3px] leading-tight">
                    New Capsule
                  </h3>
                  <p className="mt-1 text-[11px] font-medium text-ink-mid leading-[1.35]">
                    Create moments worth
                    <br />
                    remembering
                  </p>
                </div>
              </Link>
            </HorizontalCardRail>
          )}
        </section>

        <section className="mt-7 sm:mt-10">
          <SectionHeader
            icon={<Gift size={18} strokeWidth={1.75} />}
            title="Gift Capsules You're Creating"
          />
          {data.creating.length === 0 ? (
            <EmptyState
              copy="Create a moment someone will never forget."
              ctaHref="/capsules/new"
              ctaLabel="New Gift Capsule"
            />
          ) : (
            <GiftCapsulesSection capsules={data.creating} />
          )}
        </section>

        <section className="mt-10">
          <SectionHeader
            icon={<Heart size={18} strokeWidth={1.75} />}
            title="Capsules Given to You"
            viewAllHref={data.received.length > 0 ? "/capsules?role=recipient" : undefined}
          />
          {data.received.length === 0 ? (
            <EmptyState copy="Someone's writing to you. You just don't know it yet." />
          ) : (
            <div className="space-y-3">
              {data.received.slice(0, 3).map((c) => (
                <GiftCapsuleReceivedCard key={c.id} capsule={c} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function EmptyState({
  copy,
  ctaHref,
  ctaLabel,
}: {
  copy: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-navy/10 bg-white/60 px-5 py-8 text-center">
      <p className="text-[14px] text-ink-mid leading-[1.5]">{copy}</p>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          prefetch={false}
          className="mt-3 inline-flex items-center gap-2 bg-amber text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
        >
          <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}


function DbMissing() {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-extrabold text-navy mb-2 tracking-[-0.5px]">
          Database not reachable
        </h1>
        <p className="text-ink-mid">
          DATABASE_URL isn&rsquo;t set. Once Postgres is wired up on Railway,
          your dashboard will appear here.
        </p>
      </div>
    </main>
  );
}
