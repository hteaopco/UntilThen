"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type PendingEntry = {
  id: string;
  title: string | null;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  createdAt: string;
  contributorName: string;
};

export function ApprovalQueue({ entries }: { entries: PendingEntry[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function decide(id: string, action: "approve" | "reject") {
    setBusy(id);
    try {
      await fetch(`/api/entries/${id}/${action}`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (entries.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-4">
        Pending approval · {entries.length}
      </div>
      <ul className="space-y-2">
        {entries.map((e) => (
          <li
            key={e.id}
            className="rounded-xl border border-gold/40 bg-gold-tint px-5 py-4 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] font-bold text-navy mb-1">
                <span>👁</span>
                <span>{e.contributorName}</span>
                <span className="text-ink-light">· {e.type}</span>
              </div>
              <div className="text-sm font-semibold text-navy truncate">
                {e.title ?? "Untitled entry"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => decide(e.id, "approve")}
              disabled={busy === e.id}
              className="bg-navy text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-navy-mid transition-colors disabled:opacity-60"
            >
              {busy === e.id ? "…" : "Approve"}
            </button>
            <button
              type="button"
              onClick={() => decide(e.id, "reject")}
              disabled={busy === e.id}
              className="border border-navy/15 text-navy px-3 py-1.5 rounded-lg text-xs font-bold hover:border-navy transition-colors disabled:opacity-60"
            >
              Reject
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
