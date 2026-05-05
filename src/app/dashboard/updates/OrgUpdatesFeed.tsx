"use client";

import { Megaphone } from "lucide-react";
import { useState } from "react";

export type OrgUpdateRow = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  organizationName: string;
};

const FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const BODY_PREVIEW_CHAR_CAP = 220;

/**
 * Read-only list of organisation announcements rendered above
 * the per-user contribution inbox on /dashboard/updates. Pulled
 * server-side from OrganizationUpdate; this component only owns
 * per-row expand state for long bodies. No actions; org admins
 * post from /enterprise instead.
 */
export function OrgUpdatesFeed({ rows }: { rows: OrgUpdateRow[] }) {
  return (
    <ul className="space-y-3">
      {rows.map((u) => (
        <li key={u.id}>
          <OrgUpdateCard update={u} />
        </li>
      ))}
    </ul>
  );
}

function OrgUpdateCard({ update }: { update: OrgUpdateRow }) {
  const [expanded, setExpanded] = useState(false);
  const body = update.body.trim();
  const canExpand = body.length > BODY_PREVIEW_CHAR_CAP;
  const shown =
    expanded || !canExpand
      ? body
      : body.slice(0, BODY_PREVIEW_CHAR_CAP).trimEnd() + "…";
  return (
    <article className="rounded-2xl border border-amber/25 bg-white shadow-[0_2px_10px_rgba(196,122,58,0.05)] p-4 sm:p-5 flex items-start gap-3">
      <span
        aria-hidden="true"
        className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber/15 text-amber"
      >
        <Megaphone size={16} strokeWidth={1.75} />
      </span>
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] sm:text-[16px] font-bold text-navy tracking-[-0.2px] leading-tight">
          {update.title}
        </h3>
        <p className="mt-0.5 text-[12px] text-ink-light">
          {update.authorName} &middot; {FMT.format(new Date(update.createdAt))}
        </p>
        <p
          className={`mt-2 text-[13px] text-ink-mid leading-[1.55] whitespace-pre-wrap break-words ${
            expanded ? "" : "line-clamp-3"
          }`}
        >
          {shown}
        </p>
        {canExpand && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-[12px] font-semibold text-amber hover:text-amber-dark transition-colors"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </article>
  );
}
