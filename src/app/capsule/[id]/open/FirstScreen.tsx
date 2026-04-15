"use client";

import { TimeVault } from "@/components/ui/TimeVault";
import { formatLong } from "@/lib/dateFormatters";

type Occasion =
  | "BIRTHDAY"
  | "ANNIVERSARY"
  | "RETIREMENT"
  | "GRADUATION"
  | "WEDDING"
  | "OTHER";

/**
 * The emotional-hook variant is tone-sensitive. "Showed up for
 * you" lands for personal occasions; for professional / life-
 * transition occasions ("Retirement", "Graduation") we fall
 * back to a softer "left you something" / "wrote to you" — per
 * the brief's v1.1 clarification that the intimate phrasing can
 * feel slightly heavy on work contexts.
 */
function heroLine(occasion: Occasion, count: number): string {
  const n = count.toLocaleString();
  if (count === 0) return "Your capsule is ready.";
  switch (occasion) {
    case "BIRTHDAY":
    case "ANNIVERSARY":
    case "WEDDING":
      return count === 1
        ? "One person showed up for you."
        : `${n} people showed up for you.`;
    case "RETIREMENT":
    case "GRADUATION":
      return count === 1
        ? "One person wrote to you."
        : `${n} people wrote to you.`;
    case "OTHER":
    default:
      return count === 1
        ? "One person left you something."
        : `${n} people left you something.`;
  }
}

const OCCASION_EMOJI: Record<Occasion, string> = {
  BIRTHDAY: "🎂",
  ANNIVERSARY: "💍",
  RETIREMENT: "🎉",
  GRADUATION: "🎓",
  WEDDING: "💐",
  OTHER: "✨",
};

export function FirstScreen({
  capsule,
  contributionCount,
  onOpen,
}: {
  capsule: {
    title: string;
    recipientName: string;
    occasionType: Occasion;
    revealDate: string;
  };
  contributionCount: number;
  onOpen: () => void;
}) {
  return (
    <main className="min-h-screen bg-warm-slate text-white flex items-center justify-center px-6">
      <div className="max-w-[520px] w-full text-center space-y-8">
        <div className="flex justify-center">
          <TimeVault state="sealed" ariaLabel={`${capsule.recipientName}'s capsule`} />
        </div>

        <div aria-hidden="true" className="text-3xl">
          {OCCASION_EMOJI[capsule.occasionType]}
        </div>

        <h1 className="text-balance text-[28px] lg:text-[36px] font-extrabold tracking-[-0.5px] leading-[1.1]">
          {heroLine(capsule.occasionType, contributionCount)}
        </h1>

        <div className="text-[15px] text-white/70">
          <div className="font-semibold text-white">{capsule.title}</div>
          <div>{formatLong(capsule.revealDate)}</div>
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-2 bg-gold text-navy px-7 py-3.5 rounded-lg text-[15px] font-bold hover:bg-gold-light transition-colors"
        >
          Open your capsule →
        </button>
      </div>
    </main>
  );
}
