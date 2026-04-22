"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { SubscriptionPromptModal } from "@/components/paywall/SubscriptionPromptModal";

/**
 * Client-side "+" gate. Replaces a plain `<Link>` on add-memory
 * affordances (CollectionCard's round + button, CollectionLanding
 * floating FAB). If the user has write access, clicking
 * navigates straight to the editor. If not, we open a
 * SubscriptionPromptModal in place — no context-losing redirect
 * to /account/billing.
 *
 * Intentionally a button, not a link, when gated: screen readers
 * and right-click "Open in new tab" would otherwise sneak past
 * the paywall. The server-side gate in /api/dashboard/entries
 * remains the source of truth.
 */
export function AddMemoryButton({
  href,
  hasWriteAccess,
  squareApplicationId,
  squareLocationId,
  ariaLabel,
  size,
}: {
  href: string;
  hasWriteAccess: boolean;
  squareApplicationId: string;
  squareLocationId: string;
  ariaLabel: string;
  /** "sm" for the per-collection + pill, "fab" for the floating
   *  circle at the bottom of a collection detail. */
  size: "sm" | "fab";
}) {
  const router = useRouter();
  const [promptOpen, setPromptOpen] = useState(false);

  function handleClick() {
    if (hasWriteAccess) {
      router.push(href);
      return;
    }
    setPromptOpen(true);
  }

  function handleSubscribed() {
    setPromptOpen(false);
    router.push(href);
    router.refresh();
  }

  const className =
    size === "fab"
      ? "fixed bottom-6 right-6 z-30 w-[105px] h-[105px] rounded-full bg-white border border-amber/40 text-amber flex items-center justify-center shadow-[0_10px_32px_-8px_rgba(196,122,58,0.3)] hover:bg-amber-tint/60 hover:border-amber/60 transition-colors"
      : "w-9 h-9 rounded-full bg-amber-tint border border-amber/40 text-amber hover:bg-amber hover:text-white transition-colors flex items-center justify-center";
  const iconSize = size === "fab" ? 45 : 15;
  const iconStroke = size === "fab" ? 1.75 : 2;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel}
        className={className}
      >
        <Plus size={iconSize} strokeWidth={iconStroke} />
      </button>
      {promptOpen && (
        <SubscriptionPromptModal
          squareApplicationId={squareApplicationId}
          squareLocationId={squareLocationId}
          onSubscribed={handleSubscribed}
          onClose={() => setPromptOpen(false)}
        />
      )}
    </>
  );
}
