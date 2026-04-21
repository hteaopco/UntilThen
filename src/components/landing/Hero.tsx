import { HeroImageCrossfade } from "@/components/landing/HeroImageCrossfade";

export function Hero() {
  return (
    <section id="top" className="bg-cream overflow-hidden">
      <div className="mx-auto max-w-[1080px] px-6 lg:px-14 pt-[120px] lg:pt-[140px] pb-10 lg:pb-20">
        {/* Mobile / tablet: stacked and centered — same as before.
            Desktop (lg+): two-column grid with copy on the left
            (left-aligned) and the crossfade art on the right. */}
        <div className="flex flex-col items-center text-center lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:text-left">
          <div className="relative z-[2] max-w-[640px] lg:max-w-[520px]">
            <h1 className="hero-headline text-[clamp(40px,5vw,64px)] font-extrabold leading-[1.05] tracking-[-2px] text-navy mb-5">
              Say it now.
              <br />
              They&rsquo;ll{" "}
              <span className="font-light italic text-amber">open later.</span>
            </h1>

            <p className="hero-sub text-[17px] font-normal leading-[1.7] text-ink-mid max-w-[480px] mx-auto lg:mx-0 mb-6">
              Create time capsules filled with letters, voice notes, photos,
              and videos they&rsquo;ll open years from now — or invite others
              to contribute messages for a meaningful moment.
            </p>

            <div className="hero-actions">
              <a
                href="#cta"
                className="inline-block bg-amber text-white px-7 py-3.5 rounded-lg text-[15px] font-bold tracking-[0.01em] hover:bg-amber-dark hover:-translate-y-0.5 transition-all"
                style={{ boxShadow: "0 4px 16px rgba(15,31,61,0.2)" }}
              >
                Start a time capsule
              </a>
            </div>
          </div>

          <div className="mt-6 lg:mt-0 w-full">
            <HeroImageCrossfade />
          </div>
        </div>
      </div>
    </section>
  );
}
