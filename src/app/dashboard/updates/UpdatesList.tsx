"use client";

import { Check, Gift, Inbox, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatLong } from "@/lib/dateFormatters";

export type PendingUpdate = {
  id: string;
  capsuleId: string;
  capsuleTitle: string;
  recipientName: string;
  authorName: string;
  title: string | null;
  body: string | null;
  createdAt: string;
};

type Props = {
  rows: PendingUpdate[];
};

/**
 * Client-side approval inbox. Each row has its own approve / deny
 * icons; the top action bar approves or rejects every checked row in
 * parallel via POSTs to the existing per-contribution endpoints.
 * After any action, router.refresh() pulls the server-side list down
 * so resolved items drop away.
 */
export function UpdatesList({ rows }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-navy/10 bg-white/60 px-6 py-12 text-center">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-amber-tint text-amber mb-3">
          <Inbox size={20} strokeWidth={1.75} />
        </span>
        <p className="text-[14px] text-ink-mid leading-[1.5]">
          You&rsquo;re all caught up.
        </p>
      </div>
    );
  }

  const allSelected = selected.size === rows.length;

  function toggleAll() {
    setSelected((prev) =>
      prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)),
    );
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function act(
    row: PendingUpdate,
    verb: "approve" | "reject",
  ): Promise<boolean> {
    const res = await fetch(
      `/api/capsules/${row.capsuleId}/contributions/${row.id}/${verb}`,
      { method: "POST" },
    );
    return res.ok;
  }

  async function runBulk(verb: "approve" | "reject") {
    if (busy) return;
    const chosen = rows.filter((r) => selected.has(r.id));
    if (chosen.length === 0) return;
    setBusy(true);
    setError(null);
    const results = await Promise.all(chosen.map((r) => act(r, verb)));
    setBusy(false);
    if (results.some((ok) => !ok)) {
      setError(
        `Couldn't ${verb} one or more items — refresh and try again.`,
      );
    }
    setSelected(new Set());
    router.refresh();
  }

  async function runOne(row: PendingUpdate, verb: "approve" | "reject") {
    if (busy) return;
    setBusy(true);
    setError(null);
    const ok = await act(row, verb);
    setBusy(false);
    if (!ok) {
      setError(`Couldn't ${verb} that one — try again.`);
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(row.id);
      return next;
    });
    router.refresh();
  }

  return (
    <div>
      {/* Bulk action bar */}
      <div className="sticky top-[72px] z-20 -mx-6 px-6 py-3 bg-cream/90 backdrop-blur-sm border-y border-navy/[0.06] flex items-center justify-between gap-3 mb-4">
        <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-navy cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="w-4 h-4 accent-amber"
          />
          {selected.size === 0
            ? "Select all"
            : `${selected.size} selected`}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => runBulk("reject")}
            disabled={busy || selected.size === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white text-red-700 px-3 py-1.5 text-[12px] font-semibold hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X size={13} strokeWidth={2} />
            Deny
          </button>
          <button
            type="button"
            onClick={() => runBulk("approve")}
            disabled={busy || selected.size === 0}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber text-white px-3 py-1.5 text-[12px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={13} strokeWidth={2} />
            Approve
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-3 text-[13px] text-red-700" role="alert">
          {error}
        </p>
      )}

      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id}>
            <UpdateRow
              row={row}
              checked={selected.has(row.id)}
              disabled={busy}
              onToggle={() => toggle(row.id)}
              onApprove={() => runOne(row, "approve")}
              onDeny={() => runOne(row, "reject")}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function UpdateRow({
  row,
  checked,
  disabled,
  onToggle,
  onApprove,
  onDeny,
}: {
  row: PendingUpdate;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const snippet = (row.body ?? "").replace(/<[^>]*>/g, "").trim();
  const preview = row.title?.trim() || snippet.slice(0, 160) || "Untitled";
  const sub = row.title && snippet ? snippet.slice(0, 200) : "";
  return (
    <article className="rounded-2xl border border-amber/20 bg-white shadow-[0_2px_10px_rgba(196,122,58,0.05)] p-4 sm:p-5 flex items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 w-4 h-4 shrink-0 accent-amber"
        aria-label={`Select contribution from ${row.authorName}`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] font-semibold text-amber bg-amber-tint px-2 py-0.5 rounded-full">
            <Gift size={12} strokeWidth={1.75} />
            {row.capsuleTitle}
          </span>
          <span className="text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-light">
            {formatLong(row.createdAt)}
          </span>
        </div>
        <h3 className="mt-1.5 text-[15px] sm:text-[16px] font-bold text-navy tracking-[-0.2px] leading-tight">
          From {row.authorName} · {preview}
        </h3>
        {sub && (
          <p className="mt-1 text-[13px] text-ink-mid leading-[1.5] line-clamp-3">
            {sub}
          </p>
        )}
      </div>

      <div className="shrink-0 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={onApprove}
          disabled={disabled}
          aria-label="Approve"
          className="w-9 h-9 rounded-full bg-amber-tint border border-amber/40 text-amber hover:bg-amber hover:text-white transition-colors flex items-center justify-center disabled:opacity-40"
        >
          <Check size={15} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onDeny}
          disabled={disabled}
          aria-label="Deny"
          className="w-9 h-9 rounded-full border border-navy/10 bg-white text-ink-mid hover:text-red-700 hover:border-red-300 transition-colors flex items-center justify-center disabled:opacity-40"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>
    </article>
  );
}
