"use client";

import { useState } from "react";
import { Layers, Pencil, ShoppingBag } from "lucide-react";

import { CoverUploader } from "@/components/dashboard2/CoverUploader";

type Props = {
  vaultId: string;
  childFirstName: string;
  vaultCoverUrl: string | null;
};

/**
 * Top-of-page hero for the capsule landing.
 *
 * Mobile (<sm): two-column row — a 120px square cover on the left
 *   paired with a flex-1 right column that holds a right-aligned
 *   Alex Brush "{Child}'s Time Capsule ♡" title (wraps to two
 *   lines) followed by the two toggle buttons stacked vertically.
 *
 * Desktop (sm+): horizontal hero — 260–300px cover on the left,
 *   serif title + description + toggle row on the right.
 *
 * The pencil on the cover opens the shared CoverUploader modal.
 */
export function CapsuleHero({
  vaultId,
  childFirstName,
  vaultCoverUrl,
}: Props) {
  const [uploaderOpen, setUploaderOpen] = useState(false);

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
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <h1 className="font-brush text-[26px] leading-[1.05] text-navy text-right">
            {childFirstName}&rsquo;s
            <br />
            Time Capsule <span className="text-amber">♡</span>
          </h1>
          <FloatingToggles compact />
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
          <div className="mt-5">
            <FloatingToggles />
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

function FloatingToggles({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`grid ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"} gap-2 sm:gap-3`}
    >
      <ToggleCard
        icon={<ShoppingBag size={compact ? 18 : 22} strokeWidth={1.75} />}
        title="Create One Collection"
        body="A single collection to be opened on a special day."
        compact={compact}
      />
      <ToggleCard
        icon={<Layers size={compact ? 18 : 22} strokeWidth={1.75} />}
        title="Create Multiple Collections"
        body="Organize by milestones, years, or special moments."
        compact={compact}
      />
    </div>
  );
}

function ToggleCard({
  icon,
  title,
  body,
  compact,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  compact: boolean;
}) {
  return (
    <button
      type="button"
      className={`flex items-start gap-2.5 rounded-2xl bg-white border border-amber/20 shadow-[0_4px_14px_-6px_rgba(196,122,58,0.15)] text-left hover:border-amber/40 hover:shadow-[0_6px_18px_-6px_rgba(196,122,58,0.25)] transition-all ${
        compact ? "px-3 py-2.5" : "px-4 py-3 gap-3"
      }`}
    >
      <span
        aria-hidden="true"
        className={`shrink-0 rounded-xl bg-amber-tint text-amber flex items-center justify-center ${
          compact ? "w-9 h-9" : "w-11 h-11"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div
          className={`font-bold text-navy tracking-[-0.2px] leading-tight ${
            compact ? "text-[12px]" : "text-[14px]"
          }`}
        >
          {title}
        </div>
        <div
          className={`text-ink-mid leading-[1.35] mt-0.5 ${
            compact ? "text-[10px]" : "text-[12px]"
          }`}
        >
          {body}
        </div>
      </div>
    </button>
  );
}
