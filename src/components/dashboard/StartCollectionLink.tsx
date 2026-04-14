"use client";

import { Library } from "lucide-react";
import { useState } from "react";

import { CreateCollectionModal } from "@/components/dashboard/CreateCollectionModal";

/**
 * Quiet secondary CTA for creating a new collection. The "New"
 * dropdown that used to sit here was redundant once the editor
 * spark at the top of the dashboard became the default writing
 * surface — collections are the one remaining creation path that
 * still needs its own trigger.
 */
export function StartCollectionLink({
  vaultId,
  vaultRevealDate,
  childFirstName,
  childDateOfBirth,
}: {
  vaultId: string;
  vaultRevealDate: string | null;
  childFirstName: string;
  childDateOfBirth: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] font-bold text-amber hover:text-navy transition-colors"
      >
        <Library size={14} strokeWidth={1.75} aria-hidden="true" />
        Start a collection
      </button>
      {open && (
        <CreateCollectionModal
          vaultId={vaultId}
          vaultRevealDate={vaultRevealDate}
          childFirstName={childFirstName}
          childDateOfBirth={childDateOfBirth}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
