"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { CreationPicker } from "@/components/dashboard/CreationPicker";

/**
 * Top-of-dashboard creation spark. Not a live editor — a warm,
 * one-click-away invitation to write. The actual composition
 * happens in /dashboard/new; this card's job is to make that
 * feel like the default action the moment the page loads.
 *
 * If `draft` is set (most recent in-progress letter), the card
 * swaps to a "Keep writing {child}'s story" state with a primary
 * "Continue writing" link and a secondary "Start something new"
 * picker.
 */
export function MemoryStarter({
  childFirstName,
  vaultId,
  vaultRevealDate,
  childDateOfBirth,
  draft,
}: {
  childFirstName: string;
  vaultId: string;
  vaultRevealDate: string | null;
  childDateOfBirth: string | null;
  draft: {
    id: string;
    title: string | null;
    updatedAt: string;
  } | null;
}) {
  const primaryRef = useRef<HTMLAnchorElement>(null);

  // Pull keyboard focus to the primary action on mount so the
  // dashboard opens "pointed at" writing — pressing Enter jumps
  // straight into the editor. Guarded with a mount check so this
  // only fires on first paint, not on React refreshes after
  // mutations (which would steal focus mid-interaction).
  useEffect(() => {
    primaryRef.current?.focus({ preventScroll: true });
  }, []);

  const resumeHref = draft ? `/dashboard/entry/${draft.id}/edit` : null;
  const eyebrow = draft
    ? `Keep writing ${childFirstName}\u2019s story`
    : "Write while it\u2019s fresh";
  const resumeHint = draft ? formatResumeHint(draft) : null;

  return (
    <section
      aria-label="Write a new memory"
      className="rounded-3xl border border-amber/25 bg-white px-6 py-8 lg:px-10 lg:py-10 shadow-[0_4px_28px_-6px_rgba(201,168,76,0.18)] ring-1 ring-amber/10 focus-within:border-amber/50 focus-within:shadow-[0_8px_36px_-6px_rgba(201,168,76,0.3)] focus-within:ring-amber/25 transition-[box-shadow,border-color] duration-300"
    >
      <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
        {eyebrow}
      </p>

      {/* Warm starting state — tapping anywhere on the prompt opens
          the editor already pointing at the right vault (or the
          in-progress draft). */}
      {draft && resumeHref ? (
        <Link
          ref={primaryRef}
          href={resumeHref}
          prefetch={false}
          className="block text-[26px] lg:text-[32px] font-extrabold text-navy leading-[1.2] tracking-[-0.5px] hover:text-amber focus:outline-none focus-visible:text-amber transition-colors"
        >
          <span className="block">
            {draft.title || `Dear ${childFirstName},`}
          </span>
          <span className="block mt-1 text-[15px] lg:text-[17px] font-medium text-ink-light/80 italic leading-[1.5]">
            {resumeHint}
          </span>
        </Link>
      ) : (
        <Link
          ref={primaryRef}
          href={`/dashboard/new?vault=${vaultId}`}
          prefetch={false}
          className="block text-[26px] lg:text-[32px] font-extrabold text-navy leading-[1.2] tracking-[-0.5px] hover:text-amber focus:outline-none focus-visible:text-amber transition-colors"
        >
          <span className="block">
            Dear {childFirstName},<BlinkingCaret />
          </span>
          <span className="block mt-1 text-[15px] lg:text-[17px] font-medium text-ink-light/80 italic leading-[1.5]">
            Capture this moment now — it only takes a minute.
          </span>
        </Link>
      )}

      <div className="mt-7 flex flex-wrap items-center gap-3">
        {draft && resumeHref ? (
          <>
            <Link
              href={resumeHref}
              prefetch={false}
              className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
            >
              Continue writing →
            </Link>
            <CreationPicker
              vaultId={vaultId}
              vaultRevealDate={vaultRevealDate}
              childFirstName={childFirstName}
              childDateOfBirth={childDateOfBirth}
              variant="secondary"
              label="Start something new"
            />
          </>
        ) : (
          <CreationPicker
            vaultId={vaultId}
            vaultRevealDate={vaultRevealDate}
            childFirstName={childFirstName}
            childDateOfBirth={childDateOfBirth}
            variant="primary"
            label="Start something new"
          />
        )}
      </div>
    </section>
  );
}

/**
 * Subtle blinking caret appended to the "Dear {name}," prompt so
 * the surface reads as "a cursor waiting for you" without
 * actually being a live editor.
 */
function BlinkingCaret() {
  return (
    <span
      aria-hidden="true"
      className="inline-block align-[-0.15em] ml-[3px] w-[3px] h-[0.9em] bg-amber/80 animate-blink"
    />
  );
}

function formatResumeHint(draft: {
  title: string | null;
  updatedAt: string;
}): string {
  const updated = new Date(draft.updatedAt);
  const diffMs = Date.now() - updated.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 2) return "Continue your last letter — just now.";
  if (diffMin < 60) return `Continue your last letter — ${diffMin} min ago.`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24)
    return `Continue your last letter — ${diffHr} hour${
      diffHr === 1 ? "" : "s"
    } ago.`;
  const diffDay = Math.round(diffHr / 24);
  return `Continue your last letter — ${diffDay} day${
    diffDay === 1 ? "" : "s"
  } ago.`;
}
