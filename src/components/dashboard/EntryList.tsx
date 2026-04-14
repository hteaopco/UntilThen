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
    return (
      <div className="rounded-2xl border border-navy/[0.08] bg-warm-surface px-8 py-14 text-center">
        <div
          aria-hidden="true"
          className="mb-3 inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-tint text-amber"
        >
          <Mail size={24} strokeWidth={1.5} />
        </div>
        <p className="text-lg font-semibold text-navy mb-1">
          Nothing sealed yet.
        </p>
        <p className="text-sm text-ink-mid mb-6">
          Start with a moment for {childFirstName}.
        </p>
        <Link
          href="/dashboard/new"
          className="inline-block bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
        >
          Write your first moment →
        </Link>
      </div>
    );
  }

  const now = Date.now();

  return (
    <ul className="space-y-3">
      {entries.map((e) => {
        const unlockIso = e.revealDate ?? revealDate;
        const unlocked = unlockIso
          ? new Date(unlockIso).getTime() <= now
          : false;
        return (
          <li
            key={e.id}
            className="rounded-2xl border border-navy/[0.08] bg-white px-6 py-5 hover:border-amber/25 hover:shadow-[0_8px_24px_rgba(15,31,61,0.06)] transition-all"
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
                <DeleteEntryButton id={e.id} title={e.title ?? "this entry"} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
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
