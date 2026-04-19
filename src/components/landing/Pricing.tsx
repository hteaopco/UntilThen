"use client";

import { Clock, Gift } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";

function RisingDotsOverlay() {
  const drifts = [12,-18,8,-14,20,-10,6,-22,15,-8,18,-12,10,-16,22,-6,14,-20,9,-15,24,-11,7,-19,16,-9,13,-17,11,-21];
  const pieces = Array.from({ length: 30 }).map((_, i) => ({
    left: `${(i * 8.5 + 3) % 100}%`,
    delay: `${((i * 0.8) % 7).toFixed(2)}s`,
    duration: `${(5 + ((i * 0.6) % 4)).toFixed(2)}s`,
    size: 2 + (i % 3),
    drift: drifts[i] ?? 0,
  }));

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl"
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute block rounded-full"
          style={{
            left: p.left,
            bottom: -8,
            width: p.size,
            height: p.size,
            background: "rgba(255,255,255,0.75)",
            animationName: "dotRise",
            animationDelay: p.delay,
            animationDuration: p.duration,
            animationTimingFunction: "ease-out",
            animationIterationCount: "infinite",
            "--drift": `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

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

type PlanVariant = "featured" | "gift";

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
  ribbon,
}: {
  variant: PlanVariant;
  tag: string;
  name: string;
  price: string;
  priceUnit: string;
  priceNote?: string;
  features: string[];
  cta: string;
  /** Destination for the plan CTA; defaults to sign-up. */
  ctaHref?: string;
  ctaNote?: string;
  overlay?: ReactNode;
  ribbon?: string;
}) {
  const featured = variant === "featured";
  const gift = variant === "gift";

  const cardClasses = featured
    ? "border-amber/15 shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
    : "bg-[#fdf6e8] border-gold/15 shadow-[0_4px_12px_rgba(0,0,0,0.04)]";

  const cardStyle = featured
    ? { background: "linear-gradient(180deg, #d4a06a 0%, #c58a55 100%)" }
    : undefined;

  const tagColor = featured ? "text-white/85" : "text-gold";

  const nameColor = featured ? "text-white" : "text-navy";
  const priceColor = featured ? "text-white" : "text-navy";
  const priceUnitColor = featured ? "text-white/65" : "text-ink-mid/90";
  const priceNoteColor = featured ? "text-white/70" : "text-gold";
  const featureTextColor = featured ? "text-white/85" : "text-ink-mid";
  const featureBulletColor = featured ? "text-white/70" : "text-gold";

  const ctaClasses = featured
    ? "bg-white text-amber hover:bg-amber-tint"
    : "bg-gold text-navy hover:bg-gold-light";

  return (
    <div
      className={`relative rounded-3xl px-8 py-7 flex flex-col transition-all border ${cardClasses}`}
      style={cardStyle}
    >
      {ribbon && (
        <div
          className="absolute top-4 right-4 z-[2] px-3 py-1 rounded-full text-[10px] font-semibold tracking-[0.08em] uppercase"
          style={{
            color: "#8b6a1d",
            background: "rgba(255, 245, 220, 0.9)",
            border: "1px solid rgba(201,168,76,0.28)",
          }}
        >
          {ribbon}
        </div>
      )}
      {overlay}
      <div className="relative z-[1] flex flex-col flex-1">
        <span
          className={`block text-[10px] font-bold tracking-[0.14em] uppercase mb-2.5 ${tagColor}`}
        >
          {tag}
        </span>
        <div
          className={`text-xl font-extrabold tracking-[-0.5px] mb-2.5 ${nameColor}`}
        >
          {name}
        </div>
        <div
          className={`text-5xl font-extrabold tracking-[-2px] leading-none mb-1.5 ${priceColor}`}
        >
          <sub className="text-xl tracking-normal align-baseline">$</sub>
          {price}
        </div>
        <div className={`text-xs italic ${priceUnitColor}`}>{priceUnit}</div>
        <div
          className={`text-[11px] mt-1 min-h-[14px] italic mb-5 ${priceNoteColor}`}
        >
          {priceNote ?? "\u00a0"}
        </div>
        <ul className="flex flex-col gap-2 mb-6 flex-1">
          {features.map((f) => (
            <li
              key={f}
              className={`text-[13px] leading-[1.4] flex items-start gap-2.5 ${featureTextColor}`}
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
          className={`block text-center py-3 px-5 rounded-xl text-[13px] font-bold tracking-[0.01em] transition-all ${ctaClasses}`}
        >
          {cta}
        </a>
        {ctaNote && (
          <p
            className={`mt-2.5 text-[11px] italic text-center ${
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

// PRICING: Time Capsules — $4.99/mo (3 capsules), $0.99/mo additional. Annual: $35.99/yr, $6/yr additional.
const BASE_FEATURES = [
  "3 capsules included",
  "Write to them over time \u2014 not just once",
  "Add photos, voice, and video",
  "Open it on the day that matters",
  "Capture moments as they happen",
  "Keep it forever",
];

// PRICING: Gift Capsules — $9.99 one-time per capsule.
const GIFT_CAPSULE_FEATURES = [
  "Works for any moment",
  "Invite everyone who loves them",
  "No account needed to contribute",
  "Add messages, photos, and voices",
  "Everything opens together",
  "They keep it forever",
];


const timeCapsulePlan = (
  <Plan
    variant="featured"
    tag="Time Capsules"
    name="Time Capsules"
    price="4.99"
    priceUnit="per month"
    priceNote="Or $35.99/year — save 40%"
    features={BASE_FEATURES}
    cta="Start your first capsule"
    ctaNote="No credit card needed. Cancel anytime."
    overlay={<RisingDotsOverlay />}
    ribbon="Most Popular"
  />
);

const giftCapsulePlan = (
  <Plan
    variant="gift"
    tag="Gift Capsules"
    name="One-time Purchase"
    price="9.99"
    priceUnit="one-time"
    features={GIFT_CAPSULE_FEATURES}
    cta="Create a Gift Capsule"
    ctaHref="/capsules/new"
    overlay={<ConfettiOverlay />}
  />
);

export function Pricing() {
  const [tab, setTab] = useState<"time" | "gift">("time");

  return (
    <section id="pricing" className="bg-cream">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-10 lg:py-24">
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

        {/* Mobile: swipeable cards + toggle */}
        <MobilePricingSwiper tab={tab} setTab={setTab} />

        {/* Desktop: side by side */}
        <div className="hidden md:grid gap-5 md:grid-cols-2 max-w-[760px] mx-auto items-stretch">
          {timeCapsulePlan}
          {giftCapsulePlan}
        </div>
      </div>
    </section>
  );
}

const SWIPE_THRESHOLD = 50;

function MobilePricingSwiper({
  tab,
  setTab,
}: {
  tab: "time" | "gift";
  setTab: (t: "time" | "gift") => void;
}) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [dragX, setDragX] = useState(0);
  const [swiping, setSwiping] = useState(false);

  const handleStart = useCallback((x: number, y: number) => {
    startRef.current = { x, y };
    setDragX(0);
    setSwiping(false);
  }, []);

  const handleMove = useCallback((x: number, y: number) => {
    if (!startRef.current) return;
    const dx = x - startRef.current.x;
    const dy = y - startRef.current.y;
    if (!swiping && Math.abs(dy) > Math.abs(dx)) {
      startRef.current = null;
      return;
    }
    setSwiping(true);
    setDragX(dx);
  }, [swiping]);

  const handleEnd = useCallback(() => {
    if (!startRef.current) { setDragX(0); return; }
    if (dragX < -SWIPE_THRESHOLD && tab === "time") setTab("gift");
    else if (dragX > SWIPE_THRESHOLD && tab === "gift") setTab("time");
    startRef.current = null;
    setDragX(0);
    setSwiping(false);
  }, [dragX, tab, setTab]);

  const offset = tab === "time" ? 0 : -100;
  const dragOffset = swiping ? (dragX / 4) : 0;

  return (
    <div className="md:hidden max-w-[420px] mx-auto">
      {/* Toggle */}
      <div className="flex rounded-2xl bg-white border border-navy/[0.08] p-1.5 mb-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
        <button
          type="button"
          onClick={() => setTab("time")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 transition-all ${
            tab === "time"
              ? "bg-amber/10 text-navy border border-amber/20"
              : "text-ink-mid hover:text-navy border border-transparent"
          }`}
        >
          <Clock size={15} strokeWidth={1.5} className={tab === "time" ? "text-amber" : "text-ink-light"} />
          <div className="text-left">
            <span className="block text-[13px] font-bold leading-tight">Time Capsules</span>
            <span className="block text-[10px] text-ink-light">Write over time</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setTab("gift")}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 transition-all ${
            tab === "gift"
              ? "bg-amber/10 text-navy border border-amber/20"
              : "text-ink-mid hover:text-navy border border-transparent"
          }`}
        >
          <Gift size={15} strokeWidth={1.5} className={tab === "gift" ? "text-amber" : "text-ink-light"} />
          <div className="text-left">
            <span className="block text-[13px] font-bold leading-tight">Gift Capsules</span>
            <span className="block text-[10px] text-ink-light">One moment</span>
          </div>
        </button>
      </div>

      {/* Swipeable cards */}
      <div
        className="overflow-hidden"
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) handleStart(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t) handleMove(t.clientX, t.clientY);
        }}
        onTouchEnd={handleEnd}
        onTouchCancel={handleEnd}
      >
        <div
          className="flex"
          style={{
            transform: `translateX(calc(${offset}% + ${dragOffset}px))`,
            transition: swiping ? "none" : "transform 350ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div className="w-full shrink-0">{timeCapsulePlan}</div>
          <div className="w-full shrink-0">{giftCapsulePlan}</div>
        </div>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-4">
        <button
          type="button"
          onClick={() => setTab("time")}
          aria-label="Time Capsules"
          className={`w-2 h-2 rounded-full transition-colors ${tab === "time" ? "bg-amber" : "bg-navy/15"}`}
        />
        <button
          type="button"
          onClick={() => setTab("gift")}
          aria-label="Gift Capsules"
          className={`w-2 h-2 rounded-full transition-colors ${tab === "gift" ? "bg-amber" : "bg-navy/15"}`}
        />
      </div>
    </div>
  );
}
