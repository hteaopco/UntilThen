"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Delete button for a dashboard entry. First click arms the
 * button and reveals a small "Confirm?" state; a second click
 * (or Enter) fires the DELETE. Click-away or Esc cancels. This
 * pattern is more reliable than window.confirm() on mobile —
 * iOS Safari occasionally drops synchronous confirm() dialogs
 * that originate inside React event handlers, which would make
 * the button appear to "not work".
 */
export function DeleteEntryButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click-away / Esc while armed → disarm.
  useEffect(() => {
    if (!armed || loading) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (ref.current && target && !ref.current.contains(target)) {
        setArmed(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setArmed(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [armed, loading]);

  async function reallyDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/entries/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Delete failed.");
      }
      router.refresh();
    } catch (err) {
      window.alert((err as Error).message);
      setLoading(false);
      setArmed(false);
    }
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-navy/15 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-light hover:border-red-600 hover:text-red-600 hover:bg-white transition-colors"
      >
        <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
        Delete
      </button>
    );
  }

  return (
    <div
      ref={ref}
      className="inline-flex items-center gap-1"
      aria-label={`Confirm delete ${title}`}
    >
      <button
        type="button"
        onClick={reallyDelete}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 text-white text-[11px] font-bold uppercase tracking-[0.06em] hover:bg-red-700 transition-colors disabled:opacity-60"
      >
        <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
        {loading ? "Deleting…" : "Delete?"}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        disabled={loading}
        className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-mid hover:text-navy transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}
