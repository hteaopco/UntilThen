"use client";

import { Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type TimeCapsuleItem = {
  childId: string;
  firstName: string;
  revealDate: string | null;
  memoriesCount: number;
  vaultId: string;
};

/**
 * Horizontal snap-scroll carousel of Time Capsule cards. Center
 * card is active (scale 1.0); side cards peek at ~0.92 scale.
 * Tapping a card navigates to the capsule view.
 */
export function TimeCapsuleCarousel({
  items,
}: {
  items: TimeCapsuleItem[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Track which card is closest to center on scroll.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      const center = el.scrollLeft + el.clientWidth / 2;
      let closest = 0;
      let minDist = Infinity;
      for (let i = 0; i < el.children.length; i++) {
        const child = el.children[i] as HTMLElement;
        const childCenter = child.offsetLeft + child.offsetWidth / 2;
        const dist = Math.abs(center - childCenter);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      setActiveIndex(closest);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div className="relative -mx-6 lg:-mx-10">
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth px-6 lg:px-10 pb-4"
        style={{
          scrollSnapType: "x mandatory",
          scrollPaddingInline: "24px",
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        {items.map((item, i) => (
          <CapsuleCard
            key={item.childId}
            item={item}
            active={i === activeIndex}
          />
        ))}
      </div>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-2">
          {items.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === activeIndex ? "bg-amber" : "bg-navy/15"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CapsuleCard({
  item,
  active,
}: {
  item: TimeCapsuleItem;
  active: boolean;
}) {
  const revealLabel = item.revealDate
    ? formatRevealDate(item.revealDate)
    : null;

  return (
    <Link
      href={`/dashboard?vault=${item.childId}`}
      className="shrink-0 block rounded-2xl border-[1.5px] overflow-hidden transition-transform duration-200"
      style={{
        width: "min(320px, 80vw)",
        scrollSnapAlign: "center",
        background: "#fef6ec",
        borderColor: active
          ? "rgba(196,122,58,0.4)"
          : "rgba(196,122,58,0.15)",
        boxShadow: active
          ? "0 12px 32px -8px rgba(196,122,58,0.2)"
          : "0 4px 16px -4px rgba(196,122,58,0.08)",
        transform: active ? "scale(1)" : "scale(0.92)",
      }}
    >
      {/* Card content */}
      <div className="p-5">
        {/* Top: lock + name */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gold-tint flex items-center justify-center">
            <Lock size={16} strokeWidth={1.5} className="text-gold" />
          </div>
          <h3 className="text-[20px] font-extrabold text-navy tracking-[-0.3px]">
            {item.firstName}
          </h3>
        </div>

        {/* Meta */}
        {revealLabel && (
          <p className="text-[14px] text-ink-mid leading-[1.5]">
            They&rsquo;ll open this on{" "}
            <span className="font-semibold text-navy">{revealLabel}</span>
          </p>
        )}
        <p className="text-[13px] text-ink-light mt-0.5">
          {item.memoriesCount.toLocaleString()}{" "}
          {item.memoriesCount === 1 ? "memory" : "memories"} waiting
        </p>
      </div>

      {/* Embedded visual — write now.png with soft fade */}
      <div className="relative h-[180px] overflow-hidden">
        <div
          className="absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(180deg, #fef6ec 0%, transparent 30%)",
          }}
        />
        <Image
          src="/write%20now.png"
          alt=""
          width={493}
          height={343}
          className="w-full h-full object-cover object-top"
          priority={false}
        />
      </div>

      {/* CTA */}
      <div className="px-5 pb-5 pt-3">
        <span className="block w-full text-center bg-amber text-white font-bold text-[15px] py-3 rounded-lg transition-colors hover:bg-amber-dark">
          Write to {item.firstName} →
        </span>
      </div>
    </Link>
  );
}

function formatRevealDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
