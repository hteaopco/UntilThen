"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteEntryButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (
      !window.confirm(`Delete waitlist entry for ${name}? This can't be undone.`)
    ) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/entries/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Delete failed");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="text-[11px] text-ink-light hover:text-red-600 transition-colors disabled:opacity-50 font-bold uppercase tracking-[0.06em]"
      >
        {loading ? "…" : "Delete"}
      </button>
      {error && (
        <span className="ml-2 text-[11px] text-red-600" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
