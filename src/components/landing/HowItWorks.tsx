function Step({
  num,
  emoji,
  title,
  body,
}: {
  num: string;
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-navy/[0.08] bg-[#f8fafc] hover:bg-sky-tint hover:border-sky/20 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,31,61,0.08)] transition-all px-8 py-9">
      <div
        aria-hidden="true"
        className="text-[64px] font-extrabold text-navy opacity-[0.05] leading-none -mb-[18px] tracking-[-3px]"
      >
        {num}
      </div>
      <span className="text-2xl block mb-3.5">{emoji}</span>
      <h3 className="text-[17px] font-bold text-navy mb-2 tracking-[-0.3px]">
        {title}
      </h3>
      <p className="text-sm leading-[1.75] text-ink-mid">{body}</p>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how" className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-16 lg:py-24">
        <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-sky mb-3.5">
          How it works
        </p>
        <h2 className="text-[clamp(26px,3.5vw,46px)] font-extrabold tracking-[-1.5px] leading-[1.08] text-navy mb-16 max-w-[560px]">
          It&rsquo;s Simple. Capture
          <br />
          <span className="font-light italic text-sky">emotions</span> as they
          happen.
        </h2>

        <div className="grid gap-4 lg:gap-6 lg:grid-cols-3">
          <Step
            num="01"
            emoji="✍️"
            title="Write, record, or upload"
            body="Write a letter, record a voice note, or upload a photo with a caption. Each entry takes minutes — and lasts a lifetime."
          />
          <Step
            num="02"
            emoji="🔒"
            title="Set a reveal age or date"
            body="Every entry is sealed until a milestone you choose — their 13th birthday, graduation, or the day they fall in love."
          />
          <Step
            num="03"
            emoji="🎁"
            title="The vault unlocks"
            body="On reveal day, your child opens a vault of letters from across their entire childhood — each one a gift from a past version of you."
          />
        </div>
      </div>
    </section>
  );
}
