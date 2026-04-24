"use client";

import { AlertTriangle, Check, CheckCircle, Loader2, RefreshCw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type HiveFlags = {
  flags?: Partial<Record<"sexual" | "violence" | "hate" | "drugs", number>>;
  top?: Array<{ className: string; score: number }>;
};

type PendingEntry = {
  id: string;
  kind: "vault" | "capsule";
  title: string | null;
  body: string | null;
  authorName: string;
  targetName: string;
  type: string;
  createdAt: string;
  moderationState:
    | "NOT_SCANNED"
    | "SCANNING"
    | "PASS"
    | "FLAGGED"
    | "FAILED_OPEN";
  moderationFlags: HiveFlags | null;
  moderationRunAt: string | null;
};

export function ModerationClient({
  items,
  scanning = [],
}: {
  items: PendingEntry[];
  scanning?: PendingEntry[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(item: PendingEntry, action: "approve" | "reject") {
    setBusy(item.id);
    try {
      // Both paths are admin-gated via the admin_auth cookie so
      // the parent/organiser /api/entries/[id]/* routes (Clerk-
      // gated) aren't used from here.
      const url =
        item.kind === "vault"
          ? `/api/admin/entries/${item.id}/${action}`
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

  const [approvingAll, setApprovingAll] = useState(false);
  const flaggedCount = items.filter((i) => i.moderationState === "FLAGGED").length;

  async function approveAll() {
    const msg = flaggedCount
      ? `Approve all ${items.length} items? ${flaggedCount} were flagged by Hive — approving them clears the flag and restores the item to its normal pipeline.`
      : `Approve all ${items.length} items?`;
    if (!window.confirm(msg)) return;
    setApprovingAll(true);
    try {
      for (const item of items) {
        const url =
          item.kind === "vault"
            ? `/api/admin/entries/${item.id}/approve`
            : `/api/admin/capsule-contributions/${item.id}/approve`;
        await fetch(url, { method: "POST" });
      }
      router.refresh();
    } catch {
      window.alert("Some items failed to approve.");
    } finally {
      setApprovingAll(false);
    }
  }

  if (items.length === 0 && scanning.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-navy/10 bg-warm-surface/40 px-5 py-12 text-center">
        <p className="text-sm text-ink-mid">Nothing to review. All clear.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {scanning.length > 0 ? (
        <section className="mb-5 rounded-xl border border-navy/[0.08] bg-navy/[0.02] px-5 py-4">
          <header className="flex items-center justify-between gap-3 mb-3">
            <h2 className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] font-bold text-navy">
              <Loader2
                size={12}
                strokeWidth={2.5}
                className="animate-spin"
                aria-hidden="true"
              />
              Currently scanning ({scanning.length})
            </h2>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-mid hover:text-navy"
            >
              <RefreshCw size={11} strokeWidth={2} aria-hidden="true" />
              Refresh
            </button>
          </header>
          <ul className="space-y-1">
            {scanning.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-3 text-[12px] text-ink-mid"
              >
                <span className="truncate">
                  <span className="font-semibold text-navy">
                    {s.authorName}
                  </span>{" "}
                  → {s.targetName} ·{" "}
                  <span className="font-mono text-[11px]">{s.type}</span>
                </span>
                <span className="text-[11px] text-ink-light whitespace-nowrap">
                  submitted{" "}
                  {Math.max(
                    0,
                    Math.floor(
                      (Date.now() - new Date(s.createdAt).getTime()) / 1000,
                    ),
                  )}
                  s ago
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-ink-light mt-2">
            Hive scans normally finish in under 10 seconds. Items stuck for
            more than 5 minutes are auto-released by the cleanup cron.
          </p>
        </section>
      ) : null}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-ink-mid">
          {items.length} item{items.length !== 1 ? "s" : ""} awaiting review
          {flaggedCount > 0 ? (
            <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-red-600">
              <AlertTriangle size={12} strokeWidth={2.5} aria-hidden="true" />
              {flaggedCount} flagged by Hive
            </span>
          ) : null}
          .
        </p>
        <button
          type="button"
          onClick={approveAll}
          disabled={approvingAll}
          className="inline-flex items-center gap-1.5 bg-sage text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-sage/90 transition-colors disabled:opacity-50"
        >
          <CheckCircle size={14} strokeWidth={2} aria-hidden="true" />
          {approvingAll ? "Approving…" : "Approve All"}
        </button>
      </div>
      {items.map((item) => {
        const preview = item.body
          ? item.body.replace(/<[^>]+>/g, " ").trim().slice(0, 300)
          : null;
        const flagged = item.moderationState === "FLAGGED";
        return (
          <div
            key={`${item.kind}-${item.id}`}
            className={`rounded-xl border px-5 py-4 ${
              flagged
                ? "border-red-200 bg-red-50/40"
                : "border-navy/[0.08] bg-white"
            }`}
          >
            {flagged ? <HiveFlagBadge flags={item.moderationFlags} /> : null}
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
                {flagged ? "Clear flag (send to organiser)" : "Approve"}
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

function HiveFlagBadge({ flags }: { flags: HiveFlags | null }) {
  const entries = flags?.flags
    ? (Object.entries(flags.flags) as Array<[string, number]>)
        .filter(([, score]) => typeof score === "number")
        .sort(([, a], [, b]) => b - a)
    : [];

  return (
    <div className="mb-3 rounded-lg border border-red-200 bg-red-100/50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-red-700 mb-1">
        <AlertTriangle size={12} strokeWidth={2.5} aria-hidden="true" />
        Flagged by Hive
      </div>
      {entries.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {entries.map(([category, score]) => (
            <li
              key={category}
              className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                score >= 0.7
                  ? "bg-red-200 text-red-900"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {category}: {(score * 100).toFixed(0)}%
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-red-700">No category detail.</p>
      )}
    </div>
  );
}
