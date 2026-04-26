import Link from "next/link";
import { BarChart3, Building2, Mail, Sparkles, Users } from "lucide-react";

import { Footer } from "@/components/landing/Footer";
import { TopNav } from "@/components/ui/TopNav";

/**
 * Public marketing landing for the enterprise / "untilThen for
 * Business" channel. The signed-in dashboard lives at /enterprise
 * and is gated by org membership; this page is the open-to-public
 * pitch + lead form. CTA routes to a mailto for now until the
 * sales-intake flow is wired up.
 */
export const metadata = {
  title: "untilThen for Business — Enterprise",
  description:
    "Give your team meaningful, lasting gifts. Milestone capsules, retirements, sendoffs — sent and tracked from a single roster.",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function BusinessPage() {
  return (
    <>
      <TopNav />
      <main className="pt-10 sm:pt-14 pb-20 bg-cream min-h-screen">
        <section className="mx-auto max-w-[1080px] px-5 lg:px-14">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-tint border border-amber/30 text-amber-dark text-[11px] font-bold uppercase tracking-[0.14em]">
                <Sparkles size={12} strokeWidth={2.25} />
                Coming soon
              </span>
              <h1 className="mt-5 font-extrabold text-navy text-[40px] sm:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-1px]">
                Gifts that
                <br />
                <span className="text-amber">actually mean</span>
                <br />
                something.
              </h1>
              <p className="mt-6 text-[16px] sm:text-[18px] text-navy/70 max-w-[520px] leading-[1.55]">
                Retirement. A 10-year anniversary. A teammate moving on.
                untilThen for Business turns those moments into a capsule of
                letters, voice notes, and photos &mdash; collected from
                everyone who matters and revealed at the right time. One
                roster, one dashboard, one bill.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
                <a
                  href="mailto:hello@untilthenapp.io?subject=untilThen%20for%20Business"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-navy text-white text-[14px] font-bold hover:bg-navy/90 transition-colors"
                >
                  <Mail size={16} strokeWidth={2} />
                  Talk to sales
                </a>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white border border-navy/15 text-navy text-[14px] font-bold hover:border-amber/40 transition-colors"
                >
                  Start free
                </Link>
              </div>
              <p className="mt-4 text-[12px] text-navy/50">
                Per-seat pricing &middot; SSO available &middot; Volume
                discounts on milestone capsules
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <PerkCard
                icon={<Users size={18} strokeWidth={1.75} className="text-amber-dark" />}
                title="One roster"
                body="Add your team in bulk. Assign Owners, Admins, and Members so HR and managers can send capsules without sharing logins."
              />
              <PerkCard
                icon={<Building2 size={18} strokeWidth={1.75} className="text-amber-dark" />}
                title="Centralized billing"
                body="Every capsule charged to a single card on file. No expense reports."
              />
              <PerkCard
                icon={<BarChart3 size={18} strokeWidth={1.75} className="text-amber-dark" />}
                title="Stat board"
                body="See what's been sent, what's sealed, and what's on its way to be revealed &mdash; org-wide, in one place."
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1080px] px-5 lg:px-14 mt-20 lg:mt-28">
          <h2 className="text-[22px] sm:text-[28px] font-extrabold text-navy tracking-[-0.5px] text-center">
            Built for moments your team will remember
          </h2>
          <p className="mt-3 text-[15px] text-navy/65 text-center max-w-[640px] mx-auto">
            Retirements, decade anniversaries, going-away gifts, weddings,
            new-baby capsules, founder sendoffs. If it deserves more than a
            card, it deserves a capsule.
          </p>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            <UseCase
              title="Retirements"
              body="40-year career, 40 voices on it. Capsule opens at their last day."
            />
            <UseCase
              title="Anniversaries"
              body="A 10-year work anniversary capsule, contributed to by everyone they've ever managed."
            />
            <UseCase
              title="Sendoffs"
              body="Transfers, going-away gifts, founder exits &mdash; a sealed letter from the team that reveals on a date you choose."
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function PerkCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-navy/[0.06] p-5 shadow-[0_4px_16px_-6px_rgba(15,31,61,0.06)] flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-full bg-amber-tint border border-amber/25 flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-[15px] font-extrabold text-navy">{title}</h3>
        <p className="mt-1 text-[13px] text-navy/70 leading-[1.5]">{body}</p>
      </div>
    </div>
  );
}

function UseCase({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white border border-navy/[0.06] p-6 shadow-[0_4px_16px_-6px_rgba(15,31,61,0.06)]">
      <h3 className="text-[16px] font-extrabold text-navy">{title}</h3>
      <p className="mt-2 text-[14px] text-navy/70 leading-[1.5]">{body}</p>
    </div>
  );
}
