"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { captureEvent } from "@/components/PosthogProvider";
import { MediaDisplay, type MediaItem } from "@/components/editor/MediaDisplay";
import { FirstScreen } from "@/app/capsule/[id]/open/FirstScreen";
import { SequentialRevealScreen } from "@/app/capsule/[id]/open/SequentialRevealScreen";
import type { CapsuleTone } from "@/lib/tone";

type Occasion =
  | "BIRTHDAY"
  | "ANNIVERSARY"
  | "RETIREMENT"
  | "GRADUATION"
  | "WEDDING"
  | "OTHER";

export type PreviewContribution = {
  id: string;
  authorName: string;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  title: string | null;
  body: string | null;
  media: MediaItem[];
};

type Capsule = {
  id: string;
  title: string;
  recipientName: string;
  occasionType: Occasion;
  revealDate: string;
  isPaid: boolean;
  status: "DRAFT" | "ACTIVE" | "SEALED" | "REVEALED";
};

type View = "gate" | "first" | "sequence" | "close";

export function PreviewExperience({
  capsule,
  contributions,
}: {
  capsule: Capsule;
  contributions: PreviewContribution[];
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("gate");
  const [startedEvent, setStartedEvent] = useState(false);

  const tone: CapsuleTone = "CELEBRATION";

  const sequenceContributions = contributions.map((c) => ({
    id: c.id,
    authorName: c.authorName,
    type: c.type,
    title: c.title,
    body: c.body,
  }));

  if (view === "gate") {
    return (
      <main
        className="min-h-screen flex items-center justify-center px-6 text-center"
        style={{
          backgroundColor: "#fdf8f2",
          backgroundImage:
            "linear-gradient(rgba(44,36,32,0.3), rgba(44,36,32,0.3))",
        }}
      >
        <div className="max-w-[520px] space-y-8">
          <p className="text-[22px] lg:text-[26px] font-extrabold text-navy tracking-[-0.4px] leading-[1.25]">
            This is what {capsule.recipientName} will experience.
          </p>
          <p className="text-sm text-navy/60">
            {contributions.length}{" "}
            {contributions.length === 1 ? "contribution" : "contributions"} so
            far
          </p>
          <button
            type="button"
            onClick={() => {
              if (!startedEvent) {
                captureEvent("capsule_preview_started", {
                  capsuleId: capsule.id,
                });
                setStartedEvent(true);
              }
              setView("first");
            }}
            className="inline-flex items-center gap-2 bg-amber text-white px-7 py-3.5 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors"
          >
            Start preview
          </button>
        </div>
      </main>
    );
  }

  if (view === "first") {
    return (
      <FirstScreen
        capsule={capsule}
        contributionCount={contributions.length}
        onOpen={() =>
          setView(contributions.length > 0 ? "sequence" : "close")
        }
      />
    );
  }

  if (view === "sequence") {
    return (
      <SequentialRevealScreen
        contributions={sequenceContributions}
        tone={tone}
        onComplete={() => {
          captureEvent("capsule_preview_completed", {
            capsuleId: capsule.id,
          });
          setView("close");
        }}
      />
    );
  }

  const alreadyPaid =
    capsule.isPaid ||
    capsule.status === "ACTIVE" ||
    capsule.status === "SEALED";

  return (
    <main className="min-h-screen bg-warm-slate text-white flex items-center justify-center px-6 animate-fadeIn">
      <div className="max-w-[420px] w-full text-center space-y-5">
        <p className="text-[20px] font-bold text-white tracking-[-0.3px]">
          This is what you&rsquo;re sending.
        </p>
        {alreadyPaid ? (
          <>
            <p className="text-sm text-white/65 leading-[1.6]">
              Already unlocked — invites have gone to your contributors.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/capsules/${capsule.id}`)}
              className="w-full max-w-[360px] mx-auto inline-flex items-center justify-center gap-2 bg-gold text-navy px-6 py-3 rounded-lg text-[15px] font-bold hover:bg-gold-light transition-colors"
            >
              Back to capsule
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                captureEvent("capsule_preview_converted", {
                  capsuleId: capsule.id,
                });
                router.push(`/capsules/${capsule.id}#activate`);
              }}
              className="w-full max-w-[360px] mx-auto inline-flex items-center justify-center gap-2 bg-amber text-white px-6 py-3 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors"
            >
              Send to contributors — $9.99
            </button>
            <p className="text-xs text-white/60 leading-[1.55]">
              Invites your contributors. They&rsquo;ll add messages before
              the reveal date.
            </p>
          </>
        )}

        <div className="pt-4 flex justify-center gap-4">
          <button
            type="button"
            onClick={() => setView("gate")}
            className="text-xs font-medium text-white/45 hover:text-white/80 transition-colors"
          >
            Replay preview
          </button>
          <Link
            href={`/capsules/${capsule.id}`}
            className="text-xs font-medium text-white/45 hover:text-white/80 transition-colors"
          >
            Back to capsule
          </Link>
        </div>
      </div>
    </main>
  );
}
