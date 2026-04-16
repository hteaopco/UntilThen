"use client";

import { Lock, PlusCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { NewVaultButton } from "@/components/dashboard/NewVaultButton";

export type TimeCapsuleItem = {
  childId: string;
  firstName: string;
  revealDate: string | null;
  memoriesCount: number;
  vaultId: string;
};

export function TimeCapsuleCarousel({
  items,
}: {
  items: TimeCapsuleItem[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      if (!el) return;
      const center = el.scrollLeft + el.clientWidth / 2;
      let closest = 0;
      let minDist = Infinity;
      const children = el.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        if (!child.offsetWidth) continue;
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

  // Scroll a card into center view by index.
  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const child = el.children[index] as HTMLElement | undefined;
    if (!child) return;
    const childCenter = child.offsetLeft + child.offsetWidth / 2;
    const scrollTarget = childCenter - el.clientWidth / 2;
    el.scrollTo({ left: scrollTarget, behavior: "smooth" });
  }, []);

  const totalCards = items.length + 1;

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
            onActivate={() => scrollToIndex(i)}
          />
        ))}
        {/* "Add a capsule" card */}
        <div
          onClick={() => scrollToIndex(items.length)}
          className="shrink-0 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer"
          style={{
            width: "min(320px, 80vw)",
            scrollSnapAlign: "center",
            minHeight: "380px",
            borderColor:
              activeIndex === items.length
                ? "rgba(196,122,58,0.4)"
                : "rgba(196,122,58,0.2)",
            background:
              activeIndex === items.length ? "#fef6ec" : "#fdf8f2",
            transform:
              activeIndex === items.length ? "scale(1)" : "scale(0.88)",
            opacity: activeIndex === items.length ? 1 : 0.5,
            filter:
              activeIndex === items.length ? "none" : "blur(1px)",
          }}
        >
          <div className="text-center px-6">
            <div className="w-12 h-12 rounded-full bg-amber-tint text-amber flex items-center justify-center mx-auto mb-4">
              <PlusCircle size={24} strokeWidth={1.5} />
            </div>
            <p className="text-[17px] font-bold text-navy mb-1">
              Add a capsule
            </p>
            <p className="text-[13px] text-ink-light mb-5">
              Start writing to someone new.
            </p>
            <NewVaultButton variant="primary" label="New Time Capsule →" />
          </div>
        </div>
      </div>

      {totalCards > 1 && (
        <div className="flex items-center justify-center gap-2 mt-2">
          {Array.from({ length: totalCards }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === activeIndex ? "bg-amber" : "bg-navy/15"
              }`}
              aria-label={`Go to card ${i + 1}`}
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
  onActivate,
}: {
  item: TimeCapsuleItem;
  active: boolean;
  onActivate: () => void;
}) {
  const revealLabel = item.revealDate
    ? formatRevealDate(item.revealDate)
    : null;

  // Side cards: click scrolls them to center. Active card: navigates.
  function handleClick(e: React.MouseEvent) {
    if (!active) {
      e.preventDefault();
      onActivate();
    }
  }

  return (
    <Link
      href={`/dashboard?vault=${item.childId}`}
      onClick={handleClick}
      className="shrink-0 block rounded-2xl border-[1.5px] overflow-hidden transition-all duration-200"
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
        transform: active ? "scale(1)" : "scale(0.88)",
        opacity: active ? 1 : 0.5,
        filter: active ? "none" : "blur(1px)",
      }}
    >
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gold-tint flex items-center justify-center">
            <Lock size={16} strokeWidth={1.5} className="text-gold" />
          </div>
          <h3 className="text-[20px] font-extrabold text-navy tracking-[-0.3px]">
            {item.firstName}
          </h3>
        </div>

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

      <div className="px-5 pb-5 pt-3">
        <span className="block w-full text-center bg-amber text-white font-bold text-[15px] py-3 rounded-lg transition-colors hover:bg-amber-dark">
          Write to {item.firstName} →
        </span>
      </div>
    </Link>
  );
}

function formatRevealDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
