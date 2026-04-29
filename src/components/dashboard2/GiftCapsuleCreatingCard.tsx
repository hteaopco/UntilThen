import Link from "next/link";
import { ChevronRight, Plus, Sparkles, User } from "lucide-react";

export type GiftCapsuleCreatingData = {
  id: string;
  title: string;
  contributorCount: number;
  newCount: number;
  contributorNames: string[];
  /** First N invitees for the avatar row. avatarUrl is non-null
   *  only when the invitee has signed up and their User.email
   *  matches the invite. Misses fall back to the gradient
   *  placeholder. Length is capped at the include-take in
   *  dashboard2-data.ts (currently 6). */
  contributorAvatars: Array<{
    name: string | null;
    avatarUrl: string | null;
  }>;
  coverUrl: string | null;
  status: "DRAFT" | "ACTIVE" | "SEALED" | "SENT" | "REVEALED";
  /** ISO timestamp when the organiser archived the capsule. Null
   *  on active rows; non-null on the archived list. Lets the
   *  Archived view sort by archivedAt without an extra fetch. */
  archivedAt: string | null;
  /** ISO timestamp of the capsule's reveal day. The archived
   *  modal sorts by this so the most-recent reveals surface
   *  first; also displayed inline on each archived row. */
  revealDate: string;
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
        <AvatarRow
          total={capsule.contributorCount}
          contributors={capsule.contributorAvatars}
        />
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {capsule.newCount > 0 && (
          <span className="text-[12px] font-semibold text-amber border border-amber/40 rounded-full px-2.5 py-1">
            {capsule.newCount} new
          </span>
        )}
        <ChevronRight size={18} strokeWidth={1.75} className="text-ink-light" />
      </div>

      <StatusPill status={capsule.status} />
    </Link>
  );
}

const STATUS_STYLES: Record<
  GiftCapsuleCreatingData["status"],
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "text-ink-mid bg-[#f1f5f9] border-navy/[0.08]",
  },
  ACTIVE: {
    label: "Active",
    className: "text-amber-dark bg-amber-tint border-amber/30",
  },
  SEALED: {
    label: "Sealed",
    className: "text-gold bg-gold-tint border-gold/30",
  },
  SENT: {
    label: "Sent",
    className: "text-amber-dark bg-amber/15 border-amber/40",
  },
  REVEALED: {
    label: "Revealed",
    className: "text-green-700 bg-green-50 border-green-200",
  },
};

function StatusPill({
  status,
}: {
  status: GiftCapsuleCreatingData["status"];
}) {
  const { label, className } = STATUS_STYLES[status];
  return (
    <span
      className={`absolute bottom-2.5 right-3 text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded-full border ${className}`}
    >
      {label}
    </span>
  );
}

/**
 * Avatar row: up to three avatars from the invite list. Real
 * profile photos render for invitees who've signed up to
 * untilThen (via User.email match in dashboard2-data.ts);
 * everyone else falls back to a coloured initials/icon
 * placeholder. Trailing "+N" counter when there are more
 * contributors than visible slots, and a dashed "+" affordance
 * for the invite-more pattern.
 */
function AvatarRow({
  total,
  contributors,
}: {
  total: number;
  contributors: Array<{ name: string | null; avatarUrl: string | null }>;
}) {
  const visible = contributors.slice(0, 3);
  // Pad with placeholders if the invite list has fewer than 3
  // entries so the row keeps a consistent shape.
  const placeholderCount = Math.max(0, 3 - visible.length);
  const extra = Math.max(0, total - 3);
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <div className="flex items-center -space-x-1.5">
        {visible.map((c, i) => (
          <ContributorAvatar
            key={i}
            index={i}
            name={c.name}
            avatarUrl={c.avatarUrl}
          />
        ))}
        {Array.from({ length: placeholderCount }).map((_, i) => (
          <DefaultAvatar key={`p-${i}`} index={visible.length + i} />
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

function ContributorAvatar({
  index,
  name,
  avatarUrl,
}: {
  index: number;
  name: string | null;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name ?? "Contributor"}
        className="w-6 h-6 rounded-full border-2 border-white object-cover"
      />
    );
  }
  // No real avatar — fall back to initials on the coloured chip.
  const initial = (name ?? "").trim().charAt(0).toUpperCase();
  const bg = AVATAR_BGS[index % AVATAR_BGS.length];
  return (
    <span
      className={`w-6 h-6 rounded-full border-2 border-white ${bg} flex items-center justify-center text-white text-[10px] font-semibold`}
    >
      {initial || <User size={12} strokeWidth={2} />}
    </span>
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
