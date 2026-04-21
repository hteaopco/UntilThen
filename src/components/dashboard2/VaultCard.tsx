"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  ImagePlus,
  Pencil,
  AudioLines,
} from "lucide-react";

import { CoverUploader } from "@/components/dashboard2/CoverUploader";

export type VaultCardData = {
  childId: string;
  vaultId: string;
  firstName: string;
  coverUrl: string | null;
  letterCount: number;
  photoCount: number;
  voiceCount: number;
};

/**
 * Vault card for the dashboard2 "Your Time Capsules" carousel. Three
 * click targets live inside the same visual card:
 *
 *   - Cover image → navigates to the capsule detail (Link)
 *   - Empty "Add Cover Photo" stage (shown when no cover exists) →
 *     opens the upload modal (button)
 *   - Pencil overlay (shown when a cover exists) → opens the upload
 *     modal to replace (button)
 *   - Footer (name + stats) → navigates to the capsule detail (Link)
 *
 * They're siblings rather than nested so the HTML stays valid even
 * with both a primary navigation target and an upload action on the
 * same card.
 */
export function VaultCard({ vault }: { vault: VaultCardData }) {
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const detailHref = `/vault/${vault.childId}`;
  const hasCover = !!vault.coverUrl;

  return (
    <div className="relative snap-start shrink-0 w-[50vw] max-w-[182px] sm:w-[168px] rounded-2xl bg-white border border-amber/60 shadow-[0_8px_24px_-8px_rgba(196,122,58,0.2)] hover:shadow-[0_12px_32px_-8px_rgba(196,122,58,0.3)] transition-shadow overflow-hidden">
      {hasCover ? (
        <Link
          href={detailHref}
          prefetch={false}
          className="relative block aspect-[4/3] sm:aspect-square"
        >
          <img
            src={vault.coverUrl!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => setUploaderOpen(true)}
          aria-label={`Add cover photo for ${vault.firstName}`}
          className="w-full aspect-[4/3] sm:aspect-square bg-white flex flex-col items-center justify-center gap-2 text-amber hover:bg-amber-tint/40 transition-colors"
        >
          <span className="w-12 h-12 rounded-full bg-amber-tint flex items-center justify-center">
            <ImagePlus size={22} strokeWidth={1.75} />
          </span>
          <span className="text-[13px] font-semibold">Add Cover Photo</span>
        </button>
      )}

      <Link
        href={detailHref}
        prefetch={false}
        className="block p-3 border-t border-amber/15 bg-white"
      >
        <h3 className="text-[17px] font-bold text-navy tracking-[-0.3px] leading-tight">
          {vault.firstName}
        </h3>
        <div className="mt-1.5 flex items-center gap-3 text-ink-light">
          <StatPill icon={<FileText size={13} strokeWidth={1.75} />} count={vault.letterCount} />
          <StatPill icon={<ImageIcon size={13} strokeWidth={1.75} />} count={vault.photoCount} />
          <StatPill icon={<AudioLines size={13} strokeWidth={1.75} />} count={vault.voiceCount} />
        </div>
      </Link>

      {hasCover && (
        <button
          type="button"
          onClick={() => setUploaderOpen(true)}
          aria-label={`Edit ${vault.firstName}'s cover photo`}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-[0_2px_8px_rgba(15,31,61,0.15)] text-amber hover:bg-white hover:scale-105 transition-all"
        >
          <Pencil size={12} strokeWidth={2} />
        </button>
      )}

      {uploaderOpen && (
        <CoverUploader
          vaultId={vault.vaultId}
          childFirstName={vault.firstName}
          currentCoverUrl={vault.coverUrl}
          onClose={() => setUploaderOpen(false)}
        />
      )}
    </div>
  );
}

function StatPill({ icon, count }: { icon: React.ReactNode; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium">
      <span aria-hidden="true">{icon}</span>
      <span>{count}</span>
    </span>
  );
}
