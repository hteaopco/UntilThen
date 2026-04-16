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
            Write something they&rsquo;ll open when it matters most.
          </h1>

          <p className="hero-sub text-[19px] lg:text-[21px] font-medium italic text-amber/90 leading-[1.4] mb-10 max-w-[480px]">
            Letters, voice notes, and memories — sealed now, opened years
            from now.
          </p>

          <div className="hero-actions">
            <a
              href="#cta"
              className="inline-block bg-amber text-white px-7 py-3.5 rounded-lg text-[15px] font-bold tracking-[0.01em] hover:bg-amber-dark hover:-translate-y-0.5 transition-all"
              style={{ boxShadow: "0 4px 16px rgba(15,31,61,0.2)" }}
            >
              Start your first capsule →
            </a>
          </div>
        </div>

        <div className="hero-right">
          <HeroLetterStack />
          <p className="mt-5 text-center text-[14px] italic text-ink-mid">
            Everything you save stays sealed — until it&rsquo;s time.
          </p>
        </div>
      </div>
    </section>
  );
}
