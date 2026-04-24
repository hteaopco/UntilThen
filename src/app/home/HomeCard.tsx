"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  href: string;
  imageSrc: string;
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle: React.ReactNode;
};

// Ring-fill duration when the user taps. Matches the old HomeBubble
// timing so the two animations feel like the same family.
const RING_DURATION_MS = 850;

/**
 * Illustrated entry card. The PNG fills the card; text + icon sit
 * on the LEFT half absolutely positioned over it. On tap, an amber
 * progress ring draws around the ICON CIRCLE (not the whole card)
 * for ~850 ms, then router.push fires. Modified-click behavior
 * (cmd/ctrl/shift-click) is preserved for open-in-new-tab etc.
 */
export function HomeCard({ href, imageSrc, icon, title, subtitle }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    window.setTimeout(() => {
      router.push(href);
    }, RING_DURATION_MS);
  }

  return (
    <Link
      href={href}
      prefetch
      onClick={handleClick}
      aria-busy={loading}
      className={`group relative z-10 block rounded-2xl overflow-hidden bg-cream shadow-[0_10px_30px_-10px_rgba(15,31,61,0.18),0_4px_10px_-4px_rgba(196,122,58,0.18)] transition-all ${
        loading
          ? ""
          : "hover:shadow-[0_18px_44px_-12px_rgba(15,31,61,0.22),0_6px_14px_-4px_rgba(196,122,58,0.28)] hover:-translate-y-0.5 active:scale-[0.99]"
      }`}
    >
      {/* Base illustration */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        className="w-full h-auto block select-none"
      />

      {/* Subtle dark tint over the illustration so the card reads
          distinct from the cream page background. Sits below the
          text overlay so the icon + heading aren't muddied. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/[0.07] pointer-events-none"
      />

      {/* Text overlay on the left half */}
      <div className="absolute inset-y-0 left-0 w-[56%] sm:w-[52%] flex items-center pointer-events-none pl-7 sm:pl-10 pr-2">
        <div>
          {/* Icon tile with ring-fill overlay when loading */}
          <div className="relative w-11 h-11 sm:w-12 sm:h-12">
            <div
              className="w-full h-full rounded-full bg-gradient-to-br from-amber-tint to-white border border-amber/10 flex items-center justify-center"
              style={{
                boxShadow:
                  "0 6px 16px -4px rgba(196,122,58,0.25), inset 0 1px 2px rgba(255,255,255,0.6)",
              }}
            >
              {icon}
            </div>
            {loading ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full pointer-events-none"
              >
                <circle
                  cx="50"
                  cy="50"
                  r="49"
                  fill="none"
                  stroke="currentColor"
                  className="text-amber"
                  strokeWidth="3"
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray={100}
                  strokeDashoffset={100}
                  transform="rotate(-90 50 50)"
                  style={{
                    animation: `home-ring-fill ${RING_DURATION_MS}ms cubic-bezier(0.65, 0, 0.35, 1) forwards`,
                  }}
                />
              </svg>
            ) : null}
          </div>
          <h2 className="mt-3 sm:mt-4 text-[18px] sm:text-[22px] font-extrabold text-navy tracking-[-0.4px] leading-[1.15]">
            {title}
          </h2>
          <div
            aria-hidden="true"
            className="mt-2 h-[2px] w-9 bg-amber rounded-full"
          />
          <p className="mt-2 text-[12px] sm:text-[13px] text-navy/65 leading-[1.4] max-w-[180px]">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Soft cream feather around the edge — hides any small seam
          between the PNG's own background and the page's #fdf8f2. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ boxShadow: "inset 0 0 14px 4px #fdf8f2" }}
      />
    </Link>
  );
}
