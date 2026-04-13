"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteEntryButton({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    if (
      !window.confirm(
        `Delete "${title}"? This is permanent — your child won't see it on reveal day.`,
      )
    ) {
      return;
    }
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
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-navy/15 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-light hover:border-red-600 hover:text-red-600 hover:bg-white transition-colors disabled:opacity-50"
    >
      <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
      {loading ? "…" : "Delete"}
    </button>
  );
}
