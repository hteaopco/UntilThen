function Plan({
  tag,
  name,
  price,
  per,
  features,
  cta,
  ctaStyle,
  featured = false,
}: {
  tag: string;
  name: string;
  price: string;
  per: string;
  features: string[];
  cta: string;
  ctaStyle: "navy" | "white" | "outline";
  featured?: boolean;
}) {
  const ctaClasses = {
    navy: "bg-navy text-white hover:bg-navy-mid",
    white: "bg-white text-navy hover:bg-sky-tint",
    outline:
      "border-[1.5px] border-navy/[0.08] text-ink-mid hover:border-navy hover:text-navy",
  }[ctaStyle];

  return (
    <div
      className={`rounded-2xl p-9 transition-all ${
        featured
          ? "bg-navy border border-navy"
          : "bg-white border border-navy/[0.08] hover:shadow-[0_8px_24px_rgba(15,31,61,0.08)]"
      }`}
    >
      <span
        className={`block text-[10px] font-bold tracking-[0.14em] uppercase mb-4 ${
          featured ? "text-sky-light" : "text-sky"
        }`}
      >
        {tag}
      </span>
      <div
        className={`text-xl font-extrabold tracking-[-0.5px] ${
          featured ? "text-white" : "text-navy"
        }`}
      >
        {name}
      </div>
      <div
        className={`text-5xl font-extrabold tracking-[-2px] leading-none mt-4 mb-1 ${
          featured ? "text-white" : "text-navy"
        }`}
      >
        <sub className="text-xl tracking-normal align-baseline">$</sub>
        {price}
      </div>
      <div
        className={`text-xs italic mb-6 ${
          featured ? "text-white/40" : "text-ink-light"
        }`}
      >
        {per}
      </div>
      <ul className="flex flex-col gap-2.5 mb-7">
        {features.map((f) => (
          <li
            key={f}
            className={`text-[13px] leading-[1.4] flex items-start gap-2 ${
              featured ? "text-white/75" : "text-ink-mid"
            }`}
          >
            <span
              aria-hidden="true"
              className={`text-[9px] mt-[3px] shrink-0 ${
                featured ? "text-gold-light" : "text-gold"
              }`}
            >
              ✦
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <a
        href="#cta"
        className={`block text-center py-3 px-5 rounded-lg text-[13px] font-bold tracking-[0.01em] transition-all ${ctaClasses}`}
      >
        {cta}
      </a>
    </div>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-16 lg:py-24">
        <div className="mb-14">
          <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-sky mb-2.5">
            Pricing
          </p>
          <h2 className="text-[clamp(28px,3.5vw,44px)] font-extrabold tracking-[-1.5px] text-navy leading-[1.08]">
            A <span className="font-light italic text-sky">lifetime</span> of letters,
            <br />
            less than a coffee a month.
          </h2>
        </div>

        <div className="grid gap-4 lg:gap-5 lg:grid-cols-3">
          <Plan
            tag="Free forever"
            name="Seed"
            price="0"
            per="always free"
            features={[
              "Up to 10 entries",
              "Text letters & photos",
              "One child vault",
              "Reveal date logic",
            ]}
            cta="Get started free"
            ctaStyle="outline"
          />
          <Plan
            featured
            tag="Most popular"
            name="Family"
            price="5"
            per="per month · $40/year"
            features={[
              "Unlimited entries",
              "Voice notes & video",
              "Up to 3 child vaults",
              "Multi-contributor invites",
              "Smart prompts & reminders",
              "Print keepsake book",
            ]}
            cta="Start your vault"
            ctaStyle="white"
          />
          <Plan
            tag="Give as a gift"
            name="Gift"
            price="40"
            per="one year · for grandparents"
            features={[
              "Full Family plan, gifted",
              "Beautiful gift email",
              "Ideal for new parents",
              "Auto-cancels or renews",
            ]}
            cta="Give the gift"
            ctaStyle="outline"
          />
        </div>
      </div>
    </section>
  );
}
