"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Horizontal snap-scroll rail with peek-card behavior. Designed for the
 * dashboard2 vault carousel — each child is a fixed-width card that
 * snaps into place. Chevron buttons appear on desktop for click
 * advancement (dimmed when you can't scroll further that direction);
 * mobile users swipe natively.
 *
 * Assumes each child has its own width class. We size nothing here so
 * the cards stay responsible for their own aspect.
 */
export function HorizontalCardRail({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const [activePage, setActivePage] = useState(0);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const viewportWidth = el.clientWidth;
    const scrollWidth = el.scrollWidth;
    const scrollLeft = el.scrollLeft;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + viewportWidth < scrollWidth - 4);
    const pages = Math.max(1, Math.ceil(scrollWidth / viewportWidth));
    setPageCount(pages);
    setActivePage(Math.round(scrollLeft / viewportWidth));
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
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const showArrows = pageCount > 1;

  return (
    <div className="relative" aria-label={ariaLabel}>
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-6 px-6 scroll-pl-6 scroll-pr-6 lg:mx-0 lg:px-0 lg:scroll-pl-0 lg:scroll-pr-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
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

      {pageCount > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {Array.from({ length: pageCount }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === activePage ? "w-4 bg-amber" : "w-1.5 bg-navy/15"
              }`}
            />
          ))}
        </div>
      )}
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
