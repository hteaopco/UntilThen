"use client";

import { useEffect, useState } from "react";

import { captureEvent } from "@/components/PosthogProvider";

import { RevealAnalyticsProvider } from "./analytics";
import {
  ErrorScreen,
  LoadingScreen,
  NotYetOpenScreen,
} from "./ErrorScreens";
import {
  RevealExperience,
  type RevealCapsule,
  type RevealContribution,
} from "./RevealExperience";

// Re-export the shared types so existing imports
// (StoryCards, GalleryCard, etc.) keep working unchanged.
export type {
  RevealCapsule,
  RevealContribution,
  RevealMedia,
} from "./RevealExperience";

type SealedResponse = {
  sealed: true;
  capsule: {
    id: string;
    title: string;
    recipientName: string;
    revealDate: string;
  };
};

type LiveResponse = {
  sealed: false;
  capsule: RevealCapsule;
  contributions: RevealContribution[];
};

type ErrorResponse = { error: string };

type Status = "loading" | "live" | "sealed" | "error";

/**
 * Real-recipient route wrapper. Fetches /api/reveal/{token} on
 * mount, then hands the data off to RevealExperience which owns
 * the four-phase state machine. Error / sealed / loading shells
 * are handled here so the experience itself stays pure.
 */
export function RevealClient({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<LiveResponse | null>(null);
  const [sealed, setSealed] = useState<SealedResponse["capsule"] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/reveal/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as ErrorResponse;
          if (cancelled) return;
          setErrorMessage(body.error ?? "This capsule link isn't valid.");
          setStatus("error");
          return;
        }
        const body = (await res.json()) as LiveResponse | SealedResponse;
        if (cancelled) return;
        if (body.sealed) {
          setSealed(body.capsule);
          setStatus("sealed");
          captureEvent("reveal_sealed_viewed", {
            capsuleId: body.capsule.id,
          });
          return;
        }
        setData(body);
        setStatus("live");
        captureEvent("reveal_opened", {
          capsuleId: body.capsule.id,
          isFirstOpen: body.capsule.isFirstOpen,
          hasCompleted: body.capsule.hasCompleted,
          contributionCount: body.contributions.length,
        });
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Something went wrong loading this capsule.",
        );
        setStatus("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === "loading") return <LoadingScreen />;
  if (status === "error") {
    return (
      <ErrorScreen message={errorMessage ?? "This capsule link isn't valid."} />
    );
  }
  if (status === "sealed" && sealed) {
    return (
      <NotYetOpenScreen
        recipientName={sealed.recipientName}
        revealDate={sealed.revealDate}
      />
    );
  }
  if (status === "live" && data) {
    return (
      <RevealAnalyticsProvider capsuleId={data.capsule.id}>
        <RevealExperience
          capsule={data.capsule}
          contributions={data.contributions}
          onCompleted={() => {
            captureEvent("reveal_completed", {
              capsuleId: data.capsule.id,
              contributionCount: data.contributions.length,
            });
            // Fire-and-forget — failure here is non-fatal (the
            // recipient can still browse the gallery just fine;
            // the hasCompleted flag will be re-attempted on next
            // visit).
            void fetch(`/api/reveal/${encodeURIComponent(token)}/complete`, {
              method: "POST",
              keepalive: true,
            }).catch(() => {});
          }}
        />
      </RevealAnalyticsProvider>
    );
  }
  return <LoadingScreen />;
}
