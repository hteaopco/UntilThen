import Link from "next/link";
import {
  AudioLines,
  Calendar,
  FileText,
  Image as ImageIcon,
  Pencil,
  Video,
} from "lucide-react";

import { formatLong } from "@/lib/dateFormatters";
import type { CollectionRow } from "@/lib/capsule-landing-data";

type Props = {
  collection: CollectionRow;
  age: number | null;
};

/**
 * Single row for the "Olivia's Capsules" list. Cover (or gradient
 * placeholder) on the left, title + description + stats in the middle,
 * reveal date + computed age on the right, and a pencil edit button at
 * the far right.
 *
 * Clicking anywhere in the main body navigates to the collection
 * detail; the pencil is a sibling link to the edit flow so the two
 * actions don't conflict.
 */
export function CollectionCard({ collection, age }: Props) {
  const status = collection.isSealed ? "Sealed" : "Upcoming";
  const statusStyle = collection.isSealed
    ? "text-gold bg-gold-tint"
    : "text-amber bg-amber-tint";
  const { photos, videos, letters, voices } = collection.stats;
  const hasDate = !!collection.revealDate;

  return (
    <div className="relative rounded-2xl border border-amber/25 bg-white shadow-[0_4px_14px_-6px_rgba(196,122,58,0.15)] hover:border-amber/45 transition-colors">
      <Link
        href={`/dashboard/collection/${collection.id}`}
        prefetch={false}
        className="flex flex-col sm:flex-row items-stretch"
      >
        <div className="shrink-0 w-full sm:w-[120px] md:w-[140px] aspect-[4/3] sm:aspect-auto sm:self-stretch rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none overflow-hidden bg-gradient-to-br from-amber/20 via-cream to-gold/20">
          {collection.coverUrl ? (
            <img
              src={collection.coverUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <CollectionPlaceholder seed={collection.title} />
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-3 sm:gap-6 p-4 sm:p-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[17px] sm:text-[19px] font-bold text-navy tracking-[-0.2px] leading-tight">
                {collection.title}
              </h3>
              <span
                className={`text-[10px] uppercase tracking-[0.08em] font-bold px-2 py-0.5 rounded-full ${statusStyle}`}
              >
                {status}
              </span>
            </div>
            {collection.description && (
              <p className="mt-1 text-[13px] sm:text-[14px] text-ink-mid leading-[1.45]">
                {collection.description}
              </p>
            )}
            <div className="mt-3 flex items-center gap-4 text-ink-light">
              <Stat icon={<ImageIcon size={15} strokeWidth={1.75} />} count={photos} />
              <Stat icon={<Video size={15} strokeWidth={1.75} />} count={videos} />
              <Stat icon={<FileText size={15} strokeWidth={1.75} />} count={letters} />
              <Stat icon={<AudioLines size={15} strokeWidth={1.75} />} count={voices} />
            </div>
          </div>

          <div className="shrink-0 sm:w-[160px] sm:border-l sm:border-navy/[0.06] sm:pl-5 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-light">
              <Calendar size={12} strokeWidth={1.75} aria-hidden="true" />
              To be opened on
            </div>
            {hasDate ? (
              <>
                <div className="mt-1 text-[15px] font-bold text-navy">
                  {formatLong(collection.revealDate!.toISOString())}
                </div>
                {age !== null && (
                  <div className="text-[12px] text-ink-mid">(Age {age})</div>
                )}
              </>
            ) : (
              <div className="mt-1 text-[15px] font-bold text-navy">Choose a date</div>
            )}
          </div>
        </div>
      </Link>

      <Link
        href={`/dashboard/collection/${collection.id}`}
        prefetch={false}
        aria-label={`Edit ${collection.title}`}
        className="absolute right-3 top-3 sm:right-5 sm:top-1/2 sm:-translate-y-1/2 flex flex-col items-center gap-1 text-ink-mid hover:text-amber transition-colors"
      >
        <span className="w-9 h-9 rounded-full border border-navy/10 bg-white flex items-center justify-center">
          <Pencil size={14} strokeWidth={1.75} />
        </span>
        <span className="hidden sm:block text-[11px] font-semibold">Edit</span>
      </Link>
    </div>
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
