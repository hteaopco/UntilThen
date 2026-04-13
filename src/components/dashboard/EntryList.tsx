import Link from "next/link";

import { DeleteEntryButton } from "@/components/dashboard/DeleteEntryButton";

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

function TypePill({ type }: { type: EntryRow["type"] }) {
  const labels: Record<EntryRow["type"], { label: string; icon: string }> = {
    TEXT: { label: "Letter", icon: "✍️" },
    PHOTO: { label: "Photo", icon: "📷" },
    VOICE: { label: "Voice", icon: "🎙" },
    VIDEO: { label: "Video", icon: "🎥" },
  };
  const { label, icon } = labels[type];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] font-bold text-sky bg-sky-tint px-2 py-0.5 rounded">
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

function preview(body: string | null, max = 180): string {
  if (!body) return "";
  const clean = body.replace(/\s+/g, " ").trim();
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
      <div className="rounded-2xl border border-navy/[0.08] bg-[#f8fafc] px-8 py-14 text-center">
        <div aria-hidden="true" className="text-4xl mb-3">
          ✉️
        </div>
        <p className="text-lg font-semibold text-navy mb-1">
          Nothing sealed yet.
        </p>
        <p className="text-sm text-ink-mid mb-6">
          Start with a letter to {childFirstName}.
        </p>
        <Link
          href="/dashboard/new"
          className="inline-block bg-navy text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-navy-mid transition-colors"
        >
          Write your first letter →
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {entries.map((e) => {
        const unlockDate = e.revealDate ?? revealDate;
        return (
          <li
            key={e.id}
            className="rounded-2xl border border-navy/[0.08] bg-white px-6 py-5 hover:border-sky/25 hover:shadow-[0_8px_24px_rgba(15,31,61,0.06)] transition-all"
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 mb-1.5">
                  <TypePill type={e.type} />
                  <span className="text-[11px] text-ink-light">
                    Sealed {formatShort(e.createdAt)}
                  </span>
                </div>
                {e.title && (
                  <h3 className="text-[17px] font-bold text-navy tracking-[-0.2px] mb-1.5 leading-tight">
                    {e.title}
                  </h3>
                )}
                {e.body && (
                  <p className="text-sm text-ink-mid leading-[1.6]">
                    {preview(e.body)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.08em] font-bold text-gold">
                    Unlocks
                  </div>
                  <div className="text-xs text-ink-mid">
                    {unlockDate ? formatShort(unlockDate) : "Not set"}
                  </div>
                </div>
                <DeleteEntryButton id={e.id} title={e.title ?? "this entry"} />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
