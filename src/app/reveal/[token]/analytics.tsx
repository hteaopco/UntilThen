"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import { captureEvent } from "@/components/PosthogProvider";

/**
 * Context for reveal-flow analytics. Provides a bound
 * `capture(name, props)` that auto-injects capsuleId, so phase
 * components don't have to thread it through every call site.
 *
 * The provider is a no-op wrapper — all events flow through
 * captureEvent from PosthogProvider, which is itself safe when
 * PostHog isn't loaded (missing key, SSR, etc.).
 */

type RevealAnalytics = {
  capture: (name: string, props?: Record<string, unknown>) => void;
};

const RevealAnalyticsContext = createContext<RevealAnalytics | null>(null);

export function RevealAnalyticsProvider({
  capsuleId,
  children,
}: {
  capsuleId: string;
  children: ReactNode;
}) {
  const value = useMemo<RevealAnalytics>(
    () => ({
      capture: (name, props) =>
        captureEvent(name, { capsuleId, ...(props ?? {}) }),
    }),
    [capsuleId],
  );
  return (
    <RevealAnalyticsContext.Provider value={value}>
      {children}
    </RevealAnalyticsContext.Provider>
  );
}

/**
 * Phase components call this and get a bound capture() that
 * auto-stamps capsuleId. Falls back to a silent no-op when used
 * outside a provider (admin mock preview).
 */
export function useRevealAnalytics(): RevealAnalytics {
  const ctx = useContext(RevealAnalyticsContext);
  if (ctx) return ctx;
  return {
    capture: () => {
      /* no-op outside provider — e.g. admin mock preview */
    },
  };
}
