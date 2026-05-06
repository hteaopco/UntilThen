"use client";

import { ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useMemo, useState } from "react";

import { useRevealAnalytics } from "./analytics";
import type { RevealContribution } from "./RevealClient";

const FONT_SIZES = [15, 17, 20] as const;
type FontSize = (typeof FONT_SIZES)[number];

/**
 * Story Card B — Letter.
 *
 * Two states sharing one component:
 *
 *   preview  → cream backdrop, "Dear {name}," in Playfair italic,
 *              ~4 lines visible with a fade-out gradient at the
 *              bottom, "Tap to read more" CTA, brush-script
 *              signature.
 *   expanded → slides up to a full-screen reading view with
 *              ✕ (collapses back to preview, does NOT exit the
 *              reveal) and Aa (cycles font size 15→17→20→15).
 *              Body becomes scrollable.
 *
 * The expanded ✕ collapses the letter rather than closing the
 * reveal, so the recipient stays in the same story slot.
 */
export function LetterCard({
  contribution,
  onAdvance,
  onBack,
  canBack = false,
}: {
  contribution: RevealContribution;
  /** Optional story navigation. When provided, ExpandedLetter
   *  renders mid-screen chevron buttons so the reader can move
   *  to the next/previous slide without collapsing the letter
   *  first. Falls back to the X-only header when omitted. */
  onAdvance?: () => void;
  onBack?: () => void;
  canBack?: boolean;
}) {
  const { capture } = useRevealAnalytics();
  const [expanded, setExpanded] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>(17);

  const recipientGreeting = useMemo(() => {
    // Reuse a "Dear {someone}," prefix if the body already opens
    // with one (Tiptap commonly carries it through), otherwise
    // fall back to the contribution title or just leave blank.
    const text = (contribution.body ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const dearMatch = /^Dear\s+([^,]+),/.exec(text);
    if (dearMatch) return `Dear ${dearMatch[1]},`;
    return contribution.title?.trim() ? contribution.title.trim() : "";
  }, [contribution.body, contribution.title]);

  const bodyHtml = useMemo(
    () => stripLeadingGreeting(contribution.body ?? ""),
    [contribution.body],
  );

  if (expanded) {
    return (
      <ExpandedLetter
        greeting={recipientGreeting}
        bodyHtml={bodyHtml}
        authorName={contribution.authorName}
        fontSize={fontSize}
        onCycleFont={() =>
          setFontSize((current) => {
            const idx = FONT_SIZES.indexOf(current);
            return FONT_SIZES[(idx + 1) % FONT_SIZES.length];
          })
        }
        onCollapse={() => setExpanded(false)}
        // When a parent slide navigator is around, advancing or
        // going back also collapses the letter so the next slide
        // mounts fresh in its preview state.
        onAdvance={
          onAdvance
            ? () => {
                setExpanded(false);
                onAdvance();
              }
            : undefined
        }
        onBack={
          onBack && canBack
            ? () => {
                setExpanded(false);
                onBack();
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-cream">
      <div className="absolute inset-0 px-8 pt-24 pb-32 flex flex-col">
        {recipientGreeting && (
          <h2
            className="font-serif italic text-navy text-[26px] leading-[1.25] mb-5"
            style={{ fontStyle: "italic" }}
          >
            {recipientGreeting}
          </h2>
        )}

        <div className="relative flex-1 min-h-0">
          <div
            className="font-serif text-navy text-[16px] leading-[1.65] line-clamp-[5] overflow-hidden"
            dangerouslySetInnerHTML={{ __html: bodyHtml || "" }}
          />
          {/* Bottom fade so the truncated text doesn't end on a
              hard edge. */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-16"
            style={{
              background:
                "linear-gradient(to top, rgba(253,248,242,1) 0%, transparent 100%)",
            }}
          />
        </div>

        <div className="mt-6 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => {
              capture("reveal_letter_expanded", {
                contributionId: contribution.id,
                authorName: contribution.authorName,
              });
              setExpanded(true);
            }}
            className="relative z-20 inline-flex items-center gap-1.5 text-amber font-semibold text-[14px] hover:text-amber-dark transition-colors"
          >
            <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
            Tap to read more
          </button>
        </div>
      </div>

      <p
        className="absolute right-7 z-10 font-brush text-amber text-[34px] leading-none"
        style={{ bottom: "max(env(safe-area-inset-bottom), 92px)" }}
      >
        &mdash; {contribution.authorName}
      </p>
    </div>
  );
}

function ExpandedLetter({
  greeting,
  bodyHtml,
  authorName,
  fontSize,
  onCycleFont,
  onCollapse,
  onAdvance,
  onBack,
}: {
  greeting: string;
  bodyHtml: string;
  authorName: string;
  fontSize: FontSize;
  onCycleFont: () => void;
  onCollapse: () => void;
  onAdvance?: () => void;
  onBack?: () => void;
}) {
  return (
    <div
      // z must sit above the preview top bar (z-[250]) so the ✕
      // close button isn't hidden when we're running inside the
      // organiser / vault preview surfaces.
      className="fixed inset-0 z-[260] bg-cream flex flex-col"
      role="dialog"
      aria-modal="true"
      style={{
        animation: "letterRise 350ms cubic-bezier(0.2, 0.7, 0.2, 1) both",
      }}
    >
      <header
        className="flex items-center justify-between px-4 py-3 border-b border-navy/[0.06]"
        style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}
      >
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse letter"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-mid hover:text-navy hover:bg-amber-tint/40 transition-colors"
        >
          <X size={18} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={onCycleFont}
          aria-label="Change font size"
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-mid hover:text-navy hover:bg-amber-tint/40 transition-colors"
        >
          <span className="text-[15px] font-semibold tracking-tight">Aa</span>
        </button>
      </header>

      {/* Mid-screen story-nav chevrons — let the reader move to
          the next/previous slide without collapsing the letter
          first. Only render when StoryCards has handed us
          handlers; in standalone uses (e.g. opened from the
          gallery) the X is the only exit. */}
      {onBack && (
        <button
          type="button"
          aria-label="Previous card"
          onClick={onBack}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 backdrop-blur text-navy shadow-[0_2px_8px_rgba(15,31,61,0.12)] hover:bg-white transition-colors"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
      )}
      {onAdvance && (
        <button
          type="button"
          aria-label="Next card"
          onClick={onAdvance}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 backdrop-blur text-navy shadow-[0_2px_8px_rgba(15,31,61,0.12)] hover:bg-white transition-colors"
        >
          <ChevronRight size={20} strokeWidth={2} />
        </button>
      )}

      <div
        className="flex-1 overflow-y-auto px-7 pt-7 pb-24 sm:max-w-[720px] sm:mx-auto sm:w-full"
        style={{
          WebkitOverflowScrolling: "touch",
          paddingBottom: "max(env(safe-area-inset-bottom), 96px)",
        }}
      >
        {greeting && (
          <h2 className="font-serif italic text-navy text-[26px] leading-[1.25] mb-5">
            {greeting}
          </h2>
        )}
        <div
          className="font-serif text-navy"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
        <p className="mt-10 font-brush text-amber text-[40px] leading-none">
          &mdash; {authorName}
        </p>
      </div>

      {/* Local keyframes — kept inline so we don't grow the global
          stylesheet for one animation. */}
      <style jsx global>{`
        @keyframes letterRise {
          from {
            transform: translateY(28px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function stripLeadingGreeting(html: string): string {
  // Drop a leading "<p>Dear X,</p>" so the preview header doesn't
  // double-print the salutation. Conservative — only strips when
  // the very first paragraph is a greeting.
  return html.replace(/^\s*<p[^>]*>\s*Dear\s+[^,<]+,\s*<\/p>\s*/i, "");
}
