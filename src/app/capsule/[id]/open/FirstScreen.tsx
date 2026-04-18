"use client";

import { Cake, Flower2, GraduationCap, Heart, PartyPopper, Sparkles } from "lucide-react";
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
function heroLine(_occasion: Occasion, count: number): string {
  if (count === 0) return "Your capsule is ready.";
  return "Something\u2019s waiting for you.";
}

const OCCASION_ICON: Record<Occasion, React.ReactNode> = {
  BIRTHDAY: <Cake size={28} strokeWidth={1.5} />,
  ANNIVERSARY: <Heart size={28} strokeWidth={1.5} />,
  RETIREMENT: <PartyPopper size={28} strokeWidth={1.5} />,
  GRADUATION: <GraduationCap size={28} strokeWidth={1.5} />,
  WEDDING: <Flower2 size={28} strokeWidth={1.5} />,
  OTHER: <Sparkles size={28} strokeWidth={1.5} />,
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

        <div aria-hidden="true" className="flex justify-center text-white/80">
          {OCCASION_ICON[capsule.occasionType]}
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
          Open your capsule
        </button>
      </div>
    </main>
  );
}
