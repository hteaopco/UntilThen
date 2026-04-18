"use client";

import Link from "next/link";
import { useState } from "react";

import { PlusCircle, Sparkles } from "lucide-react";

const COLLAPSED_COUNT = 3;

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
          className="w-full text-center py-2 text-[12px] font-semibold text-amber/70 hover:text-amber transition-colors"
        >
          {expanded ? "Show less" : `Show all (${total})`}
        </button>
      )}
      <div className="mt-2">
        <Link
          href="/capsules/new"
          className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg border border-amber/30 text-amber text-[13px] font-bold hover:bg-amber-tint transition-colors"
        >
          <PlusCircle size={14} strokeWidth={1.75} aria-hidden="true" />
          New Gift Capsule
        </Link>
      </div>
    </div>
  );
}

export function GiftCapsulePricingCard() {
  return (
    <div className="mt-6 rounded-2xl border border-gold/30 bg-[#fdfaf3] px-6 py-6 relative overflow-hidden">
      {/* Decorative dots */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-3 right-16 w-2 h-2 rounded-full bg-gold/30" />
        <div className="absolute top-10 right-8 w-1.5 h-1.5 rounded-full bg-amber/20" />
        <div className="absolute bottom-12 left-10 w-1.5 h-1.5 rounded-full bg-gold/25" />
        <div className="absolute bottom-6 right-20 w-2 h-2 rounded-full bg-amber/15" />
        <div className="absolute top-20 left-6 w-1 h-1 rounded-full bg-gold/35" />
      </div>

      <div className="relative">
        <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber">
          Gift Capsules
        </span>
        <h3 className="mt-1 text-[20px] font-extrabold text-navy tracking-[-0.3px]">
          One-time Purchase
        </h3>
        <div className="mt-2 flex items-baseline gap-0.5">
          <span className="text-[14px] font-bold text-navy">$</span>
          <span className="text-[48px] font-extrabold text-navy tracking-[-2px] leading-none">
            9.99
          </span>
        </div>
        <p className="text-[13px] italic text-ink-light">one-time</p>

        <ul className="mt-5 space-y-2.5">
          {[
            "Any occasion",
            "Unlimited contributors",
            "Text, photos, voice & video",
            "Reveal within 60 days",
            "No account needed to open or contribute",
            "Save forever with a free account",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-[14px] text-navy leading-[1.4]">
              <Sparkles size={10} strokeWidth={2} className="text-gold mt-1 shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <Link
          href="/capsules/new"
          className="mt-6 block w-full text-center bg-gold text-navy py-3 rounded-xl text-[15px] font-bold hover:bg-gold-light transition-colors"
        >
          Create a Gift Capsule
        </Link>
      </div>
    </div>
  );
}
