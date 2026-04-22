"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ErrorScreen,
  LoadingScreen,
  NotYetOpenScreen,
} from "./ErrorScreens";
import { EntryScreen } from "./EntryScreen";
import { GalleryScreen } from "./GalleryScreen";
import { StoryCards } from "./StoryCards";
import { TransitionScreen } from "./TransitionScreen";

const STORY_LIMIT = 5;

export type RevealMedia = {
  kind: "photo" | "voice" | "video";
  url: string;
};

export type RevealContribution = {
  id: string;
  authorName: string;
  authorAvatarUrl: string | null;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  title: string | null;
  body: string | null;
  media: RevealMedia[];
  createdAt: string;
};

export type RevealCapsule = {
  id: string;
  title: string;
  recipientName: string;
  occasionType: string;
  tone: string;
  revealDate: string;
  isFirstOpen: boolean;
  hasCompleted: boolean;
};

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

type Phase =
  | "loading"
  | "entry"
  | "stories" // Chunk 2
  | "transition" // Chunk 3
  | "gallery" // Chunk 3
  | "sealed"
  | "error";

/**
 * Recipient reveal orchestrator.
 *
 * Fetches /api/reveal/{token} once on mount; the response carries
 * the capsule + every approved contribution + pre-signed media
 * URLs. After that the rest is a pure client state machine that
 * never round-trips to the server again.
 *
 * Phase progression (built in chunks):
 *   loading → entry        (Chunk 1)
 *   entry   → stories      (Chunk 2)
 *   stories → transition   (Chunk 3)
 *   transition → gallery   (Chunk 3)
 *   gallery → entry replay (Chunk 4)
 */
export function RevealClient({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
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
          setPhase("error");
          return;
        }
        const body = (await res.json()) as LiveResponse | SealedResponse;
        if (cancelled) return;
        if (body.sealed) {
          setSealed(body.capsule);
          setPhase("sealed");
          return;
        }
        setData(body);
        // Returning visitors who already finished the guided
        // sequence skip Phase 1 and land in the gallery (Chunk 3).
        // Until the gallery exists, returning visits also start
        // at Entry — gracefully no-op.
        setPhase(body.capsule.hasCompleted ? "entry" : "entry");
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong loading this capsule.",
        );
        setPhase("error");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const recipientName = useMemo(() => {
    if (data) return data.capsule.recipientName;
    if (sealed) return sealed.recipientName;
    return "";
  }, [data, sealed]);

  if (phase === "loading") return <LoadingScreen />;
  if (phase === "error") {
    return <ErrorScreen message={errorMessage ?? "This capsule link isn't valid."} />;
  }
  if (phase === "sealed" && sealed) {
    return (
      <NotYetOpenScreen
        recipientName={sealed.recipientName}
        revealDate={sealed.revealDate}
      />
    );
  }
  if (phase === "entry" && data) {
    return (
      <EntryScreen
        recipientName={recipientName}
        revealDate={data.capsule.revealDate}
        onBegin={() => setPhase("stories")}
      />
    );
  }

  if (phase === "stories" && data) {
    return (
      <StoryCards
        contributions={data.contributions}
        // ✕ from stories jumps straight to gallery (skips the
        // transition screen — the brief explicitly says "exits to
        // gallery immediately"). Reaching the end of the deck
        // routes through the transition screen first.
        onClose={() => setPhase("gallery")}
        onComplete={() => {
          // No transition screen if everything was already shown
          // in the highlight reel — saves the recipient a tap.
          const remaining = Math.max(
            0,
            data.contributions.length - STORY_LIMIT,
          );
          setPhase(remaining > 0 ? "transition" : "gallery");
        }}
      />
    );
  }

  if (phase === "transition" && data) {
    const remaining = Math.max(0, data.contributions.length - STORY_LIMIT);
    const contributorCount = new Set(
      data.contributions.map((c) => c.authorName.trim()).filter(Boolean),
    ).size;
    return (
      <TransitionScreen
        remainingCount={remaining}
        contributorCount={contributorCount}
        onContinue={() => setPhase("gallery")}
      />
    );
  }

  if (phase === "gallery" && data) {
    return (
      <GalleryScreen
        recipientName={recipientName}
        contributions={data.contributions}
      />
    );
  }

  return <LoadingScreen />;
}
