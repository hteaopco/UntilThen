"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

// Thin client-side provider: initialises PostHog once on mount when the
// publishable key is configured, otherwise no-ops so the rest of the app
// still works locally / in previews without analytics.
export function PosthogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    if (posthog.__loaded) return;

    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      capture_pageview: true,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      // Record sessions so we can review real UX. maskAllInputs
      // hides every <input>/<textarea> value by default — passwords,
      // email, letter drafts, etc. — so recordings never leak
      // sensitive content.
      session_recording: {
        maskAllInputs: true,
      },
    });
  }, []);

  return <>{children}</>;
}

// Safe wrapper around posthog.capture. Silent when PostHog isn't loaded
// (missing key, initialisation still pending, etc.) so form events never
// throw in the UI.
export function captureEvent(
  name: string,
  props?: Record<string, unknown>,
): void {
  try {
    if (typeof window === "undefined") return;
    if (!posthog.__loaded) return;
    posthog.capture(name, props);
  } catch {
    // swallow — analytics should never break the product.
  }
}
