import { auth } from "@clerk/nextjs/server";
import { ArrowRight, HelpCircle, Mail, Sparkles } from "lucide-react";
import Link from "next/link";

import { ExpandableFlyer } from "@/components/landing/ExpandableFlyer";
import { Footer } from "@/components/landing/Footer";
import { TopNav } from "@/components/ui/TopNav";
import { getOrgContextByClerkId } from "@/lib/orgs";

/**
 * Public marketing landing for the enterprise / "untilThen for
 * Business" channel. The signed-in dashboard lives at /enterprise
 * and is gated by org membership; this page is the open-to-public
 * pitch + lead form.
 *
 * Layout = hero + marketing flyer below. The flyer (uploaded by
 * the team) carries the full feature breakdown, perks, and use
 * cases — no need to duplicate them in HTML sections that drift
 * out of sync.
 */
export const metadata = {
  title: "untilThen for Business — Enterprise",
  description:
    "Give your team meaningful, lasting gifts. Milestone capsules, retirements, sendoffs — sent and tracked from a single roster.",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function BusinessPage() {
  // Show the inline "Login to Enterprise" link only when the
  // viewer is signed in AND active in an org. Anyone else sees
  // a clean landing — they have no dashboard to log into.
  const { userId } = auth();
  const orgCtx = userId ? await getOrgContextByClerkId(userId) : null;
  const showEnterpriseLogin = Boolean(orgCtx);

  return (
    <>
      <TopNav hideEnterprisePill />
      <main className="pt-10 sm:pt-14 pb-20 bg-cream min-h-screen">
        <section className="mx-auto max-w-[1080px] px-5 lg:px-14">
          <div className="max-w-[720px]">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-tint border border-amber/30 text-amber-dark text-[11px] font-bold uppercase tracking-[0.14em]">
                <Sparkles size={12} strokeWidth={2.25} />
                untilThen Enterprise
              </span>
              {showEnterpriseLogin && (
                <Link
                  href="/enterprise"
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-dark hover:text-amber-dark/80 transition-colors"
                >
                  Login to Enterprise
                  <ArrowRight
                    size={12}
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                </Link>
              )}
            </div>
            <h1 className="mt-5 font-extrabold text-navy text-[40px] sm:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-1px]">
              Capture today.
              <br />
              <span className="text-amber italic">Deliver when</span>
              <br />
              it matters.
            </h1>
            <p className="mt-6 text-[16px] sm:text-[18px] text-navy/70 max-w-[560px] leading-[1.55]">
              The private time-capsule platform that helps organizations
              strengthen relationships, recognize milestones, and create
              meaningful moments that leave a lasting impact.
            </p>
            <div className="mt-8">
              <a
                href="mailto:hello@untilthenapp.io?subject=untilThen%20Enterprise"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-amber-tint border border-amber/40 text-amber-dark text-[14px] font-bold hover:bg-amber/15 hover:border-amber/60 transition-colors"
              >
                <Mail size={16} strokeWidth={2} />
                Contact sales
              </a>
            </div>
            <div className="mt-3">
              <Link
                href="/faq"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-navy/10 text-navy/70 text-[12px] font-bold hover:border-amber/40 hover:text-navy transition-colors"
              >
                <HelpCircle size={12} strokeWidth={2} aria-hidden="true" />
                FAQ
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1080px] px-5 lg:px-14 mt-16 lg:mt-24">
          <ExpandableFlyer
            src="/EnterpriseFlyer.png"
            alt="untilThen Enterprise — full marketing flyer"
            caption="Tap to expand"
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
