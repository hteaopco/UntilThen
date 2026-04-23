"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Top-of-page amber progress bar that lights up on in-app link
 * clicks and clears once the new route renders.
 *
 * Without it, Next.js App Router navigations that trigger server
 * work (data fetching, RSC streaming) feel frozen — the button
 * stays visually idle until the next page paints. A tiny visible
 * bar is enough to signal "we got you."
 *
 * Coverage: document-level click listener on internal <a> tags.
 * Form submissions and router.push calls are already covered by
 * per-button useTransition spinners in the components that own
 * them. An 8s safety timeout hides the bar if the signal for
 * "done" never arrives (e.g. navigation cancelled).
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);

  // New pathname = navigation completed. Clear the bar.
  useEffect(() => {
    setActive(false);
    setProgress(0);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (
        href.startsWith("http") ||
        href.startsWith("//") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#")
      ) {
        return;
      }
      if (anchor.getAttribute("target") === "_blank") return;
      if (anchor.hasAttribute("download")) return;

      // Same URL = no navigation, skip.
      try {
        const url = new URL((anchor as HTMLAnchorElement).href, window.location.href);
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        /* malformed href — let browser handle */
      }

      setActive(true);
      setProgress(15);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Creep the bar up so it looks alive while the route resolves.
  useEffect(() => {
    if (!active) return;
    const tick = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + (90 - p) * 0.12));
    }, 200);
    const safety = setTimeout(() => {
      setActive(false);
      setProgress(0);
    }, 8000);
    return () => {
      clearInterval(tick);
      clearTimeout(safety);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 z-[999] h-[3px] bg-amber shadow-[0_0_10px_rgba(251,191,36,0.6)] transition-[width] duration-200 ease-out pointer-events-none"
      style={{ width: `${progress}%` }}
    />
  );
}
