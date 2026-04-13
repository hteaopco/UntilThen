function LetterCard({
  width,
  top,
  left,
  zIndex,
  floatClass,
  bg,
  to,
  title,
  preview,
  lock,
}: {
  width: number;
  top: number;
  left: number;
  zIndex: number;
  floatClass: string;
  bg: string;
  to: string;
  title: string;
  preview: string;
  lock: string;
}) {
  return (
    <div
      className={`absolute rounded-2xl border border-navy/[0.08] px-[26px] py-6 ${bg} ${floatClass}`}
      style={{
        width,
        // Prevent the card from overflowing a narrow viewport — shrinks
        // to fit the hero-right column when it's tighter than `width`.
        maxWidth: `calc(100% - ${left}px)`,
        top,
        left,
        zIndex,
        boxShadow:
          "0 4px 24px rgba(15,31,61,0.08), 0 1px 4px rgba(15,31,61,0.04)",
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.1em] text-amber font-bold mb-1.5">
        {to}
      </div>
      <h3 className="text-sm font-bold text-navy leading-[1.3] mb-1.5">
        {title}
      </h3>
      <p className="text-xs text-ink-light leading-[1.6]">{preview}</p>
      <div className="mt-3.5 pt-3 border-t border-navy/[0.08] flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] font-bold text-gold">
        <span className="inline-block w-[5px] h-[5px] rounded-full bg-gold" />
        {lock}
      </div>
    </div>
  );
}

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

          <p className="hero-sub text-[17px] font-normal leading-[1.7] text-ink-mid max-w-[440px] mb-10">
            Seal letters, voice notes and memories in a vault your child unlocks
            when they&rsquo;re ready — on their 18th birthday, or any milestone
            you choose.
          </p>

          <div className="hero-actions">
            <a
              href="#cta"
              className="inline-block bg-navy text-white px-7 py-3.5 rounded-lg text-[15px] font-bold tracking-[0.01em] hover:bg-navy-mid hover:-translate-y-0.5 transition-all"
              style={{ boxShadow: "0 4px 16px rgba(15,31,61,0.2)" }}
            >
              Join the waitlist →
            </a>
          </div>
        </div>

        <div className="hero-right relative h-[460px] lg:h-[480px] w-full">
          <LetterCard
            width={300}
            top={0}
            left={20}
            zIndex={3}
            floatClass="animate-float1"
            bg="bg-white"
            to="To Ellie, age 18"
            title="The night before your first day of school"
            preview="You picked the backpack with tiny stars. I watched you pack it three times…"
            lock="Unlocks Sept 2038"
          />
          <LetterCard
            width={280}
            top={130}
            left={0}
            zIndex={2}
            floatClass="animate-float2"
            bg="bg-amber-tint"
            to="For when you fall in love"
            title="A voice note from Dad"
            preview="🎙 2:34 · recorded on a rainy Sunday"
            lock="Sealed"
          />
          <LetterCard
            width={260}
            top={250}
            left={50}
            zIndex={1}
            floatClass="animate-float3"
            bg="bg-gold-tint"
            to="Always"
            title="The day we brought you home"
            preview="📷 47 photos · with a letter"
            lock="Sealed"
          />
        </div>
      </div>
    </section>
  );
}
