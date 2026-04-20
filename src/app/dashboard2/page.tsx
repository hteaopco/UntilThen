import { auth, clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift, Heart, Lock, Plus, Sparkles } from "lucide-react";

import { DashboardGreeting } from "@/components/dashboard2/DashboardGreeting";
import { GiftCapsuleCreatingCard } from "@/components/dashboard2/GiftCapsuleCreatingCard";
import { GiftCapsuleReceivedCard } from "@/components/dashboard2/GiftCapsuleReceivedCard";
import { HorizontalCardRail } from "@/components/dashboard2/HorizontalCardRail";
import { SectionHeader } from "@/components/dashboard2/SectionHeader";
import { VaultCard } from "@/components/dashboard2/VaultCard";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { countDashboardUpdates } from "@/lib/dashboard-updates";
import { loadDashboard2Data } from "@/lib/dashboard2-data";

export const metadata = {
  title: "Your Vault (v2) — untilThen",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardV2Page() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/");

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
      <header className="mx-auto max-w-[960px] px-6 lg:px-10 pt-6 pb-4 flex items-center justify-between">
        <Link href="/" aria-label="untilThen home">
          <LogoSvg variant="dark" width={120} height={24} />
        </Link>
        <Link
          href="/dashboard"
          prefetch={false}
          className="text-[12px] font-semibold text-ink-mid hover:text-navy transition-colors border border-navy/15 rounded-full px-3 py-1.5"
        >
          ↔ Compare to old dashboard
        </Link>
      </header>

      <div className="mx-auto max-w-[960px] px-6 lg:px-10 pt-4 space-y-10">
        <DashboardGreeting firstName={firstName} updatesCount={updatesCount} />

        <section>
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
                className="snap-start shrink-0 w-[72vw] max-w-[260px] sm:w-[240px] rounded-2xl border-2 border-dashed border-amber/40 bg-white/50 flex flex-col items-center justify-center gap-2 text-amber hover:bg-white transition-colors py-10"
              >
                <span className="w-12 h-12 rounded-full bg-amber-tint flex items-center justify-center">
                  <Plus size={22} strokeWidth={2} />
                </span>
                <span className="text-[13px] font-semibold">Add a time capsule</span>
              </Link>
            </HorizontalCardRail>
          )}
        </section>

        <section>
          <SectionHeader
            icon={<Gift size={18} strokeWidth={1.75} />}
            title="Gift Capsules You're Creating"
            viewAllHref={data.creating.length > 0 ? "/capsules" : undefined}
          />
          {data.creating.length === 0 ? (
            <EmptyState
              copy="Create a moment someone will never forget."
              ctaHref="/capsules/new"
              ctaLabel="New Gift Capsule"
            />
          ) : (
            <div className="space-y-3">
              {data.creating.slice(0, 3).map((c) => (
                <GiftCapsuleCreatingCard key={c.id} capsule={c} />
              ))}
            </div>
          )}
        </section>

        <section>
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
