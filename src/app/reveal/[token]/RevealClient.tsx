"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  // Flips true once the in-session claim POST succeeds (or the
  // capsule was already saved on initial load). Drives
  // RevealExperience's `externalSaved` so the SavePromptScreen +
  // gallery banner disappear without a remount.
  const [savedInSession, setSavedInSession] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();

  // Bounce the recipient through Clerk and back, then hand the
  // returning user back to this same page with ?claim=1 so the
  // claim effect below auto-fires.
  //
  // If the recipient is already signed in (e.g. they completed
  // sign-up earlier but the post-auth bounce dropped them at
  // /home instead of here, then they came back to /reveal/<token>
  // manually and tapped Save again), there's nothing to bounce
  // through — pushing them through /sign-up a second time was
  // the bug behind the "had to sign in twice and ended up on
  // /home" reports. Just stamp ?claim=1 directly so the existing
  // claim effect below fires the save in place.
  function launchClaimRedirect() {
    if (authLoaded && isSignedIn) {
      router.replace(`${pathname}?claim=1`);
      return;
    }
    const claimUrl = `${pathname}?claim=1`;
    router.push(`/sign-up?redirect_url=${encodeURIComponent(claimUrl)}`);
  }

  // Auto-claim handler. Triggers when:
  //   - data has loaded (so we have capsule.id)
  //   - the URL carries ?claim=1 (the post-auth handoff signal)
  //   - the viewer is now signed in (Clerk session is hydrated)
  //   - we haven't already claimed in-session
  // Calls /api/capsules/[id]/save with the magic token (which the
  // endpoint validates against capsule.accessToken). On success we
  // flip savedInSession and strip ?claim=1 off the URL so a refresh
  // doesn't re-fire the post.
  useEffect(() => {
    if (!authLoaded || !isSignedIn || !data) return;
    if (savedInSession || data.capsule.isSaved) {
      // Already saved server-side or this session — make sure the
      // experience knows.
      if (!savedInSession && data.capsule.isSaved) setSavedInSession(true);
      return;
    }
    if (searchParams.get("claim") !== "1") return;

    const capsuleId = data.capsule.id;
    let cancelled = false;
    async function claim() {
      try {
        const res = await fetch(
          `/api/capsules/${encodeURIComponent(capsuleId)}/save`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          },
        );
        if (cancelled) return;
        if (res.ok) {
          setSavedInSession(true);
          captureEvent("reveal_save_claimed", { capsuleId });
        } else {
          // Surface in console for debugging; the recipient still
          // gets a working gallery without the claim.
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          console.warn("[reveal claim] save failed:", body.error ?? res.status);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn("[reveal claim] save threw:", err);
      } finally {
        // Strip ?claim=1 off the URL whether or not the call
        // succeeded — leaving it on the URL would re-fire the
        // effect on every back/forward navigation.
        if (!cancelled) router.replace(pathname);
      }
    }
    void claim();
    return () => {
      cancelled = true;
    };
  }, [
    authLoaded,
    isSignedIn,
    data,
    savedInSession,
    searchParams,
    token,
    pathname,
    router,
  ]);

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
          onSaveRequested={launchClaimRedirect}
          externalSaved={savedInSession || data.capsule.isSaved}
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
