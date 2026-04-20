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
  /** Panel 0 — the full original card content (image + copy + CTA). */
  defaultPanel: React.ReactNode;
  /** Panel 1 — the stacked example cards shown on swipe. */
  cards: StackCard[];
  /** Optional pills shown below the stack (Gift Capsule occasions). */
  pills?: string[];
};

const SWIPE_THRESHOLD = 40;

/**
 * Full-card two-panel swipe. The ENTIRE card content flips between
 * panel 0 (original) and panel 1 (fanned stack). Dots sit at the
 * very bottom of the card. On first scroll-into-view the whole
 * panel nudges left briefly to hint at swipeability.
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
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
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
      className="select-none overflow-hidden flex flex-col"
      style={{ touchAction: "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Dot indicators — sit at the top of the card. */}
      <div className="flex items-center justify-center gap-2 pt-1 pb-4">
        <span
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            panel === 0 ? "bg-amber" : "bg-navy/15"
          }`}
        />
        <span
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            panel === 1 ? "bg-amber" : "bg-navy/15"
          }`}
        />
      </div>

      {/* Sliding track — both panels side-by-side. */}
      <div
        className="flex flex-1 transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${panel === 0 ? "0" : "-100"}%)` }}
      >
        {/* Panel 0 — full original card content. */}
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
        <div className="w-full shrink-0 flex flex-col items-center justify-center px-2 py-4">
          <FannedStack cards={cards} />
          {pills && pills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8 justify-center">
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
    </div>
  );
}

// ── Fanned 3-card stack ───────────────────────────────────────
// Full-height layout so the cards feel as big as they did in the
// hero. Each card is ~300px wide and the stack is ~440px tall.

function FannedStack({ cards }: { cards: StackCard[] }) {
  // Layout matches the original HeroLetterStack — cards are
  // "tossed on a table" with different rotations and offsets,
  // overlapping organically. Front card (index 0) has the highest
  // z-index and covers the others.
  const positions = [
    { top: 0, left: 20, width: 300, rotate: -1.5 },
    { top: 140, left: 0, width: 280, rotate: 1.2 },
    { top: 260, left: 50, width: 260, rotate: -0.8 },
  ];

  return (
    <div className="relative w-full h-[480px]">
      {cards.map((card, i) => {
        const pos = positions[i] ?? positions[0]!;
        const zIndex = cards.length - i;

        return (
          <div
            key={i}
            className="absolute rounded-2xl border border-navy/[0.08] bg-white px-7 py-6"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxWidth: `calc(100% - ${pos.left + 8}px)`,
              zIndex,
              transform: `rotate(${pos.rotate}deg)`,
              boxShadow:
                "0 4px 24px rgba(15,31,61,0.08), 0 1px 4px rgba(15,31,61,0.04)",
            }}
          >
            <div className="text-[11px] uppercase tracking-[0.12em] text-amber font-bold mb-2">
              {card.eyebrow}
            </div>
            <h4 className="text-[16px] font-bold text-navy leading-[1.3] mb-2">
              {card.title}
            </h4>
            <p className="text-[14px] text-ink-light leading-[1.6]">
              {card.preview}
            </p>
            <div className="mt-4 pt-3 border-t border-navy/[0.08] flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em] font-bold text-gold">
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
