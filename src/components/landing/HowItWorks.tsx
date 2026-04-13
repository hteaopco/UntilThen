function Step({
  n,
  emoji,
  title,
  body,
}: {
  n: string;
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative bg-mist hover:bg-sand transition-colors rounded-2xl p-8 lg:p-10 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute -top-6 -right-2 text-[140px] font-extrabold text-ink/[0.05] leading-none pointer-events-none select-none"
      >
        {n}
      </div>
      <div className="relative">
        <div className="text-[11px] uppercase tracking-[0.25em] text-rust font-semibold">
          Step {n}
        </div>
        <div className="mt-5 text-3xl">{emoji}</div>
        <h3 className="mt-5 text-xl font-semibold text-ink">{title}</h3>
        <p className="mt-3 text-ink/60 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how" className="py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-rust font-semibold">
          How it works
        </p>
        <h2 className="mt-4 text-4xl lg:text-5xl font-extrabold text-ink tracking-[-0.02em] max-w-2xl leading-[1.1]">
          Three steps. A{" "}
          <span className="font-light italic text-rust">lifetime</span> of
          letters.
        </h2>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          <Step
            n="01"
            emoji="✍️"
            title="Write, record, or upload"
            body="Write a letter in our quiet editor, record a voice note, or upload a photo with a caption. Each entry takes minutes — and lasts forever."
          />
          <Step
            n="02"
            emoji="🔒"
            title="Set a reveal age or date"
            body="Every entry is sealed until a milestone you choose — their 13th birthday, graduation, when they fall in love. Only you decide when it opens."
          />
          <Step
            n="03"
            emoji="🎁"
            title="The vault unlocks"
            body="On reveal day, your child opens a vault of letters from across their entire childhood — each one a gift from a past version of you."
          />
        </div>
      </div>
    </section>
  );
}
