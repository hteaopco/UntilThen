import type { ReactNode } from "react";

// A handful of gold/amber/warm pieces fall continuously behind the gift
// card content. Deterministic layout (no Math.random) so SSR and client
// match.
function ConfettiOverlay() {
  type Piece = {
    left: string;
    delay: string;
    duration: string;
    color: string;
    size: number;
    shape: "circle" | "square";
  };
  const colors = ["#c9a84c", "#e2c47a", "#c47a3a", "#e09a5a", "#e07a4a"];
  const pieces: Piece[] = Array.from({ length: 18 }).map((_, i) => ({
    left: `${(i * 13 + 5) % 100}%`,
    delay: `${((i * 0.73) % 5).toFixed(2)}s`,
    duration: `${(4 + ((i * 0.5) % 3)).toFixed(2)}s`,
    color: colors[i % colors.length],
    size: 3 + (i % 3),
    shape: i % 2 === 0 ? "circle" : "square",
  }));

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute block animate-confettiFall"
          style={{
            left: p.left,
            top: -24,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            borderRadius: p.shape === "circle" ? "50%" : "1px",
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  );
}

type PlanVariant = "featured" | "gift" | "plain";

function Plan({
  variant,
  tag,
  name,
  price,
  priceUnit,
  priceNote,
  features,
  cta,
  ctaHref = "#cta",
  ctaNote,
  overlay,
}: {
  variant: PlanVariant;
  tag: string;
  name: string;
  price: string;
  priceUnit: string;
  priceNote?: string;
  features: string[];
  cta: string;
  /** Destination for the plan CTA; defaults to the waitlist anchor. */
  ctaHref?: string;
  ctaNote?: string;
  overlay?: ReactNode;
}) {
  const featured = variant === "featured";
  const gift = variant === "gift";

  const cardClasses = featured
    ? "border-amber/40 shadow-[0_12px_32px_-10px_rgba(196,122,58,0.3)]"
    : gift
      ? "bg-[#fdf6e8] border-gold/25 shadow-[0_10px_30px_-10px_rgba(201,168,76,0.22)]"
      : "bg-white border-navy/[0.08] hover:shadow-[0_8px_24px_rgba(15,31,61,0.08)]";

  // Featured plan uses a soft top-lit amber gradient so the card has
  // depth and warmth instead of reading as a flat block of colour.
  // The lighter tone up top catches the eye; the deeper amber settles
  // the bottom so the white CTA sits on a richer, anchor-y surface.
  const cardStyle = featured
    ? {
        background:
          "linear-gradient(180deg, #e09a5a 0%, #c47a3a 55%, #a85e28 100%)",
      }
    : undefined;

  const tagColor = featured
    ? "text-white/85"
    : gift
      ? "text-gold"
      : "text-amber";

  const nameColor = featured ? "text-white" : "text-navy";
  const priceColor = featured ? "text-white" : "text-navy";
  const priceUnitColor = featured
    ? "text-white/65"
    : gift
      ? "text-ink-mid/90"
      : "text-ink-light";
  const priceNoteColor = featured
    ? "text-white/70"
    : gift
      ? "text-gold"
      : "text-ink-light";
  const featureTextColor = featured ? "text-white/85" : "text-ink-mid";
  const featureBulletColor = featured ? "text-white/70" : "text-gold";

  const ctaClasses = featured
    ? "bg-white text-amber hover:bg-amber-tint"
    : gift
      ? "bg-gold text-navy hover:bg-gold-light"
      : "bg-amber text-white hover:bg-amber-dark";

  return (
    <div
      className={`relative rounded-2xl p-9 flex flex-col transition-all border ${cardClasses}`}
      style={cardStyle}
    >
      {overlay}
      <div className="relative z-[1] flex flex-col flex-1">
        <span
          className={`block text-[10px] font-bold tracking-[0.14em] uppercase mb-4 ${tagColor}`}
        >
          {tag}
        </span>
        <div
          className={`text-xl font-extrabold tracking-[-0.5px] ${nameColor}`}
        >
          {name}
        </div>
        <div
          className={`text-5xl font-extrabold tracking-[-2px] leading-none mt-4 mb-1 ${priceColor}`}
        >
          <sub className="text-xl tracking-normal align-baseline">$</sub>
          {price}
        </div>
        <div className={`text-xs italic ${priceUnitColor}`}>{priceUnit}</div>
        <div
          className={`text-[11px] mt-1 min-h-[14px] italic ${priceNoteColor}`}
        >
          {priceNote ?? "\u00a0"}
        </div>
        <ul className="flex flex-col gap-2.5 mt-6 mb-7 flex-1">
          {features.map((f) => (
            <li
              key={f}
              className={`text-[13px] leading-[1.4] flex items-start gap-2 ${featureTextColor}`}
            >
              <span
                aria-hidden="true"
                className={`text-[9px] mt-[3px] shrink-0 ${featureBulletColor}`}
              >
                ✦
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <a
          href={ctaHref}
          className={`block text-center py-3 px-5 rounded-lg text-[13px] font-bold tracking-[0.01em] transition-all ${ctaClasses}`}
        >
          {cta}
        </a>
        {ctaNote && (
          <p
            className={`mt-3 text-[11px] italic text-center ${
              featured ? "text-white/55" : gift ? "text-ink-mid/80" : "text-ink-light"
            }`}
          >
            {ctaNote}
          </p>
        )}
      </div>
    </div>
  );
}

const BASE_FEATURES = [
  "3 time capsules included",
  "Unlimited text entries",
  "Photo uploads",
  "Voice note recording",
  "Video messages",
  "Reveal by age or date",
  "Smart writing prompts",
  "Milestone reminders",
];

const GIFT_FEATURES = [
  "Full Base plan, gifted",
  "12 months of access",
  "Beautiful gift email",
  "Perfect for baby showers & new parents",
  "No auto-renewal — recipient chooses to continue",
];

const CAPSULE_FEATURES = [
  "Any occasion",
  "Unlimited contributors",
  "Text, photos, voice & video",
  "Reveal within 60 days",
  "No account needed to open",
  "Save forever with a free account",
];

// Subtle cameo of multiple contributors, shown alongside the
// Memory Capsule card. Keeps the card from reading as a lone
// plain option while making it obvious the product is social.
function ContributorsCameo() {
  const people = [
    { initial: "S", tone: "bg-amber text-white" },
    { initial: "J", tone: "bg-gold text-navy" },
    { initial: "E", tone: "bg-navy text-white" },
    { initial: "D", tone: "bg-amber-tint text-amber" },
  ];
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {people.map((p) => (
          <span
            key={p.initial}
            aria-hidden="true"
            className={`inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-white text-[11px] font-bold ${p.tone}`}
          >
            {p.initial}
          </span>
        ))}
      </div>
      <span className="text-xs italic text-ink-mid">
        Four people wrote to Margaret for her 60th.
      </span>
    </div>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="bg-cream">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-16 lg:py-24">
        <div className="mb-12">
          <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-amber mb-2.5">
            Pricing
          </p>
          <h2 className="text-[clamp(28px,3.5vw,44px)] font-extrabold tracking-[-1.5px] text-navy leading-[1.08]">
            A <span className="font-light italic text-amber">lifetime</span> of
            moments,
            <br />
            less than a coffee a month.
          </h2>
          <p className="mt-4 text-[15px] italic text-ink-mid">
            Start for free. Keep it forever.
          </p>
        </div>

        <div className="grid gap-4 lg:gap-5 lg:grid-cols-2 max-w-[760px] mx-auto">
          <Plan
            variant="featured"
            tag="Time Capsules"
            name="Time Capsules"
            price="3.99"
            priceUnit="per month"
            priceNote="Save with annual billing at checkout"
            features={BASE_FEATURES}
            cta="Start free 7-day trial"
            ctaNote="No credit card required. Cancel anytime."
          />
          <Plan
            variant="gift"
            tag="Give as a gift"
            name="Gift"
            price="39.99"
            priceUnit="one year"
            priceNote="no auto-renewal"
            features={GIFT_FEATURES}
            cta="Give the gift →"
            overlay={<ConfettiOverlay />}
          />
        </div>

        <p className="mt-10 text-center text-sm text-ink-mid">
          Have more than one child? Add a vault for{" "}
          <span className="font-semibold text-navy">$1.99/month</span> each.
        </p>

        {/* Memory Capsule — secondary product. A single plain
            card in its own row beneath the two flagship plans,
            so the child-vault hierarchy stays obvious. A quiet
            contributors cameo sits alongside on desktop to hint
            that the product is inherently social. */}
        <div className="mt-14 max-w-[760px] mx-auto">
          <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-amber mb-2.5">
            Also available
          </p>
          <h3 className="text-[clamp(22px,2.5vw,28px)] font-extrabold tracking-[-0.8px] text-navy mb-5 leading-[1.1]">
            A one-time Memory Capsule for any milestone.
          </h3>
          <div className="grid gap-6 lg:grid-cols-[1fr,280px] items-center">
            <Plan
              variant="plain"
              tag="One-time"
              name="Memory Capsule"
              price="9.99"
              priceUnit="one-time"
              features={CAPSULE_FEATURES}
              cta="Create a capsule →"
              ctaHref="/capsules/new"
            />
            <div className="rounded-2xl border border-navy/[0.08] bg-white px-6 py-6 space-y-4">
              <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-amber">
                Margaret&rsquo;s 60th Birthday
              </div>
              <ContributorsCameo />
              <p className="text-xs text-ink-light italic leading-[1.6]">
                &ldquo;Happy birthday Mum. I remember the day you taught me
                how to drive…&rdquo; — Sarah
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
