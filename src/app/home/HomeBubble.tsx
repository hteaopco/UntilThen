"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
};

// How long the progress ring takes to draw fully. Picked by feel —
// long enough to register as a deliberate load animation, short
// enough not to feel sluggish.
const RING_DURATION_MS = 650;

/**
 * Landing-page bubble with a click-to-load interaction: on tap, a
 * thin amber progress ring draws around the bubble, and when it
 * completes (~650ms) the router navigates to `href`. Replaces the
 * browser's default top-edge loading indicator with something that
 * visually connects to the button the user just pressed.
 */
export function HomeBubble({ href, icon, title, subtitle }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    // Preserve browser-native behavior for modified clicks
    // (cmd/ctrl-click to open in new tab, middle-click, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    // Schedule the navigation for when the ring completes. Next's
    // router.push runs a client-side transition; since we're also
    // prefetching, the target is typically already in memory.
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
      className={`relative z-10 w-[215px] h-[215px] sm:w-[240px] sm:h-[240px] rounded-full bg-gradient-to-br from-amber-tint/70 via-white to-amber-tint/30 border-2 border-amber/20 shadow-[0_10px_28px_-8px_rgba(196,122,58,0.22)] flex flex-col items-center justify-center gap-2 text-center px-6 transition-all ${
        loading
          ? ""
          : "hover:border-amber/40 hover:shadow-[0_14px_36px_-8px_rgba(196,122,58,0.32)] active:scale-[0.98]"
      }`}
    >
      {/* Progress ring — renders on top of the existing border. */}
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
            strokeWidth="1.4"
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

      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/70 border border-amber/10 flex items-center justify-center shadow-inner">
        {icon}
      </div>
      <h2 className="font-bold text-[17px] sm:text-[19px] text-navy tracking-[-0.3px] leading-tight">
        {title}
      </h2>
      <p className="text-[12px] sm:text-[13px] text-navy/60 leading-[1.35]">
        {subtitle}
      </p>
    </Link>
  );
}
