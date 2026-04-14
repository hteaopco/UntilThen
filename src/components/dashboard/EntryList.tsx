import { Eye, Lock, Mail, Pencil, Unlock } from "lucide-react";
import Link from "next/link";

import { DeleteEntryButton } from "@/components/dashboard/DeleteEntryButton";
import { EntryTypeBadge } from "@/components/ui/EntryTypeBadge";

export type EntryRow = {
  id: string;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  title: string | null;
  body: string | null;
  createdAt: string;
  revealDate: string | null;
};

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function preview(body: string | null, max = 180): string {
  if (!body) return "";
  // Strip Tiptap HTML tags for the preview text.
  const clean = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd() + "…";
}

export function EntryList({
  entries,
  childFirstName,
  revealDate,
}: {
  entries: EntryRow[];
  childFirstName: string;
  revealDate: string | null;
}) {
  if (entries.length === 0) {
    // Empty state kept intentionally quiet — the MemoryStarter at
    // the top of the page is already handling the "start writing"
    // invitation. No need to shout about it twice.
    return (
      <div className="rounded-2xl border border-dashed border-navy/10 bg-warm-surface/50 px-6 py-10 text-center">
        <div
          aria-hidden="true"
          className="mb-3 inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-tint text-amber"
        >
          <Mail size={20} strokeWidth={1.5} />
        </div>
        <p className="text-sm text-ink-mid">
          Nothing here yet. Your first moment for {childFirstName} will
          land here.
        </p>
      </div>
    );
  }

  const now = Date.now();

  // Group entries by month-of-creation so the list reads like a
  // timeline instead of a flat stack of cards.
  const groups: { key: string; label: string; rows: EntryRow[] }[] = [];
  for (const e of entries) {
    const key = monthKey(e.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.rows.push(e);
    } else {
      groups.push({ key, label: monthLabel(e.createdAt), rows: [e] });
    }
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <div key={group.key}>
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-light mb-3">
            {group.label}
          </div>
          <ul className="space-y-3">
            {group.rows.map((e) => {
              const unlockIso = e.revealDate ?? revealDate;
              const unlocked = unlockIso
                ? new Date(unlockIso).getTime() <= now
                : false;
              return (
                <li
                  key={e.id}
                  className="rounded-2xl border border-navy/[0.06] bg-white px-6 py-5 hover:border-amber/25 hover:shadow-[0_6px_18px_rgba(15,31,61,0.05)] transition-all"
                >
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <EntryTypeBadge type={e.type} />
                    <span className="text-[11px] text-ink-light">
                      Saved {formatShort(e.createdAt)}
                    </span>
                  </div>
                  {e.title && (
                    <h3 className="text-[17px] font-bold text-navy tracking-[-0.2px] mb-2 leading-tight">
                      {e.title}
                    </h3>
                  )}
                  {e.body && (
                    <p className="text-sm text-ink-mid leading-[1.6] mb-3">
                      {preview(e.body)}
                    </p>
                  )}
                  <UnlocksPill
                    unlocked={unlocked}
                    label={unlockIso ? formatShort(unlockIso) : "Not set"}
                  />
                  <div className="mt-4 pt-3 border-t border-navy/[0.06] flex items-center gap-2 text-[11px] uppercase tracking-[0.06em] font-bold">
                    <Link
                      href={`/dashboard/entry/${e.id}/preview`}
                      prefetch={false}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-navy/15 text-ink-mid hover:border-navy hover:text-navy hover:bg-white transition-colors"
                    >
                      <Eye size={14} strokeWidth={1.5} aria-hidden="true" />
                      View
                    </Link>
                    {!unlocked && (
                      <Link
                        href={`/dashboard/entry/${e.id}/edit`}
                        prefetch={false}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-navy/15 text-ink-mid hover:border-navy hover:text-navy hover:bg-white transition-colors"
                      >
                        <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
                        Edit
                      </Link>
                    )}
                    <div className="ml-auto">
                      <DeleteEntryButton
                        id={e.id}
                        title={e.title ?? "this entry"}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * Gold reveal-date pill. Same footprint as the EntryTypeBadge
 * (px-2 py-[3px] rounded, uppercase tracking-[0.1em] 10px bold)
 * but with a gold border + gold text on a transparent ground —
 * reads as the "when" in the same visual language as the "what".
 */
function UnlocksPill({
  unlocked,
  label,
}: {
  unlocked: boolean;
  label: string;
}) {
  const Icon = unlocked ? Unlock : Lock;
  return (
    <span
      style={{
        color: "#c9a84c",
        borderColor: "rgba(201, 168, 76, 0.3)",
      }}
      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-[3px] rounded border"
    >
      <Icon size={11} strokeWidth={2} aria-hidden="true" />
      {unlocked ? "Unlocked" : "Unlocks"} · {label}
    </span>
  );
}
