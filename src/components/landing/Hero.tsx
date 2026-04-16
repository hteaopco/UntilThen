import Link from "next/link";

import { HeroLetterStack } from "./HeroLetterStack";

export function Hero() {
  return (
    <section id="top" className="bg-cream overflow-hidden">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 pt-[120px] pb-20 grid lg:grid-cols-2 gap-12 lg:gap-20 items-center lg:min-h-[100vh]">
        <div className="relative z-[2]">
          <div className="hero-tag inline-flex items-center gap-2 text-xs font-bold tracking-[0.12em] uppercase text-amber bg-amber-tint px-[14px] py-1.5 rounded-md mb-6">
            <span aria-hidden="true">✦</span>
            Now taking early access
          </div>

          <h1 className="hero-headline text-[clamp(40px,5vw,64px)] font-extrabold leading-[1.05] tracking-[-2px] text-navy mb-5">
            Write to who
            <br />
            they&rsquo;ll{" "}
            <span className="font-light italic text-amber">become.</span>
          </h1>

          {/* The single emotional line the rest of the page earns
              the right to make. Kept deliberately short. */}
          <p className="hero-sub text-[19px] lg:text-[21px] font-medium italic text-amber/90 leading-[1.4] mb-5 max-w-[440px]">
            One day, they&rsquo;ll hear your voice again.
          </p>

          <p className="hero-sub text-[17px] font-normal leading-[1.7] text-ink-mid max-w-[440px] mb-10">
            Write letters, voice notes, and memories they&rsquo;ll open when
            they&rsquo;re older — on their 18th birthday, or any moment you
            choose. Or{" "}
            <a
              href="#pricing"
              className="text-amber font-semibold hover:text-amber-dark transition-colors"
            >
              collect messages for a birthday, retirement, or milestone
            </a>
            .
          </p>

          <div className="hero-actions">
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#cta"
                className="inline-block bg-amber text-white px-7 py-3.5 rounded-lg text-[15px] font-bold tracking-[0.01em] hover:bg-amber-dark hover:-translate-y-0.5 transition-all"
                style={{ boxShadow: "0 4px 16px rgba(15,31,61,0.2)" }}
              >
                Start writing for them →
              </a>
              {/* Secondary path for the capsule audience. Routes
                  to sign-up with the capsule-path hint persisted
                  via redirect_url so onboarding auto-selects it.
                  `next/link` (not a plain <a>) is required by
                  Next's no-html-link-for-pages rule — Railway's
                  production build treats that lint rule as an
                  error. */}
              <Link
                href="/sign-up?redirect_url=/onboarding?path=capsule"
                className="inline-block bg-white text-navy border border-navy/15 px-6 py-3.5 rounded-lg text-[15px] font-bold tracking-[0.01em] hover:border-navy transition-colors"
              >
                Create a Memory Capsule
              </Link>
            </div>
            <p className="mt-3 text-[13px] italic text-ink-light">
              Join the waitlist for early access
            </p>
          </div>
        </div>

        <div className="hero-right">
          <HeroLetterStack />
        </div>
      </div>
    </section>
  );
}
