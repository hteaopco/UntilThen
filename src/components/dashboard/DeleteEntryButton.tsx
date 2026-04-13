"use client";

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
      className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-light hover:text-red-600 transition-colors disabled:opacity-50"
    >
      {loading ? "…" : "Delete"}
    </button>
  );
}
