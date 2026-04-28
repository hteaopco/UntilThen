"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Horizontal carousel rail with overlap + focus blur. Each child is
 * a fixed-width card; whichever one is nearest the rail's horizontal
 * center is the "active" card and renders sharp at full scale. The
 * others scale down a touch and pick up a soft blur so the active
 * card pops out of the row.
 *
 * Cards stay responsible for their own width — we don't size them
 * here. That keeps the API the same as the previous rail (still
 * accepts plain children, no extra props).
 */
export function HorizontalCardRail({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [slotCount, setSlotCount] = useState(0);

  const childArray = Children.toArray(children);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const viewportWidth = el.clientWidth;
    const scrollWidth = el.scrollWidth;
    const scrollLeft = el.scrollLeft;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + viewportWidth < scrollWidth - 4);

    // Find the slot whose center is closest to the scroller's
    // horizontal center — that becomes the focused card.
    const slots = el.querySelectorAll<HTMLElement>("[data-rail-slot]");
    setSlotCount(slots.length);
    const center = scrollLeft + viewportWidth / 2;
    let bestIdx = 0;
    let bestDist = Infinity;
    slots.forEach((slot, i) => {
      const slotCenter = slot.offsetLeft + slot.offsetWidth / 2;
      const dist = Math.abs(center - slotCenter);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });
    setActiveIdx(bestIdx);
  }, []);

  useEffect(() => {
    measure();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  // Default to centring the SECOND card on first paint when there
  // are at least two slots, so the user lands inside the carousel
  // rather than against its left edge. Runs once after layout.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const slots = el.querySelectorAll<HTMLElement>("[data-rail-slot]");
    if (slots.length < 2) return;
    const target = slots[1];
    const targetCenter = target.offsetLeft + target.offsetWidth / 2;
    // scrollTo with 'instant' so the user doesn't see the rail
    // animate from 0 → centred on every fresh page load.
    el.scrollTo({
      left: Math.max(0, targetCenter - el.clientWidth / 2),
      behavior: "instant",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: "smooth" });
  };

  const showArrows = slotCount > 1;

  return (
    <div className="relative" aria-label={ariaLabel}>
      <div
        ref={scrollerRef}
        // Real padding (not scroll-padding) on each side so the
        // first/last card can scroll to the rail's horizontal
        // centre. (50% - card half-width) where 50% is half the
        // rail's parent (= the rail's own width); 91px is half
        // of the 182px max card width. Using % instead of vw is
        // critical on desktop — the dashboard sits inside a
        // narrower max-width container, so 50vw would overshoot
        // and push every card off the right edge of the rail.
        //
        // Desktop (lg+) flips to a flat row: padding drops to a
        // small constant + gap-3 between cards so the cards sit
        // side-by-side without overlap. The blur / scale-down /
        // negative-margin focus treatment stays mobile-only.
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 pl-[calc(50%-91px)] pr-[calc(50%-91px)] lg:pl-2 lg:pr-2 lg:gap-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {childArray.map((child, i) => {
          const isActive = i === activeIdx;
          // Distance-from-active z-index: the active card is on top;
          // cards stack down from there so a card adjacent to the
          // active one always renders above a card further away.
          // Without this, the rightmost (Add) card was rendering on
          // top of its left neighbour because of DOM order.
          // On desktop every card is "active" (flat row), so z-index
          // doesn't matter — leaving the math intact for parity with
          // mobile.
          const z = Math.max(0, 10 - Math.abs(i - activeIdx));
          return (
            <div
              key={i}
              data-rail-slot
              className={`snap-center shrink-0 transition-[transform,filter] duration-300 ease-out -ml-[100px] first:ml-0 lg:ml-0 ${
                isActive ? "scale-100" : "scale-[0.92] lg:scale-100"
              } ${isActive ? "" : "blur-[1.5px] lg:blur-0"}`}
              style={{ zIndex: z }}
            >
              {child}
            </div>
          );
        })}
      </div>

      {showArrows && (
        <>
          <ArrowButton
            direction="left"
            active={canScrollLeft}
            onClick={() => scrollByPage(-1)}
          />
          <ArrowButton
            direction="right"
            active={canScrollRight}
            onClick={() => scrollByPage(1)}
          />
        </>
      )}

      {slotCount > 1 ? (
        <div className="mt-3 flex justify-center gap-1.5">
          {Array.from({ length: slotCount }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIdx ? "w-4 bg-amber" : "w-1.5 bg-navy/15"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ArrowButton({
  direction,
  active,
  onClick,
}: {
  direction: "left" | "right";
  active: boolean;
  onClick: () => void;
}) {
  const base =
    "hidden md:flex absolute top-[40%] -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-[0_4px_16px_-4px_rgba(15,31,61,0.2)] items-center justify-center transition-all";
  const position =
    direction === "left" ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2";
  const activeStyle = active
    ? "text-amber hover:scale-105 cursor-pointer"
    : "text-ink-light/40 cursor-default";
  return (
    <button
      type="button"
      onClick={active ? onClick : undefined}
      disabled={!active}
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      className={`${base} ${position} ${activeStyle}`}
    >
      {direction === "left" ? (
        <ChevronLeft size={20} strokeWidth={2} />
      ) : (
        <ChevronRight size={20} strokeWidth={2} />
      )}
    </button>
  );
}
