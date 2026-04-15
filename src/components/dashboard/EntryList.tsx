import { Eye, Lock, Pencil, Unlock } from "lucide-react";
import Link from "next/link";

import { DeleteEntryButton } from "@/components/dashboard/DeleteEntryButton";
import { EntryTypeBadge } from "@/components/ui/EntryTypeBadge";
import { formatShort } from "@/lib/dateFormatters";

export type EntryRow = {
  id: string;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  title: string | null;
  body: string | null;
  createdAt: string;
  revealDate: string | null;
};

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
  vaultId,
}: {
  entries: EntryRow[];
  childFirstName: string;
  revealDate: string | null;
  vaultId: string;
}) {
  if (entries.length === 0) {
    // First-moment state. Carries its own CTA + a few starter
    // prompts so parents staring at a blank timeline have
    // something concrete to write toward.
    return (
      <div className="rounded-2xl border border-dashed border-navy/10 bg-warm-surface/50 px-6 py-10 text-center">
        <h3 className="text-[19px] font-extrabold text-navy tracking-[-0.2px]">
          No moments yet.
        </h3>
        <p className="mt-2 text-sm text-ink-mid">
          Write your first memory for {childFirstName}.
        </p>
        <Link
          href={`/dashboard/new?vault=${vaultId}`}
          prefetch={false}
          className="mt-5 inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
        >
          <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
          Write your first memory →
        </Link>
        <div className="mt-7 pt-5 border-t border-navy/[0.08] text-left max-w-[360px] mx-auto">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-light mb-2">
            Most parents start with
          </p>
          <ul className="space-y-1.5 text-sm text-ink-mid">
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-amber">
                •
              </span>
              The day you were born
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true" className="text-amber">
                •
              </span>
              A moment that made you smile today
            </li>
          </ul>
        </div>
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
                      Sealed {formatShort(e.createdAt)}
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
                        title={e.title ?? "this memory"}
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
