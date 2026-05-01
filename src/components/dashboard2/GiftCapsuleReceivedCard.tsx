import Link from "next/link";
import {
  AudioLines,
  ChevronRight,
  FileText,
  Heart,
  Image as ImageIcon,
  Sparkles,
  Video,
} from "lucide-react";

export type GiftCapsuleReceivedData = {
  id: string;
  /** Magic recipient token used as the path on /reveal/<token>.
   *  Saved capsules link there instead of /capsules/<id>, which
   *  is the organiser surface and 403s for recipients. */
  accessToken: string;
  title: string;
  coverUrl: string | null;
  entryCount: number;
  photoCount: number;
  voiceCount: number;
  /** Distinct video contributions in the capsule. Surfaced
   *  alongside the letter / photo / voice stat pills so the
   *  card faithfully reflects what's inside. */
  videoCount: number;
};

/**
 * Horizontal card for "Capsules Given to You". Small landscape cover
 * on the left, title + stat pills in the middle, chevron right.
 */
export function GiftCapsuleReceivedCard({ capsule }: { capsule: GiftCapsuleReceivedData }) {
  return (
    <Link
      href={`/reveal/${capsule.accessToken}`}
      prefetch={false}
      className="flex items-center gap-4 rounded-2xl bg-white border border-navy/[0.06] shadow-[0_4px_14px_-6px_rgba(15,31,61,0.08)] p-3 sm:p-4 hover:border-amber/30 transition-colors"
    >
      <div className="shrink-0 w-[96px] h-[72px] sm:w-[112px] sm:h-[84px] rounded-xl overflow-hidden bg-gradient-to-br from-amber/25 via-cream to-sage/20 border border-navy/[0.05]">
        {capsule.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capsule.coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <ReceivedPlaceholder seed={capsule.title} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-[17px] sm:text-[19px] font-bold text-navy tracking-[-0.2px] leading-tight truncate">
          {capsule.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-4 text-ink-light">
          <Stat icon={<FileText size={16} strokeWidth={1.75} />} count={capsule.entryCount} />
          <Stat icon={<ImageIcon size={16} strokeWidth={1.75} />} count={capsule.photoCount} />
          <Stat icon={<AudioLines size={16} strokeWidth={1.75} />} count={capsule.voiceCount} />
          <Stat icon={<Video size={16} strokeWidth={1.75} />} count={capsule.videoCount} />
        </div>
      </div>

      <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-ink-light" />
    </Link>
  );
}

function Stat({ icon, count }: { icon: React.ReactNode; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
      <span aria-hidden="true">{icon}</span>
      <span>{count}</span>
    </span>
  );
}

const RECEIVED_GRADIENTS = [
  "from-gold/30 via-cream to-amber/25",
  "from-sage/25 via-cream to-gold/20",
  "from-amber/25 via-cream to-sage/25",
];

/**
 * Placeholder when the organiser hasn't picked a cover photo
 * yet. A heart sits centred over the warm gradient with a
 * smaller sparkle floating off its top-right — visually echoes
 * the "Gift Capsules You're Creating" sparkle badge so the two
 * dashboard rails read as a matched set.
 */
function ReceivedPlaceholder({ seed }: { seed: string }) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const gradient = RECEIVED_GRADIENTS[hash % RECEIVED_GRADIENTS.length];
  return (
    <div
      className={`relative w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
      aria-hidden="true"
    >
      <Heart
        size={32}
        strokeWidth={1.5}
        className="text-amber-dark/70"
      />
      <Sparkles
        size={16}
        strokeWidth={1.75}
        className="absolute top-2 right-2.5 text-amber/90"
      />
    </div>
  );
}
