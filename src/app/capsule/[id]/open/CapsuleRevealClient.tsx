"use client";

import { useEffect, useState } from "react";

import { captureEvent } from "@/components/PosthogProvider";
import { triggerCelebration } from "@/lib/confetti";

import { ExpiredLinkScreen } from "./ExpiredLinkScreen";
import { FirstScreen } from "./FirstScreen";
import { ListScreen } from "./ListScreen";
import { SequentialRevealScreen } from "./SequentialRevealScreen";

type Occasion =
  | "BIRTHDAY"
  | "ANNIVERSARY"
  | "RETIREMENT"
  | "GRADUATION"
  | "WEDDING"
  | "OTHER";

type Capsule = {
  id: string;
  title: string;
  recipientName: string;
  occasionType: Occasion;
  revealDate: string;
  isFirstOpen: boolean;
  hasAccount: boolean;
};

type Contribution = {
  id: string;
  authorName: string;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  title: string | null;
  body: string | null;
  mediaUrls: string[];
  mediaTypes: string[];
  createdAt: string;
};

type View = "first" | "sequence" | "list";

export function CapsuleRevealClient({
  capsuleId,
  token,
  preview,
}: {
  capsuleId: string;
  token: string;
  preview: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const [capsule, setCapsule] = useState<Capsule | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [view, setView] = useState<View>("first");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/capsules/open/${capsuleId}?t=${encodeURIComponent(token)}`,
        );
        if (res.status === 410) {
          if (!cancelled) {
            setExpired(true);
            setLoading(false);
          }
          return;
        }
        if (!res.ok) {
          if (!cancelled) setLoading(false);
          return;
        }
        const data = (await res.json()) as {
          capsule: Capsule;
          contributions: Contribution[];
        };
        if (cancelled) return;
        setCapsule(data.capsule);
        setContributions(data.contributions);
        // First open = guided sequence; later visits = list.
        setView(data.capsule.isFirstOpen ? "first" : "list");
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [capsuleId, token]);

  if (loading) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-sm italic text-ink-light">Opening your capsule…</p>
      </main>
    );
  }

  if (expired) {
    return <ExpiredLinkScreen capsuleId={capsuleId} />;
  }

  if (!capsule) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="max-w-[420px] text-center">
          <h1 className="text-[26px] font-extrabold text-navy tracking-[-0.4px]">
            We couldn&rsquo;t open this capsule.
          </h1>
          <p className="mt-3 text-sm text-ink-mid">
            Double-check the link in your email.
          </p>
        </div>
      </main>
    );
  }

  if (view === "first") {
    return (
      <FirstScreen
        capsule={capsule}
        contributionCount={contributions.length}
        onOpen={() => {
          if (!preview) {
            captureEvent("capsule_opened", { capsuleId });
            // Celebrate the moment with a warm confetti drift. Only
            // fires on real opens (not the organiser's preview
            // surface, which has its own scene for this).
            void triggerCelebration();
          }
          // If there's nothing in the capsule, skip straight to
          // the list so the recipient isn't staring at a sequence
          // of zero items.
          setView(contributions.length > 0 ? "sequence" : "list");
        }}
      />
    );
  }

  if (view === "sequence") {
    return (
      <SequentialRevealScreen
        contributions={contributions}
        onComplete={() => {
          if (!preview) {
            captureEvent("capsule_sequential_completed", { capsuleId });
            // Stamp recipientCompletedAt server-side so analytics
            // can distinguish "opened" from "completed". Fire and
            // forget — a failure here shouldn't block the UI.
            void fetch(`/api/capsules/open/${capsuleId}/complete`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            }).catch(() => {
              /* swallow — analytics is best-effort */
            });
          }
          setView("list");
        }}
      />
    );
  }

  return (
    <ListScreen
      capsule={capsule}
      token={token}
      contributions={contributions}
      preview={preview}
    />
  );
}
