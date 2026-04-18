import { HeroImageCrossfade } from "@/components/landing/HeroImageCrossfade";

export function Hero() {
  return (
    <section id="top" className="bg-cream overflow-hidden">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 pt-[120px] pb-10 flex flex-col items-center text-center">
        <div className="relative z-[2] max-w-[640px]">
          <h1 className="hero-headline text-[clamp(40px,5vw,64px)] font-extrabold leading-[1.05] tracking-[-2px] text-navy mb-5">
            Say it now.
            <br />
            They&rsquo;ll{" "}
            <span className="font-light italic text-amber">open later.</span>
          </h1>

          <p className="hero-sub text-[17px] font-normal leading-[1.7] text-ink-mid max-w-[480px] mx-auto mb-6">
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

        <div className="mt-6 w-full">
          <HeroImageCrossfade />
        </div>
      </div>
    </section>
  );
}
