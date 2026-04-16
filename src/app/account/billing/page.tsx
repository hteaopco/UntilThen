import { auth } from "@clerk/nextjs/server";
import { Gift, PlusCircle, Sparkles, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";

import { BillingActions } from "@/components/account/BillingActions";
import { formatLong } from "@/lib/dateFormatters";

export const metadata = {
  title: "Billing — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AccountBillingPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      children: {
        include: {
          vault: {
            include: {
              entries: {
                where: { isSealed: true },
                select: { type: true },
              },
            },
          },
        },
      },
    },
  });
  if (!user) redirect("/onboarding");

  // Usage metrics derived from the live data so the page feels
  // honest even while Square isn't wired up yet.
  const allEntries = user.children.flatMap(
    (c) => c.vault?.entries ?? [],
  );
  const photoCount = allEntries.filter((e) => e.type === "PHOTO").length;
  const voiceCount = allEntries.filter((e) => e.type === "VOICE").length;
  const videoCount = allEntries.filter((e) => e.type === "VIDEO").length;
  const childCount = user.children.length;

  // Placeholder next-billing date — one month from now.
  const nextBillingIso = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  return (
    <div className="space-y-10">
      <section>
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
          Billing
        </p>
        <h2 className="text-2xl font-extrabold text-navy tracking-[-0.3px] mb-2">
          Your plan
        </h2>
        <p className="text-sm text-ink-mid">
          Manage your subscription, usage, and payment method.
        </p>
      </section>

      <section className="rounded-2xl border border-navy/[0.08] bg-white px-6 py-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-amber mb-1.5">
              Current plan
            </div>
            <div className="text-2xl font-extrabold text-navy tracking-[-0.3px]">
              Base Plan · Monthly
            </div>
            <div className="text-sm text-ink-mid mt-1">
              $3.99 / month · Next billing date {formatLong(nextBillingIso)}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 bg-amber text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
          >
            <TrendingUp size={16} strokeWidth={1.5} aria-hidden="true" />
            Upgrade to Annual — save 27%
          </button>
        </div>
      </section>

      <section>
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
          Usage
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <UsageCell label="Time capsules" value={`${childCount}`} />
          <UsageCell label="Photos" value={`${photoCount}`} />
          <UsageCell label="Voice notes" value={`${voiceCount}`} />
          <UsageCell label="Video clips" value={`${videoCount}`} />
        </dl>
      </section>

      <section>
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
          Payment method
        </div>
        <div className="rounded-xl border border-navy/[0.08] bg-white px-5 py-5 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-ink-mid">
            No payment method on file yet.
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-navy/15 text-sm font-semibold text-navy hover:border-navy transition-colors"
          >
            Add payment method →
          </button>
        </div>
      </section>

      <section>
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
          Plan options
        </div>
        <ul className="space-y-3">
          <PlanOption
            icon={TrendingUp}
            title="Switch to Annual"
            subtitle="$34.99 / year — save around 27% vs monthly."
          />
          <PlanOption
            icon={PlusCircle}
            title="Add a time capsule"
            subtitle="$0.99 / month per capsule."
          />
          <PlanOption
            icon={Sparkles}
            title="Add Gift Capsule"
            subtitle="$9.99 one-time — for special events or just because."
          />
        </ul>
      </section>

      <BillingActions />
    </div>
  );
}

function UsageCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-navy/[0.08] bg-white px-4 py-3">
      <dt className="text-[10px] uppercase tracking-[0.12em] font-bold text-ink-mid">
        {label}
      </dt>
      <dd className="mt-1 text-base font-bold text-navy tabular-nums">
        {value}
      </dd>
    </div>
  );
}

function PlanOption({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Gift;
  title: string;
  subtitle: string;
}) {
  return (
    <li>
      <button
        type="button"
        className="w-full flex items-center gap-3 rounded-xl border border-navy/[0.08] bg-white px-5 py-4 text-left hover:border-amber/25 hover:shadow-[0_4px_16px_rgba(15,31,61,0.05)] transition-all"
      >
        <div
          aria-hidden="true"
          className="shrink-0 w-9 h-9 rounded-full bg-amber-tint text-amber flex items-center justify-center"
        >
          <Icon size={16} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-navy">{title}</div>
          <div className="text-sm text-ink-mid mt-0.5">{subtitle}</div>
        </div>
      </button>
    </li>
  );
}
