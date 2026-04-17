"use client";

import { Lock, PlusCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { NewVaultButton } from "@/components/dashboard/NewVaultButton";

export type TimeCapsuleItem = {
  childId: string;
  firstName: string;
  revealDate: string | null;
  memoriesCount: number;
  vaultId: string;
};

/**
 * State-based carousel with overlap. Center card sits on top
 * (z-10, full size), side cards peek from behind at 0.82 scale
 * with blur + dim. Swipe gestures and click-to-select cycle
 * through the cards. "Add a capsule" card always at the end.
 */
export function TimeCapsuleCarousel({
  items,
}: {
  items: TimeCapsuleItem[];
}) {
  const totalCards = items.length + 1; // +1 for "add" card
  const middleIndex = Math.floor(items.length / 2);
  const [activeIndex, setActiveIndex] = useState(middleIndex);
  const touchStartX = useRef(0);

  const goTo = useCallback(
    (idx: number) => {
      if (idx < 0) idx = 0;
      if (idx >= totalCards) idx = totalCards - 1;
      setActiveIndex(idx);
    },
    [totalCards],
  );

  // Swipe detection.
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? 0;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) > 50) {
      goTo(dx < 0 ? activeIndex + 1 : activeIndex - 1);
    }
  }

  return (
    <div
      className="relative overflow-hidden"
      style={{ touchAction: "pan-y" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Cards container — stacked, overflow hidden so side cards don't widen the page. */}
      <div className="relative flex items-center justify-center" style={{ minHeight: 460 }}>
        {items.map((item, i) => {
          const offset = i - activeIndex;
          return (
            <CarouselSlot key={item.childId} offset={offset} onClick={() => goTo(i)}>
              <CapsuleCard item={item} active={offset === 0} />
            </CarouselSlot>
          );
        })}
        {/* "Add a capsule" card */}
        <CarouselSlot offset={items.length - activeIndex} onClick={() => goTo(items.length)}>
          <AddCapsuleCard active={items.length === activeIndex} capsuleCount={items.length} />
        </CarouselSlot>
      </div>

      {/* Dots */}
      {totalCards > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 mb-6">
          {Array.from({ length: totalCards }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
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

/**
 * Positions a card in the carousel based on its offset from center.
 * offset=0 → center (z-10, scale 1, full opacity)
 * offset=±1 → peeking from side (z-5, scale 0.82, blurred, dimmed)
 * offset=±2+ → hidden
 */
function CarouselSlot({
  offset,
  onClick,
  children,
}: {
  offset: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const isCenter = offset === 0;
  const isAdjacent = Math.abs(offset) === 1;
  const isVisible = Math.abs(offset) <= 1;

  if (!isVisible) return null;

  // Side cards: shift 65% of card width + overlap behind center.
  const translateX = isCenter ? 0 : offset * 68;
  const scale = isCenter ? 1 : 0.82;
  const zIndex = isCenter ? 10 : 5;

  return (
    <div
      role={isCenter ? undefined : "button"}
      onClick={isCenter ? undefined : onClick}
      className="absolute transition-all duration-300 ease-out"
      style={{
        width: "min(360px, 85vw)",
        transform: `translateX(${translateX}%) scale(${scale})`,
        zIndex,
        opacity: isCenter ? 1 : 0.45,
        filter: isCenter ? "none" : "blur(2px)",
        cursor: isCenter ? "default" : "pointer",
        pointerEvents: isCenter ? "auto" : "auto",
      }}
    >
      {children}
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

  const inner = (
    <>
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gold-tint flex items-center justify-center">
            <Lock size={16} strokeWidth={1.5} className="text-gold" />
          </div>
          <h3 className="text-[18px] font-extrabold text-navy tracking-[-0.3px]">
            {item.firstName}&rsquo;s Time Capsule
          </h3>
        </div>

        <p className="text-[14px] text-ink-mid leading-[1.5]">
          They&rsquo;ll read this when it matters most.
        </p>
        <p className="text-[13px] text-ink-light mt-0.5">
          {item.memoriesCount.toLocaleString()}{" "}
          {item.memoriesCount === 1 ? "memory" : "memories"} waiting
        </p>
      </div>

      <div className="relative h-[200px] overflow-hidden">
        <div
          className="absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(180deg, #fef6ec 0%, transparent 40%)",
          }}
        />
        <Image
          src="/smallchild1.png"
          alt=""
          width={1672}
          height={941}
          className="w-full h-full object-cover object-center"
          priority={false}
        />
      </div>

      <div className="px-5 pb-5 pt-3">
        <span className="block w-full text-center bg-amber text-white font-bold text-[15px] py-3 rounded-lg transition-colors hover:bg-amber-dark">
          Open {item.firstName}&rsquo;s capsule
        </span>
      </div>
    </>
  );

  if (active) {
    return (
      <Link
        href={`/dashboard?vault=${item.childId}`}
        className="block rounded-[20px] overflow-hidden"
        style={{
          background: "#fef6ec",
          border: "2px solid rgba(196,122,58,0.35)",
          boxShadow:
            "0 16px 48px -12px rgba(196,122,58,0.25), 0 0 0 1px rgba(196,122,58,0.08)",
        }}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div
      className="rounded-[20px] overflow-hidden"
      style={{
        background: "#fef6ec",
        border: "1.5px solid rgba(196,122,58,0.15)",
        boxShadow: "0 4px 16px -4px rgba(196,122,58,0.08)",
      }}
    >
      {inner}
    </div>
  );
}

function AddCapsuleCard({ active, capsuleCount }: { active: boolean; capsuleCount: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-[20px] border-2 border-dashed"
      style={{
        minHeight: "420px",
        borderColor: active
          ? "rgba(196,122,58,0.4)"
          : "rgba(196,122,58,0.2)",
        background: active ? "#fef6ec" : "#fdf8f2",
        boxShadow: active
          ? "0 16px 48px -12px rgba(196,122,58,0.15)"
          : "none",
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
        <NewVaultButton variant="primary" label="New Time Capsule" capsuleCount={capsuleCount} />
      </div>
    </div>
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
