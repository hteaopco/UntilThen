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
 * Top-of-page hero for the capsule landing. Two layouts behind a
 * responsive breakpoint:
 *
 * Mobile (<sm): title now lives in a dedicated band in the page
 *   chrome above this component, so the hero here is just the two
 *   floating toggle cards stacked over the cover image.
 *
 * Desktop (sm+): full hero — cover on the left, title +
 *   description + toggle stacked on the right.
 *
 * The pencil in the cover's top-right opens the reusable
 * CoverUploader modal (4:3 crop + pan + zoom + R2 upload + patch).
 */
export function CapsuleHero({
  vaultId,
  childFirstName,
  vaultCoverUrl,
}: Props) {
  const [uploaderOpen, setUploaderOpen] = useState(false);

  return (
    <section>
      {/* Mobile: floating toggle cards first, then cover. */}
      <div className="sm:hidden space-y-5">
        <FloatingToggles />
        <CapsuleCover
          vaultCoverUrl={vaultCoverUrl}
          onEdit={() => setUploaderOpen(true)}
          childFirstName={childFirstName}
        />
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
}: {
  vaultCoverUrl: string | null;
  onEdit: () => void;
  childFirstName: string;
}) {
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
        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-[0_2px_8px_rgba(15,31,61,0.15)] text-amber hover:bg-white hover:scale-105 transition-all"
      >
        <Pencil size={15} strokeWidth={2} />
      </button>
    </div>
  );
}

function FloatingToggles() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <ToggleCard
        icon={<ShoppingBag size={22} strokeWidth={1.75} />}
        title="Create One Collection"
        body="A single collection to be opened on a special day."
      />
      <ToggleCard
        icon={<Layers size={22} strokeWidth={1.75} />}
        title="Create Multiple Collections"
        body="Organize by milestones, years, or special moments."
      />
    </div>
  );
}

function ToggleCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      className="flex items-start gap-3 rounded-2xl bg-white border border-amber/20 shadow-[0_4px_14px_-6px_rgba(196,122,58,0.15)] px-4 py-3 text-left hover:border-amber/40 hover:shadow-[0_6px_18px_-6px_rgba(196,122,58,0.25)] transition-all"
    >
      <span
        aria-hidden="true"
        className="shrink-0 w-11 h-11 rounded-xl bg-amber-tint text-amber flex items-center justify-center"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[14px] font-bold text-navy tracking-[-0.2px]">
          {title}
        </div>
        <div className="text-[12px] text-ink-mid leading-[1.4] mt-0.5">
          {body}
        </div>
      </div>
    </button>
  );
}
