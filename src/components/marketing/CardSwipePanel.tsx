"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────

export type StackCard = {
  eyebrow: string;
  title: string;
  preview: string;
  badge: string;
  badgeColor: "amber" | "gold";
};

type Props = {
  /** Panel 0 — the default visual (existing card image/content). */
  defaultPanel: React.ReactNode;
  /** The 3 stacked example cards shown on swipe-right (panel 1). */
  cards: StackCard[];
  /** Optional pills shown below the stack (Gift Capsule occasions). */
  pills?: string[];
};

// ── Constants ─────────────────────────────────────────────────

const SWIPE_THRESHOLD = 40;

// ── Component ─────────────────────────────────────────────────

/**
 * Two-panel swipeable area that sits at the top of a Choose Your
 * Vault card. Panel 0 is the existing visual (PNG). Panel 1 is a
 * fanned 3-card stack of example entries.
 *
 * - 2 dot indicators (left = default, right = stack view)
 * - On first scroll-into-view the panel nudges left briefly to
 *   hint that swiping is possible
 * - Captures pointer events so the parent card link doesn't fire
 *   mid-swipe
 */
export function CardSwipePanel({ defaultPanel, cards, pills }: Props) {
  const [panel, setPanel] = useState<0 | 1>(0);
  const [hinted, setHinted] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const dragX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll-triggered hint: nudge left on first intersection.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHinted(true);
          obs.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Swipe handlers.
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    dragX.current = 0;
    setDragging(true);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      dragX.current = e.clientX - startX.current;
    },
    [dragging],
  );

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    const dx = dragX.current;
    if (dx < -SWIPE_THRESHOLD && panel === 0) setPanel(1);
    if (dx > SWIPE_THRESHOLD && panel === 1) setPanel(0);
  }, [dragging, panel]);

  return (
    <div
      ref={containerRef}
      className="mb-5 select-none overflow-hidden"
      style={{ touchAction: "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Sliding track — holds both panels side-by-side. */}
      <div
        className="flex transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${panel === 0 ? "0" : "-100"}%)` }}
      >
        {/* Panel 0 — existing visual. */}
        <div
          className={`w-full shrink-0 ${
            hinted && panel === 0
              ? "animate-[nudgeLeft_0.6s_ease-out_0.3s_1_both]"
              : ""
          }`}
        >
          {defaultPanel}
        </div>

        {/* Panel 1 — fanned 3-card stack + optional pills. */}
        <div className="w-full shrink-0 px-1">
          <FannedStack cards={cards} />
          {pills && pills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {pills.map((p) => (
                <span
                  key={p}
                  className="text-[11px] font-semibold text-navy/70 bg-white border border-navy/10 px-2.5 py-1 rounded-full"
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <span
          className={`w-2 h-2 rounded-full transition-colors ${
            panel === 0 ? "bg-amber" : "bg-navy/15"
          }`}
        />
        <span
          className={`w-2 h-2 rounded-full transition-colors ${
            panel === 1 ? "bg-amber" : "bg-navy/15"
          }`}
        />
      </div>
    </div>
  );
}

// ── Fanned 3-card stack ───────────────────────────────────────

function FannedStack({ cards }: { cards: StackCard[] }) {
  return (
    <div className="relative h-[280px]">
      {cards.map((card, i) => {
        // Fan from top-left → middle → bottom-right, each one
        // offset + rotated so they overlap like a hand of cards.
        const top = i * 60;
        const left = i * 16;
        const rotate = i === 0 ? -1.5 : i === 1 ? 1.2 : -0.8;
        const zIndex = cards.length - i;
        const width = 280 - i * 12;

        return (
          <div
            key={i}
            className="absolute rounded-2xl border border-navy/[0.08] bg-white px-6 py-5"
            style={{
              top,
              left,
              width,
              maxWidth: `calc(100% - ${left}px)`,
              zIndex,
              transform: `rotate(${rotate}deg)`,
              boxShadow:
                "0 4px 24px rgba(15,31,61,0.08), 0 1px 4px rgba(15,31,61,0.04)",
            }}
          >
            <div className="text-[10px] uppercase tracking-[0.1em] text-amber font-bold mb-1.5">
              {card.eyebrow}
            </div>
            <h4 className="text-sm font-bold text-navy leading-[1.3] mb-1.5">
              {card.title}
            </h4>
            <p className="text-xs text-ink-light leading-[1.6]">
              {card.preview}
            </p>
            <div className="mt-3 pt-3 border-t border-navy/[0.08] flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] font-bold text-gold">
              <span
                className={`inline-block w-[5px] h-[5px] rounded-full ${
                  card.badgeColor === "gold" ? "bg-gold" : "bg-amber"
                }`}
              />
              {card.badge}
            </div>
          </div>
        );
      })}
    </div>
  );
}
