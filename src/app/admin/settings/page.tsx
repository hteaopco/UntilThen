import { AdminHeader } from "@/app/admin/AdminHeader";

import { PaywallToggle } from "./PaywallToggle";
import { SquarePlanVariations } from "./SquarePlanVariations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminSettingsPage() {
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
  const config = await prisma.appConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", paywallEnabled: false },
  });

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <AdminHeader />

        <section>
          <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-3">
            Paywall
          </p>
          <p className="text-sm text-ink-mid mb-5 max-w-[560px]">
            Global switch. When ON, vault creation and Gift Capsule
            activation require either an active Time Capsule subscription
            or a per-user free-access override. When OFF, everything
            activates freely &mdash; used for pre-launch testing.
          </p>
          <PaywallToggle initialEnabled={config.paywallEnabled} />
        </section>

        <section className="mt-12 pt-10 border-t border-navy/[0.06]">
          <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-3">
            Square plan variations
          </p>
          <p className="text-sm text-ink-mid mb-5 max-w-[560px]">
            Subscriptions require <em>plan variation</em> IDs, not plan IDs
            (Square&rsquo;s Dashboard UI only surfaces the latter). Click below
            to pull the four variations live from the Catalog API and compare
            against what&rsquo;s configured in <code>SQUARE_PLAN_*</code> env vars.
            Any mismatches need to be pasted into Railway.
          </p>
          <SquarePlanVariations />
        </section>
      </div>
    </main>
  );
}
