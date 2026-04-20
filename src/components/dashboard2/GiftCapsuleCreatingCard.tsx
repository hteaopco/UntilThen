import Link from "next/link";
import { ChevronRight, Plus, Sparkles, User } from "lucide-react";

export type GiftCapsuleCreatingData = {
  id: string;
  title: string;
  contributorCount: number;
  newCount: number;
  contributorNames: string[];
  coverUrl: string | null;
};

/**
 * Horizontal card for "Gift Capsules You're Creating". Left: sparkles
 * badge + cover thumbnail. Middle: title, contributor count, avatar
 * row (3 visible + overflow counter + invite affordance). Right:
 * "N new" pill + chevron.
 */
export function GiftCapsuleCreatingCard({ capsule }: { capsule: GiftCapsuleCreatingData }) {
  return (
    <Link
      href={`/capsules/${capsule.id}`}
      prefetch={false}
      className="relative flex items-center gap-4 rounded-2xl bg-white border border-amber/15 shadow-[0_4px_14px_-6px_rgba(196,122,58,0.18)] p-3 sm:p-4 hover:border-amber/35 transition-colors"
    >
      <span
        aria-hidden="true"
        className="absolute -left-2 -top-2 w-8 h-8 rounded-full bg-cream border border-amber/20 flex items-center justify-center"
      >
        <Sparkles size={16} strokeWidth={1.75} className="text-amber" />
      </span>

      <div className="shrink-0 w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] rounded-xl overflow-hidden bg-gradient-to-br from-amber/20 via-cream to-gold/20 border border-amber/10">
        {capsule.coverUrl ? (
          <img src={capsule.coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <CreatingPlaceholder seed={capsule.title} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-[16px] sm:text-[17px] font-bold text-navy tracking-[-0.2px] leading-tight truncate">
          {capsule.title}
        </h3>
        <p className="mt-0.5 text-[13px] text-ink-light">
          {capsule.contributorCount} {capsule.contributorCount === 1 ? "contributor" : "contributors"}
        </p>
        <AvatarRow total={capsule.contributorCount} />
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {capsule.newCount > 0 && (
          <span className="text-[12px] font-semibold text-amber border border-amber/40 rounded-full px-2.5 py-1">
            {capsule.newCount} new
          </span>
        )}
        <ChevronRight size={18} strokeWidth={1.75} className="text-ink-light" />
      </div>
    </Link>
  );
}

/**
 * Avatar row: always three default User-icon avatars, a "+N" counter
 * when there are more than three contributors, and a dashed "+"
 * affordance at the end signalling "invite more". All decorative for
 * now — no wiring.
 */
function AvatarRow({ total }: { total: number }) {
  const extra = Math.max(0, total - 3);
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <div className="flex items-center -space-x-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <DefaultAvatar key={i} index={i} />
        ))}
        {extra > 0 && (
          <span className="w-6 h-6 rounded-full border-2 border-white bg-[#e7e3db] text-ink-mid text-[10px] font-semibold flex items-center justify-center">
            +{extra}
          </span>
        )}
      </div>
      <span
        aria-hidden="true"
        className="w-6 h-6 rounded-full border border-dashed border-amber/50 bg-white flex items-center justify-center text-amber ml-1"
      >
        <Plus size={12} strokeWidth={2.25} />
      </span>
    </div>
  );
}

const AVATAR_BGS = [
  "bg-[#d6b49c]",
  "bg-[#a08b73]",
  "bg-[#8aa4bd]",
  "bg-[#c58e7a]",
  "bg-[#b0a088]",
];

function DefaultAvatar({ index }: { index: number }) {
  const bg = AVATAR_BGS[index % AVATAR_BGS.length];
  return (
    <span
      className={`w-6 h-6 rounded-full border-2 border-white ${bg} flex items-center justify-center text-white`}
    >
      <User size={12} strokeWidth={2} />
    </span>
  );
}

const CREATING_GRADIENTS = [
  "from-amber/30 via-cream to-gold/25",
  "from-sage/25 via-cream to-amber/30",
  "from-rose-200/40 via-cream to-amber/20",
];

function CreatingPlaceholder({ seed }: { seed: string }) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const gradient = CREATING_GRADIENTS[hash % CREATING_GRADIENTS.length];
  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient}`} aria-hidden="true" />
  );
}
