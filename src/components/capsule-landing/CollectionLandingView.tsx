import Link from "next/link";
import {
  AudioLines,
  BookHeart,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  Pencil,
  Plus,
  Video,
} from "lucide-react";

import { formatLong } from "@/lib/dateFormatters";

export type CollectionLandingEntry = {
  id: string;
  title: string | null;
  body: string | null;
  type: string;
  mediaTypes: string[];
  createdAt: string;
};

export type CollectionLandingProps = {
  title: string;
  description: string | null;
  coverUrl: string | null;
  /** Optional — renders below the description ("Opens June 14, 2032 · Age 18"). */
  revealLine: string | null;
  /** If true, this is the synthetic Main Capsule Diary — edit pills
   * remain visible but non-functional since there's no underlying
   * Collection row. Real collections pass false. */
  isDiary: boolean;
  /** Href the "+" FAB routes to — deep-links the editor with the
   * right collectionId pre-selected. */
  addMemoryHref: string;
  childFirstName: string;
  entries: CollectionLandingEntry[];
};

/**
 * Shared landing view for any collection-shaped page — the synthetic
 * Main Capsule Diary and every real Collection share this layout so
 * UI edits live in a single component. Consumers (server pages) are
 * responsible for auth / ownership + loading the entries list.
 */
export function CollectionLandingView({
  title,
  description,
  coverUrl,
  revealLine,
  isDiary,
  addMemoryHref,
  childFirstName,
  entries,
}: CollectionLandingProps) {
  return (
    <>
      <section className="mx-auto max-w-[720px] px-6 pt-6">
        <div className="mt-3 flex items-stretch justify-between gap-4">
          <div className="flex-1 min-w-0 flex flex-col">
            <h1 className="text-[26px] sm:text-[32px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-[13px] sm:text-[14px] text-ink-mid">
                {description}
              </p>
            )}
            {revealLine && (
              <p className="mt-2 text-[12px] sm:text-[13px] italic text-ink-light">
                {revealLine}
              </p>
            )}
          </div>
          <div className="shrink-0 w-[110px] sm:w-[140px] aspect-square rounded-2xl overflow-hidden border border-amber/30 bg-gradient-to-br from-amber/30 via-cream to-amber/15 flex items-center justify-center text-amber">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <BookHeart size={36} strokeWidth={1.5} aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Action pills under the header — identical treatment on
            diary and real collections. Wiring to the edit modals is
            a follow-up; the labels keep the pattern in place. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-navy/10 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-mid hover:text-amber hover:border-amber/40 transition-colors"
          >
            <Pencil size={13} strokeWidth={1.75} />
            Edit Details
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-navy/10 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-mid hover:text-amber hover:border-amber/40 transition-colors"
          >
            <ImagePlus size={13} strokeWidth={1.75} />
            Edit Cover Photo
          </button>
        </div>

        <div className="mt-6">
          {entries.length === 0 ? (
            <EmptyState
              childFirstName={childFirstName}
              isDiary={isDiary}
            />
          ) : (
            <ul className="space-y-3">
              {entries.map((e) => (
                <li key={e.id}>
                  <EntryRow {...e} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Floating add-memory FAB, bottom-right. */}
      <Link
        href={addMemoryHref}
        prefetch={false}
        aria-label="Add a new memory"
        className="fixed bottom-6 right-6 z-30 w-[105px] h-[105px] rounded-full bg-white border border-amber/40 text-amber flex items-center justify-center shadow-[0_10px_32px_-8px_rgba(196,122,58,0.3)] hover:bg-amber-tint/60 hover:border-amber/60 transition-colors"
      >
        <Plus size={45} strokeWidth={1.75} />
      </Link>
    </>
  );
}

function EmptyState({
  childFirstName,
  isDiary,
}: {
  childFirstName: string;
  isDiary: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-navy/10 bg-white/60 px-6 py-10 text-center">
      <p className="text-[14px] text-ink-mid leading-[1.5]">
        {isDiary
          ? "Nothing in the diary yet. Tap the + to seal your first entry here."
          : `Nothing here yet. Tap the + to write the first memory ${childFirstName} will read one day.`}
      </p>
    </div>
  );
}

function EntryRow({
  title,
  body,
  type,
  mediaTypes,
  createdAt,
}: CollectionLandingEntry) {
  const snippet = (body ?? "").replace(/<[^>]*>/g, "").trim();
  const headline = title?.trim() || snippet.slice(0, 80) || "Untitled memory";
  const preview =
    title && snippet ? snippet.slice(0, 120) : !title ? snippet.slice(80, 200) : "";

  const hasPhoto = type === "PHOTO" || mediaTypes.includes("photo");
  const hasVideo = type === "VIDEO" || mediaTypes.includes("video");
  const hasVoice = type === "VOICE" || mediaTypes.includes("voice");
  const isLetter = type === "TEXT" && !hasPhoto && !hasVoice && !hasVideo;

  return (
    <article className="rounded-2xl border border-amber/20 bg-white shadow-[0_2px_10px_rgba(196,122,58,0.05)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[15px] sm:text-[16px] font-bold text-navy tracking-[-0.2px] leading-tight truncate">
          {headline}
        </h2>
        <span className="shrink-0 text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-light">
          {formatLong(createdAt)}
        </span>
      </div>
      {preview && (
        <p className="mt-1.5 text-[13px] text-ink-mid leading-[1.5] line-clamp-2">
          {preview}
        </p>
      )}
      <div className="mt-3 flex items-center gap-4 text-ink-light">
        {isLetter && <TypeBadge icon={<FileText size={14} strokeWidth={1.75} />} label="Letter" />}
        {hasPhoto && <TypeBadge icon={<ImageIcon size={14} strokeWidth={1.75} />} label="Photo" />}
        {hasVideo && <TypeBadge icon={<Video size={14} strokeWidth={1.75} />} label="Video" />}
        {hasVoice && <TypeBadge icon={<AudioLines size={14} strokeWidth={1.75} />} label="Voice" />}
      </div>
    </article>
  );
}

function TypeBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium">
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
