"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { CreateCollectionModal } from "@/components/dashboard/CreateCollectionModal";

export function NewButton({
  vaultRevealDate,
}: {
  vaultRevealDate: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (ref.current && target && !ref.current.contains(target)) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors inline-flex items-center gap-2"
        >
          + New
          <span aria-hidden="true" className="text-xs opacity-80">
            ▾
          </span>
        </button>
        {open && (
          <div
            role="menu"
            className="absolute top-11 left-0 lg:left-auto lg:right-0 min-w-[220px] rounded-xl bg-white border border-navy/[0.08] shadow-[0_4px_24px_rgba(15,31,61,0.12)] overflow-hidden z-40"
          >
            <Link
              href="/dashboard/new"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-navy hover:bg-[#f8fafc] transition-colors"
            >
              <span aria-hidden="true" className="text-base">
                ✍️
              </span>
              New entry
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setShowCollectionModal(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-navy hover:bg-[#f8fafc] transition-colors text-left border-t border-navy/[0.06]"
            >
              <span aria-hidden="true" className="text-base">
                📚
              </span>
              New collection
            </button>
          </div>
        )}
      </div>
      {showCollectionModal && (
        <CreateCollectionModal
          vaultRevealDate={vaultRevealDate}
          onClose={() => setShowCollectionModal(false)}
        />
      )}
    </>
  );
}
