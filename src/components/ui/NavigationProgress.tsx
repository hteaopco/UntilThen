"use client";

import { useEffect, useRef, useState } from "react";
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
 * Mobile details:
 *   - pointerdown fires sooner + more reliably than click on iOS
 *     (click can be suppressed by scroll heuristics), so both are
 *     listened to and dedup via the activatedAt ref.
 *   - A 350 ms minimum visible window prevents the bar from
 *     flickering off before the user sees it on fast RSC nav.
 *   - Bar animates from 0 → 15% via rAF so the motion is visible
 *     on first paint instead of snapping in fully sized.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const activatedAtRef = useRef<number>(0);
  const pendingHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function hideNow() {
    if (pendingHideRef.current) {
      clearTimeout(pendingHideRef.current);
      pendingHideRef.current = null;
    }
    setActive(false);
    setProgress(0);
  }

  function scheduleHide() {
    const MIN_VISIBLE_MS = 350;
    const elapsed = Date.now() - activatedAtRef.current;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    if (pendingHideRef.current) clearTimeout(pendingHideRef.current);
    // Finish-out animation then clear.
    setProgress(100);
    pendingHideRef.current = setTimeout(() => {
      setActive(false);
      setProgress(0);
      pendingHideRef.current = null;
    }, wait + 200);
  }

  // New pathname = navigation completed.
  useEffect(() => {
    if (active) scheduleHide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    let lastActivatedAt = 0;

    function tryActivate(e: MouseEvent | PointerEvent) {
      if (e.defaultPrevented) return;
      // The /home landing uses its own ring-around-the-bubble load
      // animation and deliberately suppresses this top bar so the
      // two don't fight for attention.
      if (window.location.pathname === "/home") return;
      // Ignore non-primary buttons + modifier keys (new tab etc).
      if ("button" in e && e.button !== 0) return;
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

      // Dedup pointerdown + click on the same tap.
      const now = Date.now();
      if (now - lastActivatedAt < 400) return;
      lastActivatedAt = now;
      activatedAtRef.current = now;

      setActive(true);
      setProgress(0);
      // rAF kick so the 0 → 15 transition actually animates.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setProgress(15));
      });
    }

    // Only listen to `click`, not `pointerdown`. iOS Safari
    // suppresses click when the user scrolls during a touch —
    // that suppression is exactly what we want here, so progress
    // doesn't light up when someone drags the dashboard
    // carousel. The earlier pointerdown listener defeated that
    // suppression and flashed the bar on every scroll touch.
    //
    // Use capture phase so we run BEFORE Next.js's <Link>
    // handler — the bubble-phase Link handler calls
    // preventDefault() to take over the navigation, which would
    // otherwise make our `e.defaultPrevented` check above bail
    // and the bar would never activate on Link clicks.
    document.addEventListener("click", tryActivate, true);
    return () => {
      document.removeEventListener("click", tryActivate, true);
    };
  }, []);

  // Creep the bar up while active.
  useEffect(() => {
    if (!active) return;
    const tick = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + (90 - p) * 0.12));
    }, 200);
    const safety = setTimeout(() => hideNow(), 8000);
    return () => {
      clearInterval(tick);
      clearTimeout(safety);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[9999] h-[3px] pointer-events-none"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div
        className="h-full bg-amber shadow-[0_0_10px_rgba(196,122,58,0.6)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%`, willChange: "width" }}
      />
    </div>
  );
}

