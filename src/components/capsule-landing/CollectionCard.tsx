import Link from "next/link";
import {
  AudioLines,
  BookHeart,
  FileText,
  Image as ImageIcon,
  Pencil,
  Plus,
  Sparkles,
  Video,
} from "lucide-react";

import { formatLong } from "@/lib/dateFormatters";
import type { CollectionRow } from "@/lib/capsule-landing-data";

type Props = {
  childId: string;
  collection: CollectionRow;
  age: number | null;
};

/**
 * Collection row for the vault landing. Mirrors the silhouette of the
 * dashboard's GiftCapsuleCreatingCard: offset sparkles badge in the
 * top-left corner, small square cover thumbnail, and a stacked
 * title / open date / stat icons column in the middle. Two action
 * buttons (Edit + New) sit on the right.
 *
 * The synthetic Main Capsule Diary row skips the Edit button (there's
 * nothing to edit on a virtual row) and routes its title/body area
 * to the diary list view instead of the collection detail.
 */
export function CollectionCard({ childId, collection, age }: Props) {
  const { photos, videos, letters, voices } = collection.stats;
  const hasDate = !!collection.revealDate;
  const detailHref = collection.isMainDiary
    ? `/vault/${childId}/diary`
    : `/vault/${childId}/collection/${collection.id}`;
  const newHref = collection.isMainDiary
    ? `/vault/${childId}/new`
    : `/vault/${childId}/new?collectionId=${collection.id}`;

  return (
    <div className="relative flex items-center gap-3 sm:gap-4 rounded-2xl bg-white border border-amber/20 shadow-[0_4px_14px_-6px_rgba(196,122,58,0.15)] hover:border-amber/40 transition-colors p-3 sm:p-4">
      <span
        aria-hidden="true"
        className="absolute -left-2 -top-2 w-8 h-8 rounded-full bg-cream border border-amber/20 flex items-center justify-center"
      >
        <Sparkles size={16} strokeWidth={1.75} className="text-amber" />
      </span>

      <Link
        href={detailHref}
        prefetch={false}
        className="shrink-0 w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] rounded-xl overflow-hidden bg-gradient-to-br from-amber/20 via-cream to-gold/20 border border-amber/10"
        aria-label={`Open ${collection.title}`}
      >
        {collection.coverUrl ? (
          <img
            src={collection.coverUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : collection.isMainDiary ? (
          <MainDiaryPlaceholder />
        ) : (
          <CollectionPlaceholder seed={collection.title} />
        )}
      </Link>

      <Link
        href={detailHref}
        prefetch={false}
        className="flex-1 min-w-0"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-[15px] sm:text-[17px] font-bold text-navy tracking-[-0.2px] leading-tight truncate">
            {collection.title}
          </h3>
          <StatusPill collection={collection} />
        </div>
        <p className="mt-0.5 text-[12px] sm:text-[13px] text-ink-light leading-tight">
          {hasDate ? (
            <>
              Opens {formatLong(collection.revealDate!.toISOString())}
              {age !== null && (
                <span className="text-ink-light/70"> (Age {age})</span>
              )}
            </>
          ) : (
            "Choose a date"
          )}
        </p>
        <div className="mt-1.5 flex items-center gap-3 sm:gap-4 text-ink-light">
          <Stat icon={<FileText size={14} strokeWidth={1.75} />} count={letters} />
          <Stat icon={<ImageIcon size={14} strokeWidth={1.75} />} count={photos} />
          <Stat icon={<Video size={14} strokeWidth={1.75} />} count={videos} />
          <Stat icon={<AudioLines size={14} strokeWidth={1.75} />} count={voices} />
        </div>
      </Link>

      <div className="shrink-0 flex flex-col gap-1.5">
        {!collection.isMainDiary && (
          <Link
            href={`/vault/${childId}/collection/${collection.id}`}
            prefetch={false}
            aria-label={`Edit ${collection.title}`}
            className="w-9 h-9 rounded-full border border-navy/10 bg-white text-ink-mid hover:text-amber hover:border-amber/40 transition-colors flex items-center justify-center"
          >
            <Pencil size={14} strokeWidth={1.75} />
          </Link>
        )}
        <Link
          href={newHref}
          prefetch={false}
          aria-label={`Add a new memory to ${collection.title}`}
          className="w-9 h-9 rounded-full bg-amber-tint border border-amber/40 text-amber hover:bg-amber hover:text-white transition-colors flex items-center justify-center"
        >
          <Plus size={15} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}

function StatusPill({ collection }: { collection: CollectionRow }) {
  if (collection.isMainDiary) {
    return (
      <span className="text-[9px] uppercase tracking-[0.08em] font-bold px-1.5 py-0.5 rounded-full text-amber bg-amber-tint">
        Diary
      </span>
    );
  }
  const status = collection.isSealed ? "Sealed" : "Upcoming";
  const statusStyle = collection.isSealed
    ? "text-gold bg-gold-tint"
    : "text-amber bg-amber-tint";
  return (
    <span
      className={`text-[9px] uppercase tracking-[0.08em] font-bold px-1.5 py-0.5 rounded-full ${statusStyle}`}
    >
      {status}
    </span>
  );
}

function Stat({ icon, count }: { icon: React.ReactNode; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[12px] font-medium">
      <span aria-hidden="true">{icon}</span>
      <span>{count}</span>
    </span>
  );
}

const COLLECTION_GRADIENTS = [
  "from-amber/30 via-cream to-gold/25",
  "from-gold/30 via-cream to-sage/20",
  "from-rose-200/40 via-cream to-amber/20",
  "from-sage/25 via-cream to-amber/30",
  "from-amber/25 via-orange-100/40 to-cream",
];

function CollectionPlaceholder({ seed }: { seed: string }) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const gradient = COLLECTION_GRADIENTS[hash % COLLECTION_GRADIENTS.length];
  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient}`} aria-hidden="true" />
  );
}

function MainDiaryPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="w-full h-full bg-gradient-to-br from-amber/30 via-cream to-amber/15 flex items-center justify-center text-amber"
    >
      <BookHeart size={28} strokeWidth={1.5} />
    </div>
  );
}
