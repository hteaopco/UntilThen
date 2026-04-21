"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { CoverUploader } from "@/components/dashboard2/CoverUploader";
import { CreateCollectionModal } from "@/components/capsule-landing/CreateCollectionModal";

type Props = {
  vaultId: string;
  childFirstName: string;
  vaultCoverUrl: string | null;
  vaultRevealDate: string | null;
};

/**
 * Top-of-page hero for the capsule landing.
 *
 * Mobile (<sm): two-column row — a 120px square cover on the left
 *   paired with a flex-1 right column that holds a left-aligned
 *   Alex Brush "{Child}'s Time Capsule ♡" title (wraps to two
 *   lines) with the "Create One Collection" toggle pinned to the
 *   bottom of the column so it lines up with the cover's footer.
 *
 * Desktop (sm+): horizontal hero — 260–300px cover on the left,
 *   serif title + description + single toggle on the right.
 *
 * The pencil on the cover opens the shared CoverUploader modal.
 */
export function CapsuleHero({
  vaultId,
  childFirstName,
  vaultCoverUrl,
  vaultRevealDate,
}: Props) {
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <section>
      {/* Mobile: compact two-column row. */}
      <div className="sm:hidden flex gap-3 items-start">
        <div className="shrink-0 w-[120px]">
          <CapsuleCover
            vaultCoverUrl={vaultCoverUrl}
            onEdit={() => setUploaderOpen(true)}
            childFirstName={childFirstName}
            compact
          />
        </div>
        <div className="flex-1 min-w-0 h-[120px] flex flex-col">
          <h1 className="font-brush text-[31px] leading-[1.02] text-navy text-left">
            {childFirstName}&rsquo;s
            <br />
            Time Capsule <span className="text-amber">♡</span>
          </h1>
          <div className="mt-auto">
            <CreateCollectionCard compact onClick={() => setCreateOpen(true)} />
          </div>
        </div>
      </div>

      {/* Desktop: horizontal hero. */}
      <div className="hidden sm:flex gap-8 items-start">
        <div className="shrink-0 w-[260px] md:w-[300px]">
          <CapsuleCover
            vaultCoverUrl={vaultCoverUrl}
            onEdit={() => setUploaderOpen(true)}
            childFirstName={childFirstName}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[40px] md:text-[44px] font-extrabold text-navy tracking-[-0.5px] leading-[1.08]">
            {childFirstName}&rsquo;s
            <br />
            Time Capsule{" "}
            <span className="font-brush text-amber align-baseline">♡</span>
          </h1>
          <p className="mt-3 text-[16px] text-ink-mid leading-[1.5] max-w-[420px]">
            Capture the moments, memories and milestones that make{" "}
            {childFirstName}, {childFirstName}.
          </p>
          <div className="mt-5 max-w-[380px]">
            <CreateCollectionCard compact={false} onClick={() => setCreateOpen(true)} />
          </div>
        </div>
      </div>

      {uploaderOpen && (
        <CoverUploader
          vaultId={vaultId}
          childFirstName={childFirstName}
          currentCoverUrl={vaultCoverUrl}
          onClose={() => setUploaderOpen(false)}
        />
      )}

      {createOpen && (
        <CreateCollectionModal
          vaultId={vaultId}
          vaultRevealDate={vaultRevealDate}
          childFirstName={childFirstName}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </section>
  );
}

function CapsuleCover({
  vaultCoverUrl,
  onEdit,
  childFirstName,
  compact = false,
}: {
  vaultCoverUrl: string | null;
  onEdit: () => void;
  childFirstName: string;
  compact?: boolean;
}) {
  const pencilSize = compact ? "w-7 h-7" : "w-9 h-9";
  const pencilIconPx = compact ? 13 : 15;
  const pencilOffset = compact ? "top-2 right-2" : "top-3 right-3";
  return (
    <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-amber/60 shadow-[0_8px_24px_-8px_rgba(196,122,58,0.2)] bg-white">
      {vaultCoverUrl ? (
        <img
          src={vaultCoverUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-br from-amber/25 via-cream to-gold/20"
        />
      )}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${childFirstName}'s cover photo`}
        className={`absolute ${pencilOffset} ${pencilSize} rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-[0_2px_8px_rgba(15,31,61,0.15)] text-amber hover:bg-white hover:scale-105 transition-all`}
      >
        <Pencil size={pencilIconPx} strokeWidth={2} />
      </button>
    </div>
  );
}

function CreateCollectionCard({
  compact,
  onClick,
}: {
  compact: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 rounded-full bg-white border border-amber/30 shadow-[0_4px_14px_-6px_rgba(196,122,58,0.15)] hover:border-amber/50 hover:shadow-[0_6px_18px_-6px_rgba(196,122,58,0.25)] transition-all ${
        compact ? "pl-4 pr-1.5 py-1.5" : "pl-5 pr-2 py-2"
      }`}
    >
      <span
        className={`font-bold text-navy tracking-[-0.2px] leading-tight truncate ${
          compact ? "text-[12px]" : "text-[14px]"
        }`}
      >
        Create New Collection
      </span>
      <span
        aria-hidden="true"
        className={`shrink-0 rounded-full bg-amber-tint text-amber flex items-center justify-center ${
          compact ? "w-7 h-7" : "w-9 h-9"
        }`}
      >
        <Plus size={compact ? 16 : 18} strokeWidth={2} />
      </span>
    </button>
  );
}
