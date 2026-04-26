"use client";

import { Maximize2, X } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  src: string;
  alt: string;
  /** Caption rendered as a subtle hint below the thumbnail and
   *  used as the lightbox alt text. */
  caption?: string;
};

/**
 * Marketing flyer that expands to a full-screen lightbox on tap.
 * Used on /weddings + /business below the hero. The thumbnail
 * keeps its natural aspect ratio so portrait flyers don't get
 * cropped; the lightbox uses object-contain so the entire flyer
 * is legible at full size.
 *
 * Lightbox dismissal: ESC key, backdrop tap, or the close
 * button. Body scroll is locked while the lightbox is open so
 * iOS Safari doesn't bounce the underlying page.
 */
export function ExpandableFlyer({ src, alt, caption }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Expand ${alt}`}
        className="group relative block w-full max-w-[640px] mx-auto rounded-2xl overflow-hidden bg-white border border-navy/[0.08] shadow-[0_18px_44px_-16px_rgba(15,31,61,0.22)] hover:shadow-[0_24px_56px_-16px_rgba(15,31,61,0.28)] transition-shadow"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="w-full h-auto block select-none transition-transform duration-300 group-hover:scale-[1.01]"
          loading="lazy"
        />
        <span className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-navy/85 text-white text-[11px] font-bold backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 size={12} strokeWidth={2.25} aria-hidden="true" />
          Tap to expand
        </span>
      </button>
      {caption && (
        <p className="mt-3 text-center text-[12px] italic text-navy/55">
          {caption}
        </p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-navy/85 backdrop-blur-sm p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/95 text-navy flex items-center justify-center shadow-lg hover:bg-white transition-colors"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl select-none"
          />
        </div>
      )}
    </>
  );
}
