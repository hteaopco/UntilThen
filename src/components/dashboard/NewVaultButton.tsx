"use client";

import { PlusCircle } from "lucide-react";
import { useState } from "react";

import { AddChildModal } from "@/components/account/AddChildModal";

/**
 * "New vault" CTA for the dashboard vaults column. Opens
 * AddChildModal inline — the old approach of linking to
 * /onboarding?add=vault short-circuited back to /dashboard for
 * users who already had one vault, so the button appeared broken.
 *
 * Two style variants:
 * - "outline": the footer-pill CTA under the existing vault list.
 * - "primary": the amber fill CTA used inside the empty-state card
 *   when the user has zero vaults.
 */
export function NewVaultButton({
  variant = "outline",
  label = "New Time Capsule",
}: {
  variant?: "outline" | "primary";
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  const className =
    variant === "primary"
      ? "mt-4 inline-flex items-center gap-2 bg-amber text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
      : "mt-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-amber/40 text-amber text-sm font-bold hover:bg-amber-tint transition-colors";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <PlusCircle size={14} strokeWidth={1.75} aria-hidden="true" />
        {label}
      </button>
      {open && <AddChildModal onClose={() => setOpen(false)} />}
    </>
  );
}
