"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AudioLines,
  BookHeart,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  Pencil,
  Video,
} from "lucide-react";

import { CoverUploader } from "@/components/dashboard2/CoverUploader";
import { DeleteCollectionModal } from "@/components/capsule-landing/DeleteCollectionModal";
import { EditCollectionDetailsModal } from "@/components/capsule-landing/EditCollectionDetailsModal";
import { AddMemoryButton } from "@/components/paywall/AddMemoryButton";
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
   * render dimmed + non-interactive since there's no underlying row
   * to PATCH. Real collections pass false and get functional pills. */
  isDiary: boolean;
  /** Href the "+" FAB routes to — deep-links the editor with the
   * right collectionId pre-selected. */
  addMemoryHref: string;
  childFirstName: string;
  entries: CollectionLandingEntry[];
  /** Identifier for the editable row. Required when isDiary is false. */
  collectionId?: string;
  /** Used to route back to the vault after a successful delete, and
   * for the "Main Capsule Diary" destination in the move-entries
   * option inside DeleteCollectionModal. */
  childId?: string;
  /** Needed by the modals — they clamp the picker to ≤ vault date. */
  vaultRevealDate?: string | null;
  /** Raw reveal date (ISO) so the edit modal can pre-populate. */
  collectionRevealDate?: string | null;
  /** Other collections on the same vault. DeleteCollectionModal
   * offers these as targets in the "move entries to…" dropdown. */
  siblingCollections?: { id: string; title: string }[];
  /** Paywall plumbing — when false, the + FAB opens a
   * SubscriptionPromptModal instead of routing to the editor. */
  hasWriteAccess: boolean;
  squareApplicationId: string;
  squareLocationId: string;
};

/**
 * Shared landing view for any collection-shaped page — the synthetic
 * Main Capsule Diary and every real Collection share this layout so
 * UI edits live in a single component.
 *
 * Edit pills are wired for real collections: "Edit Details" opens
 * EditCollectionDetailsModal (PATCH name/description/revealDate) and
 * "Edit Cover Photo" opens the shared CoverUploader with target=
 * "collection". The Main Diary renders them dimmed since there's no
 * row to edit.
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
  collectionId,
  childId,
  vaultRevealDate = null,
  collectionRevealDate = null,
  siblingCollections = [],
  hasWriteAccess,
  squareApplicationId,
  squareLocationId,
}: CollectionLandingProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canEdit = !isDiary && Boolean(collectionId);

  // Effective reveal date for entries on this surface. Collection
  // entries inherit the collection's reveal date when set; Main
  // Diary entries (or collection entries without an override) use
  // the vault's reveal date. The detail view uses this to decide
  // whether to show the Edit button — past-reveal entries become
  // read-only there, but rows on this surface are still tappable
  // so the parent can re-read anything they've written.
  const effectiveRevealDate = collectionRevealDate ?? vaultRevealDate ?? null;
  const pastReveal = Boolean(
    effectiveRevealDate && new Date(effectiveRevealDate).getTime() <= Date.now(),
  );
  const canTapEntries = Boolean(childId);

  return (
    <>
      <section className="mx-auto max-w-[720px] px-6 pt-6">
        <div className="mt-3 flex items-start justify-between gap-4">
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
          {/* Right column: cover stacked above the Edit Details pill.
              Pencil overlays the cover's top-right corner (real
              collections only) and opens the cover-only uploader
              directly. */}
          <div className="shrink-0 w-[110px] sm:w-[140px] flex flex-col gap-2">
            <div className="relative aspect-square rounded-2xl overflow-hidden border border-amber/30 bg-gradient-to-br from-amber/30 via-cream to-amber/15 flex items-center justify-center text-amber">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <BookHeart size={36} strokeWidth={1.5} aria-hidden="true" />
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setCoverOpen(true)}
                  aria-label="Edit cover photo"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-[0_2px_8px_rgba(15,31,61,0.15)] text-amber hover:bg-white hover:scale-105 transition-all"
                >
                  <Pencil size={13} strokeWidth={2} />
                </button>
              )}
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-navy/10 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-ink-mid hover:text-amber hover:border-amber/40 transition-colors"
              >
                <Pencil size={12} strokeWidth={1.75} />
                Edit Details
              </button>
            )}
          </div>
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
                  <EntryRow
                    {...e}
                    detailHref={
                      canTapEntries && childId
                        ? `/vault/${childId}/entry/${encodeURIComponent(e.id)}`
                        : null
                    }
                    pastReveal={pastReveal}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Subtle destructive affordance. Real collections only —
            the Main Capsule Diary can't be deleted. */}
        {canEdit && (
          <div className="mt-16 mb-4 text-center">
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="text-[12px] text-ink-light/70 hover:text-red-600 transition-colors"
            >
              Delete collection
            </button>
          </div>
        )}
      </section>

      {/* Floating add-memory FAB, bottom-right. */}
      <AddMemoryButton
        href={addMemoryHref}
        hasWriteAccess={hasWriteAccess}
        squareApplicationId={squareApplicationId}
        squareLocationId={squareLocationId}
        ariaLabel="Add a new memory"
        size="fab"
      />

      {canEdit && detailsOpen && collectionId && (
        <EditCollectionDetailsModal
          collectionId={collectionId}
          vaultRevealDate={vaultRevealDate}
          initial={{
            title,
            description,
            revealDate: collectionRevealDate,
            coverUrl,
          }}
          onClose={() => setDetailsOpen(false)}
        />
      )}

      {canEdit && coverOpen && collectionId && (
        <CoverUploader
          target="collection"
          targetId={collectionId}
          childFirstName={childFirstName}
          currentCoverUrl={coverUrl}
          onClose={() => setCoverOpen(false)}
        />
      )}

      {canEdit && deleteOpen && collectionId && childId && (
        <DeleteCollectionModal
          collectionId={collectionId}
          collectionTitle={title}
          childId={childId}
          entryCount={entries.length}
          siblings={siblingCollections}
          onClose={() => setDeleteOpen(false)}
        />
      )}
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
  detailHref,
  pastReveal,
}: CollectionLandingEntry & {
  detailHref: string | null;
  pastReveal: boolean;
}) {
  const snippet = (body ?? "").replace(/<[^>]*>/g, "").trim();
  const headline = title?.trim() || snippet.slice(0, 80) || "Untitled memory";
  const preview =
    title && snippet ? snippet.slice(0, 120) : !title ? snippet.slice(80, 200) : "";

  const hasPhoto = type === "PHOTO" || mediaTypes.includes("photo");
  const hasVideo = type === "VIDEO" || mediaTypes.includes("video");
  const hasVoice = type === "VOICE" || mediaTypes.includes("voice");
  const isLetter = type === "TEXT" && !hasPhoto && !hasVoice && !hasVideo;

  const cardClass =
    "block rounded-2xl border border-amber/20 bg-white shadow-[0_2px_10px_rgba(196,122,58,0.05)] p-4 sm:p-5";
  const hoverClass = detailHref
    ? " hover:border-amber/40 hover:shadow-[0_4px_14px_rgba(196,122,58,0.08)] transition-all group"
    : "";

  // On-hover affordance: pre-reveal rows hint at "Read or edit";
  // post-reveal rows hint at "Read" only. Desktop only — mobile
  // users just tap the row.
  const hoverLabel = pastReveal ? "Read" : "Read or edit";

  const innerContent = (
    <>
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[15px] sm:text-[16px] font-bold text-navy tracking-[-0.2px] leading-tight truncate">
          {headline}
        </h2>
        <div className="shrink-0 flex items-center gap-2">
          {detailHref && (
            <span
              aria-hidden="true"
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-amber/0 group-hover:text-amber transition-colors"
            >
              {pastReveal ? null : <Pencil size={11} strokeWidth={2} />}
              {hoverLabel}
            </span>
          )}
          <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-light">
            {formatLong(createdAt)}
          </span>
        </div>
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
    </>
  );

  if (detailHref) {
    return (
      <Link href={detailHref} prefetch={false} className={cardClass + hoverClass}>
        {innerContent}
      </Link>
    );
  }
  return <article className={cardClass}>{innerContent}</article>;
}

function TypeBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium">
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
