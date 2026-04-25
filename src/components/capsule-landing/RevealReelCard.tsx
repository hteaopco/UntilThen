"use client";

import { Eye, Settings2, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Mode = "RANDOM" | "BUILD";

/**
 * Capsule landing widget for the reveal-reel curation surface.
 *
 * Two stacked controls:
 *   1. Random / Build pill — toggles vault.revealMode. Build adds
 *      a "Customize highlights" link that routes to the curator
 *      page (/vault/[childId]/reveal/curator).
 *   2. Preview the Reveal — secondary button that opens the
 *      organiser's full reveal preview at /vault/[childId]/preview.
 *
 * Saving the mode is optimistic; if the API rejects (rare) the
 * pill snaps back and the error renders inline.
 */
export function RevealReelCard({
  vaultId,
  childId,
  initialMode,
  curatedSlideCount,
}: {
  vaultId: string;
  childId: string;
  initialMode: Mode;
  curatedSlideCount: number;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setRevealMode(next: Mode) {
    if (mode === next || busy) return;
    setMode(next);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/vaults/${vaultId}/reveal`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revealMode: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't save.");
      }
      router.refresh();
    } catch (e) {
      setMode(mode);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const isBuild = mode === "BUILD";
  // Stable label so the height of the count/edit row never
  // changes — keeps the layout below from shifting on toggle.
  const countLabel = `${curatedSlideCount}/5 · Edit`;

  return (
    <div className="flex flex-col items-end gap-2 shrink-0">
      {/* Curator edit link sits ABOVE the mode pill so it stays in
          a fixed position. Always rendered (no layout shift on
          toggle) — greyed out on Random, amber-bold + clickable
          on Build. */}
      {isBuild ? (
        <Link
          href={`/vault/${childId}/reveal/curator`}
          prefetch={false}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold text-amber hover:text-amber-dark transition-colors whitespace-nowrap"
        >
          <Settings2 size={11} strokeWidth={2} aria-hidden="true" />
          {countLabel}
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold text-ink-light/60 whitespace-nowrap cursor-default"
        >
          <Settings2 size={11} strokeWidth={2} aria-hidden="true" />
          {countLabel}
        </span>
      )}

      <div
        role="group"
        aria-label="Reveal mode"
        className="inline-flex items-center gap-0.5 rounded-full bg-white border border-navy/10 p-0.5"
      >
        <PillOption
          active={mode === "RANDOM"}
          disabled={busy}
          onClick={() => setRevealMode("RANDOM")}
          icon={<Wand2 size={13} strokeWidth={1.75} aria-hidden="true" />}
          label="Random"
        />
        <PillOption
          active={mode === "BUILD"}
          disabled={busy}
          onClick={() => setRevealMode("BUILD")}
          icon={<Sparkles size={13} strokeWidth={1.75} aria-hidden="true" />}
          label="Build"
        />
      </div>

      <Link
        href={`/vault/${childId}/preview`}
        prefetch={false}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-amber/30 text-amber font-semibold text-[13px] hover:border-amber hover:bg-amber-tint/40 transition-colors whitespace-nowrap"
      >
        <Eye size={14} strokeWidth={1.75} aria-hidden="true" />
        Preview the Reveal
      </Link>

      {error && (
        <p className="text-[12px] text-red-600 text-right" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function PillOption({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold transition-colors disabled:opacity-60 ${
        active
          ? "bg-amber text-white"
          : "text-ink-mid hover:text-navy"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
