import Link from "next/link";
import { Heart, Mail, Sparkles } from "lucide-react";

import { Footer } from "@/components/landing/Footer";
import { TopNav } from "@/components/ui/TopNav";

/**
 * Public marketing landing for the wedding-capsule product.
 * Primary CTA forwards to /capsules/new?occasion=WEDDING which
 * skips the gift-capsule pricing intro and pre-selects WEDDING +
 * couple in the creation flow. Signed-out visitors get bounced
 * through sign-up first via Clerk's redirect_url chain.
 */
export const metadata = {
  title: "Weddings — untilThen",
  description:
    "A wedding capsule that opens on your first anniversary. Guests leave letters, voice notes, and photos at the wedding — sealed and revealed on your one-year.",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function WeddingsPage() {
  return (
    <>
      <TopNav />
      <main className="pt-10 sm:pt-14 pb-20 bg-cream min-h-screen">
        <section className="mx-auto max-w-[1080px] px-5 lg:px-14">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-tint border border-amber/30 text-amber-dark text-[11px] font-bold uppercase tracking-[0.14em]">
                <Sparkles size={12} strokeWidth={2.25} />
                Wedding capsules &mdash; new
              </span>
              <h1 className="mt-5 font-brush text-[44px] sm:text-[64px] lg:text-[76px] leading-[0.95] text-navy">
                A wedding gift
                <br />
                that opens
                <br />
                <span className="text-amber">one year later.</span>
              </h1>
              <p className="mt-6 text-[16px] sm:text-[18px] text-navy/70 max-w-[520px] leading-[1.55]">
                Set a card on every table. Guests scan a QR code and leave a
                letter, voice note, or photo for the couple. Everything is
                sealed and quietly revealed on your first anniversary &mdash;
                a love letter from the day, delivered when you need it most.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
                <Link
                  href="/sign-up?redirect_url=%2Fcapsules%2Fnew%3Foccasion%3DWEDDING"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-navy text-white text-[14px] font-bold hover:bg-navy/90 transition-colors"
                >
                  <Heart size={16} strokeWidth={2} fill="currentColor" />
                  Start your wedding capsule
                </Link>
                <a
                  href="mailto:hello@untilthenapp.io?subject=Wedding%20capsule%20question"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white border border-navy/15 text-navy text-[14px] font-bold hover:border-amber/40 transition-colors"
                >
                  <Mail size={16} strokeWidth={2} />
                  Talk to us
                </a>
              </div>
              <p className="mt-4 text-[12px] text-navy/50">
                $99.99 &middot; one-time &middot; opens on your first
                anniversary
              </p>
            </div>

            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden bg-white border border-amber/15 shadow-[0_24px_64px_-24px_rgba(15,31,61,0.25)] aspect-[4/5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/auto_crop%23TUFISHowSlgtN3cjMSMxZmExNmQzYjc2N2RkY2NmNmU5N2I5NTA2ODc0NDhlNiMxNTM2IyNUUkFOU0ZPUk1BVElPTl9SRVFVRVNU.png"
                  alt="Gift capsule with ribbon and dried flowers"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1080px] px-5 lg:px-14 mt-20 lg:mt-28">
          <h2 className="text-[22px] sm:text-[28px] font-extrabold text-navy tracking-[-0.5px] text-center">
            How it works
          </h2>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            <Step
              n="1"
              title="Order your capsule"
              body="Pick your wedding date. We send a printable easel sign and table cards with your private QR code."
            />
            <Step
              n="2"
              title="Guests contribute"
              body="At the reception, guests scan and leave a letter, voice note, or photo. No app, no signup."
            />
            <Step
              n="3"
              title="Reveal at one year"
              body="On your first anniversary, your inbox lights up with everything your people wanted you to remember."
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white border border-navy/[0.06] p-6 shadow-[0_4px_16px_-6px_rgba(15,31,61,0.06)]">
      <div className="w-9 h-9 rounded-full bg-amber-tint border border-amber/25 flex items-center justify-center text-amber-dark text-[14px] font-extrabold">
        {n}
      </div>
      <h3 className="mt-4 text-[16px] font-extrabold text-navy">{title}</h3>
      <p className="mt-2 text-[14px] text-navy/70 leading-[1.5]">{body}</p>
    </div>
  );
}
