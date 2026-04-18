"use client";

import Link from "next/link";
import { useState } from "react";

const COLLAPSED_COUNT = 3;

const GIFT_FEATURES = [
  "Works for any moment",
  "Invite everyone who loves them",
  "No account needed to contribute",
  "Add messages, photos, and voices",
  "Everything opens together",
  "They keep it forever",
];

function ConfettiOverlay() {
  const colors = ["#c9a84c", "#e2c47a", "#c47a3a", "#e09a5a", "#e07a4a"];
  const pieces = Array.from({ length: 18 }).map((_, i) => ({
    left: `${(i * 13 + 5) % 100}%`,
    delay: `${((i * 0.73) % 5).toFixed(2)}s`,
    duration: `${(4 + ((i * 0.5) % 3)).toFixed(2)}s`,
    color: colors[i % colors.length],
    size: 3 + (i % 3),
    shape: i % 2 === 0 ? ("circle" as const) : ("square" as const),
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

export function CapsuleListCollapsible({
  children,
  total,
}: {
  children: React.ReactNode[];
  total: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? children : children.slice(0, COLLAPSED_COUNT);
  const hasMore = total > COLLAPSED_COUNT;

  return (
    <div className="space-y-2">
      {visible}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2.5 rounded-lg border border-amber/30 text-[13px] font-bold text-amber hover:bg-amber-tint transition-colors"
        >
          {expanded ? "Show less" : `Show all (${total})`}
        </button>
      )}
    </div>
  );
}

export function GiftCapsulePricingCard() {
  return (
    <div className="relative mt-6 rounded-2xl border border-gold/25 bg-[#fdf6e8] p-9 shadow-[0_10px_30px_-10px_rgba(201,168,76,0.22)]">
      <ConfettiOverlay />
      <div className="relative z-[1] flex flex-col">
        <span className="block text-[10px] font-bold tracking-[0.14em] uppercase mb-4 text-gold">
          Gift Capsules
        </span>
        <div className="text-xl font-extrabold tracking-[-0.5px] text-navy">
          One-time Purchase
        </div>
        <div className="text-5xl font-extrabold tracking-[-2px] leading-none mt-4 mb-1 text-navy">
          <sub className="text-xl tracking-normal align-baseline">$</sub>
          9.99
        </div>
        <div className="text-xs italic text-ink-mid/90">one-time</div>

        <ul className="flex flex-col gap-2.5 mt-6 mb-7">
          {GIFT_FEATURES.map((f) => (
            <li
              key={f}
              className="text-[13px] leading-[1.4] flex items-start gap-2 text-ink-mid"
            >
              <span
                aria-hidden="true"
                className="text-[9px] mt-[3px] shrink-0 text-gold"
              >
                ✦
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <Link
          href="/capsules/new"
          className="block text-center py-3 px-5 rounded-lg text-[13px] font-bold tracking-[0.01em] transition-all bg-gold text-navy hover:bg-gold-light"
        >
          Create a Gift Capsule
        </Link>
      </div>
    </div>
  );
}
