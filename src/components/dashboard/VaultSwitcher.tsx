"use client";

import { Check, ChevronDown, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type VaultOption = {
  /** Child id — used as the URL param and localStorage value. */
  id: string;
  /** Display name (child's first name). */
  firstName: string;
  /** Vault id lives here too in case a caller needs it. */
  vaultId: string;
};

const STORAGE_KEY = "untilthen_selected_vault";

/**
 * Multi-vault switcher. Behaviour summary:
 * - <= 1 child: renders a plain "<name>'s vault" label; no dropdown.
 * - 2+ children: shows a pill button with child initial + name +
 *   chevron. Clicking opens a dropdown of all children.
 * - Selecting a child pushes `?vault=<childId>` onto the URL
 *   (triggers the server component to re-query with the new
 *   child's data) and saves the selection to localStorage so it
 *   sticks across sessions.
 * - On first dashboard load without a `?vault=` param, we read
 *   localStorage and, if a persisted selection exists and belongs
 *   to this parent, redirect once. That covers the "remembered
 *   selection" case without making the server component stateful.
 */
export function VaultSwitcher({
  options,
  selectedChildId,
  flush = false,
}: {
  options: VaultOption[];
  selectedChildId: string;
  /**
   * Drop the built-in bottom margin. Used when the switcher is
   * placed inside a flex row alongside another element, so the
   * spacing comes from the parent instead.
   */
  flush?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Restore the last selection from localStorage the first time we
  // hit /dashboard without a `?vault=` param.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasParam = searchParams.get("vault");
    if (hasParam) return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored || stored === selectedChildId) return;
      if (!options.some((o) => o.id === stored)) return;
      router.replace(`/dashboard?vault=${stored}`);
    } catch {
      /* storage unavailable — skip */
    }
    // Intentionally only run on first mount; subsequent URL changes
    // are driven by user clicks in the dropdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (ref.current && target && !ref.current.contains(target)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = options.find((o) => o.id === selectedChildId) ?? options[0];
  if (!selected) return null;

  function select(id: string) {
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    setOpen(false);
    router.push(`/dashboard?vault=${id}`);
  }

  // One-child-only → static label, no dropdown.
  if (options.length < 2) {
    return (
      <p
        className={`text-[11px] font-bold uppercase tracking-[0.14em] text-amber ${
          flush ? "" : "mb-2"
        }`}
      >
        {selected.firstName}&rsquo;s vault
      </p>
    );
  }

  return (
    <div
      ref={ref}
      className={`relative inline-block ${flush ? "" : "mb-4"}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 bg-white border-[1.5px] border-navy/15 rounded-full text-[15px] font-bold text-navy hover:border-navy transition-colors"
      >
        <Initial name={selected.firstName} active />
        {selected.firstName}
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          aria-hidden="true"
          className={`text-ink-light transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-11 min-w-[220px] rounded-xl bg-white border border-navy/[0.08] shadow-[0_4px_24px_rgba(15,31,61,0.12)] overflow-hidden z-50 py-1.5"
        >
          {options.map((opt) => {
            const active = opt.id === selected.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="menuitem"
                onClick={() => select(opt.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[15px] text-left transition-colors ${
                  active
                    ? "font-bold text-amber bg-amber-tint"
                    : "font-medium text-navy hover:bg-amber-tint/60"
                }`}
              >
                <Initial name={opt.firstName} active={active} />
                <span className="flex-1 truncate">{opt.firstName}</span>
                {active && (
                  <Check
                    size={14}
                    strokeWidth={2}
                    className="text-amber"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
          <div className="border-t border-navy/[0.06] mt-1 pt-1">
            <Link
              href="/account/capsules"
              prefetch={false}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-amber hover:bg-amber-tint transition-colors"
            >
              <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
              Add a child vault
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Initial({ name, active }: { name: string; active: boolean }) {
  const initial = (name[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold tracking-[0.02em] text-white ${
        active ? "bg-amber" : "bg-navy"
      }`}
    >
      {initial}
    </span>
  );
}
