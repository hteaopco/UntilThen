"use client";

import { useState } from "react";

type Billing = "monthly" | "annual";

function Toggle({
  billing,
  onChange,
}: {
  billing: Billing;
  onChange: (b: Billing) => void;
}) {
  return (
    <div className="inline-flex items-center bg-navy/[0.05] rounded-full p-1 text-sm border border-navy/[0.06]">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        aria-pressed={billing === "monthly"}
        className={`px-5 py-2 rounded-full font-bold tracking-[0.01em] transition-colors ${
          billing === "monthly"
            ? "bg-navy text-white shadow-sm"
            : "text-ink-mid hover:text-navy"
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("annual")}
        aria-pressed={billing === "annual"}
        className={`px-5 py-2 rounded-full font-bold tracking-[0.01em] transition-colors inline-flex items-center gap-2 ${
          billing === "annual"
            ? "bg-navy text-white shadow-sm"
            : "text-ink-mid hover:text-navy"
        }`}
      >
        Annual
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold tracking-[0.06em] ${
            billing === "annual"
              ? "bg-gold text-navy"
              : "bg-gold/15 text-gold"
          }`}
        >
          SAVE 27%
        </span>
      </button>
    </div>
  );
}

type CtaStyle = "navy" | "white" | "outline";

function Plan({
  featured,
  tag,
  name,
  price,
  priceUnit,
  priceNote,
  features,
  cta,
  ctaNote,
  ctaStyle,
}: {
  featured?: boolean;
  tag: string;
  name: string;
  price: string;
  priceUnit: string;
  priceNote?: string;
  features: string[];
  cta: string;
  ctaNote?: string;
  ctaStyle: CtaStyle;
}) {
  const ctaClasses = {
    navy: "bg-navy text-white hover:bg-navy-mid",
    white: "bg-white text-navy hover:bg-sky-tint",
    outline:
      "border-[1.5px] border-navy/[0.12] text-ink-mid hover:border-navy hover:text-navy",
  }[ctaStyle];

  return (
    <div
      className={`relative rounded-2xl p-9 flex flex-col transition-all ${
        featured
          ? "bg-navy border border-navy shadow-[0_10px_30px_-10px_rgba(15,31,61,0.25)]"
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
        className={`text-xs italic ${
          featured ? "text-white/45" : "text-ink-light"
        }`}
      >
        {priceUnit}
      </div>
      <div
        className={`text-[11px] mt-0.5 min-h-[14px] ${
          featured ? "text-white/55" : "text-ink-light"
        }`}
      >
        {priceNote ?? "\u00a0"}
      </div>
      <ul className="flex flex-col gap-2.5 mt-6 mb-7 flex-1">
        {features.map((f) => (
          <li
            key={f}
            className={`text-[13px] leading-[1.4] flex items-start gap-2 ${
              featured ? "text-white/80" : "text-ink-mid"
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
      {ctaNote && (
        <p
          className={`mt-3 text-[11px] italic text-center ${
            featured ? "text-white/55" : "text-ink-light"
          }`}
        >
          {ctaNote}
        </p>
      )}
    </div>
  );
}

const BASE_FEATURES = [
  "1 child vault included",
  "Unlimited text entries",
  "12 photos per year",
  "Voice notes up to 2 minutes",
  "Video clips up to 60 seconds",
  "Multi-contributor invites",
  "Reveal by age or date",
  "Smart writing prompts",
  "Milestone reminders",
];

const GIFT_FEATURES = [
  "Full Base plan, gifted",
  "12 months of access",
  "Beautiful gift email",
  "Perfect for baby showers & new parents",
  "No auto-renewal — gift recipient chooses to continue",
];

export function Pricing() {
  const [billing, setBilling] = useState<Billing>("annual");

  return (
    <section id="pricing" className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-16 lg:py-24">
        <div className="mb-10">
          <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-sky mb-2.5">
            Pricing
          </p>
          <h2 className="text-[clamp(28px,3.5vw,44px)] font-extrabold tracking-[-1.5px] text-navy leading-[1.08]">
            A <span className="font-light italic text-sky">lifetime</span> of
            moments,
            <br />
            less than a coffee a month.
          </h2>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center lg:justify-start mb-10">
          <Toggle billing={billing} onChange={setBilling} />
        </div>

        <div className="grid gap-4 lg:gap-5 lg:grid-cols-3 lg:items-stretch">
          <Plan
            featured={billing === "monthly"}
            tag="Base · Monthly"
            name="Monthly"
            price="3.99"
            priceUnit="per month"
            features={BASE_FEATURES}
            cta="Start free 7-day trial"
            ctaNote="No credit card required. Cancel anytime."
            ctaStyle={billing === "monthly" ? "white" : "navy"}
          />
          <Plan
            featured={billing === "annual"}
            tag="Base · Annual · Save 27%"
            name="Annual"
            price="34.99"
            priceUnit="per year"
            priceNote="~$2.92/month"
            features={BASE_FEATURES}
            cta="Start free 7-day trial"
            ctaNote="No credit card required. Cancel anytime."
            ctaStyle={billing === "annual" ? "white" : "navy"}
          />
          <Plan
            tag="Give as a gift"
            name="Gift"
            price="39.99"
            priceUnit="one year"
            priceNote="no auto-renewal"
            features={GIFT_FEATURES}
            cta="Give the gift →"
            ctaStyle="outline"
          />
        </div>

        <p className="mt-10 text-center text-sm text-ink-mid">
          Have more than one child? Add a vault for{" "}
          <span className="font-semibold text-navy">$1.99/month</span> each.
        </p>
      </div>
    </section>
  );
}
