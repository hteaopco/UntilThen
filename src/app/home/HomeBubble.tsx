"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  href: string;
  icon: React.ReactNode;
  label: string;
};

// Match HomeCard timing so both entry animations feel like the
// same family. Ring completes, then router.push fires.
const RING_DURATION_MS = 850;

/**
 * Smaller circular companion to HomeCard. Used for the secondary
 * entry points on /home (Enterprise, Weddings). Tapping fills an
 * amber progress ring around the bubble before navigating.
 */
export function HomeBubble({ href, icon, label }: Props) {
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
      className="group flex flex-col items-center gap-2 select-none"
    >
      <div className="relative w-[68px] h-[68px] sm:w-[76px] sm:h-[76px]">
        <div
          className={`w-full h-full rounded-full bg-gradient-to-br from-amber-tint via-white to-amber/25 border border-amber/25 flex items-center justify-center transition-transform ${
            loading
              ? ""
              : "group-hover:-translate-y-0.5 group-active:scale-[0.97]"
          }`}
          style={{
            boxShadow:
              "0 10px 24px -8px rgba(196,122,58,0.30), inset 0 1px 2px rgba(255,255,255,0.7)",
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
      <span className="text-[12px] sm:text-[13px] font-bold text-navy tracking-[-0.2px]">
        {label}
      </span>
    </Link>
  );
}
