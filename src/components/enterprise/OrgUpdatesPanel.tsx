"use client";

import { Megaphone, Send } from "lucide-react";
import { useEffect, useState } from "react";

type Update = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
};

const TITLE_MAX = 120;
const BODY_MAX = 1000;

const FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/**
 * Org admin "post an update" surface that lives on /enterprise.
 * OWNER + ADMIN can compose a title + body announcement that
 * fans out to every org member's /dashboard/updates page.
 *
 * The component handles its own data fetch on mount (paginated
 * server-side at 50) and optimistically prepends a new post on
 * successful POST so the admin sees immediate feedback.
 */
export function OrgUpdatesPanel({ orgId }: { orgId: string }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/orgs/${orgId}/updates`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const j = (await res.json()) as { updates: Update[] };
        if (!cancelled) setUpdates(j.updates);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  async function post() {
    if (posting) return;
    if (!title.trim() || !body.trim()) {
      setError("Title and body are both required.");
      return;
    }
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${orgId}/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        update?: Update;
        error?: string;
      };
      if (!res.ok || !json.update) {
        throw new Error(json.error ?? "Couldn't post the update.");
      }
      setUpdates((prev) => [json.update!, ...prev]);
      setTitle("");
      setBody("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-navy/[0.08] bg-white px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber/15 text-amber">
          <Megaphone size={18} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-[15px] font-bold text-navy leading-tight">
            Post an update
          </h3>
          <p className="text-[12px] text-ink-mid leading-tight">
            Sends to every member&rsquo;s Updates inbox.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
          placeholder="Title (e.g. Q4 capsule roster open)"
          className="w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy placeholder-ink-light/50 outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
          disabled={posting}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
          placeholder="What does the team need to know?"
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy placeholder-ink-light/50 outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 leading-[1.5] resize-y"
          disabled={posting}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-ink-light tabular-nums">
            {body.length} / {BODY_MAX}
          </span>
          <button
            type="button"
            onClick={post}
            disabled={posting || !title.trim() || !body.trim()}
            className="inline-flex items-center gap-1.5 bg-navy text-white px-4 py-2 rounded-lg text-[13px] font-bold hover:bg-navy/90 transition-colors disabled:opacity-50"
          >
            <Send size={13} strokeWidth={2} aria-hidden="true" />
            {posting ? "Posting…" : "Post update"}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-[12px] text-red-600">
            {error}
          </p>
        )}
      </div>

      {(updates.length > 0 || loading) && (
        <>
          <hr className="my-5 border-navy/[0.06]" />
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-mid mb-3">
            Recent updates
          </p>
          {loading ? (
            <p className="text-[13px] text-ink-light italic">Loading…</p>
          ) : (
            <ul className="space-y-3">
              {updates.slice(0, 5).map((u) => (
                <li
                  key={u.id}
                  className="rounded-xl bg-warm-surface/40 px-4 py-3"
                >
                  <p className="text-[14px] font-bold text-navy leading-tight">
                    {u.title}
                  </p>
                  <p className="mt-1 text-[12px] text-ink-light">
                    {u.authorName} &middot; {FMT.format(new Date(u.createdAt))}
                  </p>
                  <p className="mt-2 text-[13px] text-navy/85 leading-[1.55] whitespace-pre-wrap break-words line-clamp-3">
                    {u.body}
                  </p>
                </li>
              ))}
              {updates.length > 5 && (
                <li className="text-[12px] text-ink-mid italic">
                  +{updates.length - 5} more posted earlier&hellip;
                </li>
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
