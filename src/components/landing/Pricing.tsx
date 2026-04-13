function Plan({
  name,
  price,
  sub,
  features,
  cta,
  featured = false,
}: {
  name: string;
  price: string;
  sub: string;
  features: string[];
  cta: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl p-8 border flex flex-col ${
        featured
          ? "bg-rust border-rust text-cream lg:-my-2 lg:scale-[1.02] shadow-[0_30px_60px_-20px_rgba(192,90,58,0.5)]"
          : "bg-cream/[0.03] border-cream/10 text-cream"
      }`}
    >
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cream text-ink text-[10px] uppercase tracking-[0.25em] font-semibold px-3 py-1 rounded-full">
          Most popular
        </div>
      )}
      <div className="text-xs uppercase tracking-[0.25em] font-semibold opacity-80">
        {name}
      </div>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold tracking-[-0.02em]">{price}</span>
        <span className="text-sm opacity-70">{sub}</span>
      </div>
      <ul className="mt-8 space-y-3 text-sm flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <span
              className={`mt-[7px] inline-block w-1.5 h-1.5 rounded-full ${
                featured ? "bg-cream" : "bg-warm"
              }`}
            />
            <span className={featured ? "text-cream/95" : "text-cream/80"}>
              {f}
            </span>
          </li>
        ))}
      </ul>
      <a
        href="#cta"
        className={`mt-8 block text-center py-3 rounded-full text-sm font-medium transition ${
          featured
            ? "bg-cream text-ink hover:opacity-90"
            : "border border-cream/30 text-cream hover:bg-cream/5"
        }`}
      >
        {cta}
      </a>
    </div>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="bg-dark text-cream py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-warm font-semibold">
          Pricing
        </p>
        <h2 className="mt-4 text-4xl lg:text-5xl font-extrabold tracking-[-0.02em] max-w-3xl leading-[1.1]">
          A <span className="font-light italic text-warm">lifetime</span> of
          letters, for less than a coffee a month.
        </h2>

        <div className="mt-20 grid gap-6 lg:grid-cols-3 lg:items-stretch">
          <Plan
            name="Seed"
            price="$0"
            sub="/month · Free forever"
            features={[
              "Up to 10 entries",
              "Text letters & photo uploads",
              "One child vault",
              "Reveal date logic",
            ]}
            cta="Get started free"
          />
          <Plan
            featured
            name="Family"
            price="$5"
            sub="/month · $40/year"
            features={[
              "Unlimited entries",
              "Voice notes & video",
              "Up to 3 child vaults",
              "Multi-contributor invites",
              "Smart prompts & reminders",
              "Print keepsake book at unlock",
            ]}
            cta="Start your vault"
          />
          <Plan
            name="Gift"
            price="$40"
            sub="/year · Give as a gift"
            features={[
              "Full Family plan, gifted",
              "Beautiful gift email",
              "Ideal for new parents",
              "Auto-cancels or renews",
            ]}
            cta="Give the gift"
          />
        </div>
      </div>
    </section>
  );
}
