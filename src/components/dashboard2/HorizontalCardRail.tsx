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
        // snap-center means each card snaps to the rail's center,
        // so the user always sees one focused card + peeks of the
        // neighbours on either side. -ml-2 on every slot after the
        // first creates the overlap effect.
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-6 px-6 scroll-pl-6 scroll-pr-6 lg:mx-0 lg:px-0 lg:scroll-pl-0 lg:scroll-pr-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {childArray.map((child, i) => {
          const isActive = i === activeIdx;
          return (
            <div
              key={i}
              data-rail-slot
              className={`snap-center shrink-0 transition-[transform,filter,opacity] duration-300 ease-out -ml-[100px] first:ml-0 ${
                isActive
                  ? "scale-100 opacity-100 z-10"
                  : "scale-[0.92] opacity-75 z-0"
              }`}
              // Inline filter so the blur transitions cleanly from
              // 0 → 1.5px (Tailwind's blur-0/blur-sm jump). Keep it
              // subtle: heavier blur fights the focus animation.
              style={{ filter: isActive ? "blur(0px)" : "blur(1.5px)" }}
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
