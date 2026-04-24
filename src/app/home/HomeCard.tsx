"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  href: string;
  imageSrc: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
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
      className={`group relative z-10 block rounded-2xl overflow-hidden bg-cream transition-all ${
        loading
          ? ""
          : "hover:shadow-[0_10px_28px_-8px_rgba(196,122,58,0.22)] active:scale-[0.99]"
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

      {/* Text overlay on the left half */}
      <div className="absolute inset-y-0 left-0 w-[56%] sm:w-[52%] flex items-center pointer-events-none pl-5 sm:pl-7">
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
          <h2 className="mt-3 sm:mt-4 font-serif text-[20px] sm:text-[24px] font-bold text-navy tracking-[-0.3px] leading-[1.1]">
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
