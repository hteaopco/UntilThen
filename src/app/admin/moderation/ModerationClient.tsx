"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PendingEntry = {
  id: string;
  kind: "vault" | "capsule";
  title: string | null;
  body: string | null;
  authorName: string;
  targetName: string;
  type: string;
  createdAt: string;
};

export function ModerationClient({ items }: { items: PendingEntry[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(item: PendingEntry, action: "approve" | "reject") {
    setBusy(item.id);
    try {
      const url =
        item.kind === "vault"
          ? `/api/entries/${item.id}/${action}`
          : `/api/admin/capsule-contributions/${item.id}/${action}`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } catch {
      window.alert(`Couldn't ${action} this item.`);
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-navy/10 bg-warm-surface/40 px-5 py-12 text-center">
        <p className="text-sm text-ink-mid">Nothing to review. All clear.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-mid mb-4">
        {items.length} item{items.length !== 1 ? "s" : ""} awaiting your review.
      </p>
      {items.map((item) => {
        const preview = item.body
          ? item.body.replace(/<[^>]+>/g, " ").trim().slice(0, 300)
          : null;
        return (
          <div
            key={`${item.kind}-${item.id}`}
            className="rounded-xl border border-navy/[0.08] bg-white px-5 py-4"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <span className={`text-[10px] uppercase tracking-[0.1em] font-bold ${
                  item.kind === "vault" ? "text-amber" : "text-gold"
                }`}>
                  {item.kind === "vault" ? "Vault Entry" : "Gift Capsule"} · {item.type}
                </span>
                <p className="text-[15px] font-bold text-navy tracking-[-0.2px] mt-0.5">
                  {item.title || "Untitled"}
                </p>
              </div>
              <span className="text-[10px] text-ink-light whitespace-nowrap">
                {new Date(item.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>

            <p className="text-xs text-ink-mid mb-1">
              <span className="font-semibold text-navy">{item.authorName}</span>
              {" "}contributed to{" "}
              <span className="font-semibold text-navy">{item.targetName}</span>
            </p>

            {preview && (
              <p className="text-sm text-ink-mid leading-[1.6] mt-2 mb-3 line-clamp-4 bg-warm-surface/40 rounded-lg px-3 py-2">
                {preview}
              </p>
            )}

            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => act(item, "approve")}
                disabled={busy === item.id}
                className="inline-flex items-center gap-1.5 bg-sage text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-sage/90 transition-colors disabled:opacity-50"
              >
                <Check size={14} strokeWidth={2} aria-hidden="true" />
                Approve
              </button>
              <button
                type="button"
                onClick={() => act(item, "reject")}
                disabled={busy === item.id}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-mid hover:text-red-600 px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                <X size={14} strokeWidth={2} aria-hidden="true" />
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
