import { AdminHeader } from "@/app/admin/AdminHeader";

import { LockThrottleToggle } from "./LockThrottleToggle";
import { PaywallToggle } from "./PaywallToggle";
import { ResetSubscriptionForm } from "./ResetSubscriptionForm";
import { RevealSongsManager } from "./RevealSongsManager";
import { SentryTestButton } from "./SentryTestButton";
import { SquareOrderTemplateSetup } from "./SquareOrderTemplateSetup";
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
            Lock / unlock cooldown
          </p>
          <p className="text-sm text-ink-mid mb-5 max-w-[560px]">
            Users can only lock or unlock a capsule once every 90 days to
            prevent rotating a single paid slot across many capsules. Flip
            this OFF during QA to move lock state around freely; turn it
            back ON before launch.
          </p>
          <LockThrottleToggle
            initialDisabled={config.lockThrottleDisabled}
          />
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

        <section className="mt-12 pt-10 border-t border-navy/[0.06]">
          <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-3">
            Subscription order templates
          </p>
          <p className="text-sm text-ink-mid mb-5 max-w-[560px]">
            Our plan variations use RELATIVE pricing with no inline price
            source &mdash; Square needs the subscribe call to reference an
            Order template with the actual dollar amount. This creates
            four DRAFT orders (one per tier at the correct price) and
            returns their IDs for Railway&rsquo;s <code>SQUARE_ORDER_TEMPLATE_*</code>
            env vars. Idempotent &mdash; safe to re-run.
          </p>
          <SquareOrderTemplateSetup />
        </section>

        <section className="mt-12 pt-10 border-t border-navy/[0.06]">
          <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-3">
            Reveal background music
          </p>
          <p className="text-sm text-ink-mid mb-5 max-w-[560px]">
            Songs uploaded here appear as picker options on every
            capsule&rsquo;s reveal curator. Keep them short ambient loops
            (2&ndash;4 minutes) and royalty-free &mdash; capsule owners
            can&rsquo;t upload their own to keep us out of licensing
            trouble.
          </p>
          <RevealSongsManager />
        </section>

        <section className="mt-12 pt-10 border-t border-navy/[0.06]">
          <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-red-600 mb-3">
            Testing tools
          </p>
          <p className="text-sm text-ink-mid mb-5 max-w-[560px]">
            Danger zone. Only intended for pre-launch QA &mdash; these
            actions bypass the normal billing flow.
          </p>
          <div className="space-y-2">
            <p className="text-[13px] font-semibold text-navy">
              Reset a user&rsquo;s subscription
            </p>
            <p className="text-[12px] text-ink-mid max-w-[560px]">
              Cancels every linked Square sub and deletes the local
              Subscription row so the user can subscribe fresh on a
              different cadence. Saved card stays so the next checkout
              doesn&rsquo;t need a new card entry.
            </p>
            <div className="mt-3">
              <ResetSubscriptionForm />
            </div>
          </div>

          <div className="space-y-2 mt-8">
            <p className="text-[13px] font-semibold text-navy">
              Sentry live test
            </p>
            <p className="text-[12px] text-ink-mid max-w-[560px]">
              Deliberately throws a tagged exception on the server.
              Confirms that Sentry is capturing + uploading from the
              current production build. The thrown event carries the
              tag <code className="font-mono">test:live</code> so real
              alerts can filter it out.
            </p>
            <div className="mt-3">
              <SentryTestButton />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
