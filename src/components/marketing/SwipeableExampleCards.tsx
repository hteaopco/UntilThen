"use client";

import { useCallback, useRef, useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────

export type ExampleCard = {
  /** Small caps eyebrow above the title (e.g. "TO ELLIE, AGE 18"). */
  eyebrow: string;
  /** Main line — title or media label. */
  title: string;
  /** Optional body preview. */
  preview?: string;
  /** Badge at the bottom of the card ("UNLOCKS SEPT 2038", "SEALED"). */
  badge?: string;
  /** Badge colour variant. */
  badgeColor?: "amber" | "gold";
};

type Props = {
  cards: ExampleCard[];
  colorScheme: "amber" | "navy";
};

// ── Constants ─────────────────────────────────────────────────

const SWIPE_THRESHOLD = 50;

// ── Component ─────────────────────────────────────────────────

/**
 * A mini swipeable 3-card stack inside a marketing card. One swipe
 * fans through the stack; the cards loop infinitely. Follows the
 * same pointer-tracking pattern as HeroLetterStack: no animation
 * library, just CSS transitions + pointer events + touchAction
 * "pan-y" so vertical scrolling isn't blocked.
 */
export function SwipeableExampleCards({ cards, colorScheme }: Props) {
  const [topIndex, setTopIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hinted, setHinted] = useState(false);

  // Subtle peek animation on first render to imply swipeability.
  useEffect(() => {
    const t = window.setTimeout(() => setHinted(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  const advance = useCallback(() => {
    setTopIndex((i) => (i + 1) % cards.length);
    setDragX(0);
    setDragging(false);
  }, [cards.length]);

  // Pointer handlers — mirrors HeroLetterStack logic.
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      startX.current = e.clientX;
      setDragging(true);
      setDragX(0);
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setDragX(e.clientX - startX.current);
    },
    [dragging],
  );

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    if (Math.abs(dragX) > SWIPE_THRESHOLD) {
      advance();
    } else {
      setDragX(0);
      setDragging(false);
    }
  }, [dragging, dragX, advance]);

  // Keyboard support.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        advance();
      }
    },
    [advance],
  );

  const accent = colorScheme === "amber" ? "#c47a3a" : "#0f1f3d";
  const badgeAmber = "text-amber bg-amber-tint";
  const badgeGold = "text-gold bg-gold-tint";

  return (
    <div className="mb-5 select-none">
      <div
        ref={containerRef}
        className="relative h-[220px]"
        role="region"
        aria-label="Example capsule entries"
        tabIndex={0}
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        {cards.map((card, i) => {
          const offset = (i - topIndex + cards.length) % cards.length;
          const isTop = offset === 0;
          const scale = 1 - offset * 0.04;
          const yShift = offset * 8;
          const opacity = isTop ? 1 : 1 - offset * 0.2;

          // Peek hint: on mount the top card shifts right slightly
          // then snaps back, suggesting drag interaction.
          const peekX =
            isTop && !hinted && offset === 0 ? 12 : isTop ? dragX : 0;

          return (
            <div
              key={i}
              className="absolute inset-x-0 top-0 rounded-xl border bg-white shadow-sm px-5 py-4"
              style={{
                borderColor: `${accent}20`,
                zIndex: cards.length - offset,
                transform: `translateX(${peekX}px) translateY(${yShift}px) scale(${scale})`,
                opacity,
                transition: dragging && isTop ? "none" : "all 0.35s ease-out",
                pointerEvents: isTop ? "auto" : "none",
              }}
            >
              <p
                className="text-[10px] font-bold tracking-[0.14em] uppercase mb-2"
                style={{ color: accent }}
              >
                {card.eyebrow}
              </p>
              <h4 className="text-[15px] font-bold text-navy tracking-[-0.2px] leading-[1.3] mb-1.5">
                {card.title}
              </h4>
              {card.preview && (
                <p className="text-[13px] text-ink-mid leading-[1.5] line-clamp-2">
                  {card.preview}
                </p>
              )}
              {card.badge && (
                <span
                  className={`inline-block mt-3 text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded ${
                    card.badgeColor === "gold" ? badgeGold : badgeAmber
                  }`}
                >
                  ● {card.badge}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Dot indicators + swipe hint */}
      <div className="flex flex-col items-center gap-1.5 mt-2">
        <div className="flex items-center gap-1.5">
          {cards.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === topIndex % cards.length
                  ? colorScheme === "amber"
                    ? "bg-amber"
                    : "bg-navy"
                  : "bg-navy/15"
              }`}
            />
          ))}
        </div>
        <span className="text-[9px] uppercase tracking-[0.14em] font-bold text-ink-light/60">
          Swipe ↔
        </span>
      </div>
    </div>
  );
}
