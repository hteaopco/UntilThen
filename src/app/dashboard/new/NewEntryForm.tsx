"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";
import {
  MediaAttachments,
  type Attachment,
} from "@/components/editor/MediaAttachments";
import { TiptapEditor, getReadingStats } from "@/components/editor/TiptapEditor";

export type CollectionOption = {
  id: string;
  title: string;
  coverEmoji: string | null;
  revealDate: string | null;
};

export type InitialEntry = {
  id: string;
  title: string | null;
  body: string | null;
  collectionId: string | null;
  customRevealDate: string | null; // per-entry override, or null if using vault/collection default
  attachments?: Attachment[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

function formatLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const AUTOSAVE_INTERVAL_MS = 30000;

export function NewEntryForm({
  childFirstName,
  vaultRevealDate,
  collections,
  lockedCollectionId,
  initialEntry,
}: {
  childFirstName: string;
  vaultRevealDate: string | null;
  collections: CollectionOption[];
  lockedCollectionId: string | null;
  initialEntry?: InitialEntry;
}) {
  const router = useRouter();

  const [entryId, setEntryId] = useState<string | null>(
    initialEntry?.id ?? null,
  );
  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [body, setBody] = useState(initialEntry?.body ?? "");
  const [collectionId, setCollectionId] = useState<string | "">(
    initialEntry?.collectionId ?? lockedCollectionId ?? "",
  );
  const [useCustomDate, setUseCustomDate] = useState(
    Boolean(initialEntry?.customRevealDate),
  );
  const [customDate, setCustomDate] = useState(
    initialEntry?.customRevealDate ?? "",
  );

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [topError, setTopError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  // Refs so setInterval / event handlers always see the latest values
  // without re-creating the interval on every keystroke.
  const stateRef = useRef({
    title,
    body,
    collectionId,
    customDate,
    useCustomDate,
    entryId,
  });
  useEffect(() => {
    stateRef.current = {
      title,
      body,
      collectionId,
      customDate,
      useCustomDate,
      entryId,
    };
  }, [title, body, collectionId, customDate, useCustomDate, entryId]);

  const lastSnapshotRef = useRef<string>("");
  const hasContent = () => {
    const s = stateRef.current;
    const bodyText = s.body.replace(/<[^>]*>/g, "").trim();
    return Boolean(s.title.trim()) || bodyText.length > 0;
  };

  const selectedCollection = collectionId
    ? collections.find((c) => c.id === collectionId) ?? null
    : null;
  const inCollection = Boolean(selectedCollection);

  const save = useCallback(async (): Promise<string | null> => {
    const s = stateRef.current;
    if (!hasContent()) return s.entryId;

    const payload = {
      title: s.title.trim() || null,
      body: s.body,
      type: "TEXT",
      collectionId: s.collectionId || null,
      revealDate:
        !s.collectionId && s.useCustomDate && s.customDate
          ? s.customDate
          : null,
      // Auto-saves never flip isSealed. That only happens from the
      // preview page's explicit "Seal Moment" confirmation.
      isDraft: true,
    };

    const snapshot = JSON.stringify(payload);
    if (snapshot === lastSnapshotRef.current) {
      return s.entryId;
    }

    setSaveState("saving");
    setTopError(null);
    try {
      let id = s.entryId;
      if (!id) {
        const res = await fetch("/api/dashboard/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: snapshot,
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? "Save failed.");
        }
        const data = (await res.json()) as { id: string };
        id = data.id;
        setEntryId(id);
      } else {
        const res = await fetch(`/api/dashboard/entries/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: snapshot,
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? "Save failed.");
        }
      }
      lastSnapshotRef.current = snapshot;
      setSaveState("saved");
      return id;
    } catch (err) {
      setSaveState("error");
      setTopError((err as Error).message);
      return null;
    }
  }, []);

  // Auto-save every 30s.
  useEffect(() => {
    const timer = setInterval(() => {
      if (hasContent()) save();
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [save]);

  // Save on window blur (user tabs away).
  useEffect(() => {
    function onBlur() {
      if (hasContent()) save();
    }
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [save]);

  async function handleProofRead() {
    if (!hasContent()) {
      setTopError("Write something (or add a title) before reviewing.");
      return;
    }
    setNavigating(true);
    const id = await save();
    if (!id) {
      setNavigating(false);
      return;
    }
    router.push(`/dashboard/entry/${id}/preview`);
  }

  const { wordCount, readingTime } = getReadingStats(body);

  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-navy/[0.06]">
        <div className="mx-auto max-w-[720px] px-6 py-4 flex items-center justify-between gap-4">
          <Link
            href={
              lockedCollectionId
                ? `/dashboard/collection/${lockedCollectionId}`
                : "/dashboard"
            }
            className="flex items-center gap-2 text-sm text-ink-mid hover:text-navy transition-colors"
          >
            <span aria-hidden="true">←</span>
            <span>Back</span>
          </Link>
          <LogoSvg variant="dark" width={110} height={22} />
          <div className="w-12" aria-hidden="true" />
        </div>
      </header>

      <div className="mx-auto max-w-[720px] px-6 pt-8 pb-40">
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-4">
          Writing to {childFirstName}
          {selectedCollection && (
            <>
              {" · "}
              <span className="text-navy">
                {selectedCollection.coverEmoji ?? "📖"}{" "}
                {selectedCollection.title}
              </span>
            </>
          )}
        </p>

        {/* Writing surface — stands out against the ivory page */}
        <div className="rounded-2xl bg-white border border-navy/[0.08] shadow-[0_4px_28px_-10px_rgba(15,31,61,0.1)] px-7 py-8 lg:px-10 lg:py-10">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              if (hasContent()) save();
            }}
            placeholder="Title (optional)"
            aria-label="Letter title"
            className="w-full px-0 py-2 text-[30px] lg:text-[34px] font-extrabold text-navy bg-transparent border-0 outline-none placeholder-ink-light/60 tracking-[-0.6px] leading-tight mb-5 border-b border-navy/[0.06] pb-4"
          />

          <TiptapEditor
            initialContent={body}
            onUpdate={setBody}
            onBlur={() => {
              if (hasContent()) save();
            }}
            placeholder={`Dear ${childFirstName},`}
          />
        </div>

        {/* Attachments card */}
        <div className="mt-6 rounded-2xl bg-white border border-navy/[0.08] px-7 py-6">
          <MediaAttachments
            entryId={entryId}
            initial={initialEntry?.attachments ?? []}
            ensureEntry={save}
          />
        </div>

        {/* Metadata card */}
        <div className="mt-6 rounded-2xl bg-white/70 border border-navy/[0.06] px-7 py-6 space-y-6">
          {collections.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold tracking-[0.1em] uppercase text-ink-mid mb-2">
                Add to a collection{" "}
                {lockedCollectionId ? (
                  "(locked)"
                ) : (
                  <span className="ml-1 text-ink-light font-medium normal-case tracking-normal text-[10px] italic">
                    (optional)
                  </span>
                )}
              </label>
              <select
                value={collectionId}
                onChange={(e) => {
                  setCollectionId(e.target.value);
                  setUseCustomDate(false);
                }}
                disabled={Boolean(lockedCollectionId)}
                className="w-full min-h-[44px] px-3 rounded-lg border border-navy/15 text-sm text-navy bg-white focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="">None — standalone entry</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.coverEmoji ?? "📖"} {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold tracking-[0.1em] uppercase text-ink-mid mb-3">
              Select your unlock date
            </label>
            {inCollection ? (
              <p className="text-sm italic text-ink-light">
                Inherits the collection&rsquo;s reveal date
                {selectedCollection?.revealDate
                  ? ` (${formatLong(selectedCollection.revealDate)})`
                  : vaultRevealDate
                    ? ` (${formatLong(vaultRevealDate)})`
                    : ""}
                .
              </p>
            ) : (
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm text-ink-mid cursor-pointer">
                  <input
                    type="radio"
                    name="dateMode"
                    checked={!useCustomDate}
                    onChange={() => setUseCustomDate(false)}
                    className="mt-1 accent-navy"
                  />
                  <span>
                    <span className="font-medium text-navy">
                      Vault date
                      {vaultRevealDate
                        ? ` — ${formatLong(vaultRevealDate)}`
                        : ""}
                    </span>
                    <span className="text-ink-light italic ml-1">
                      (default)
                    </span>
                  </span>
                </label>
                <label className="flex items-center gap-2 text-sm text-ink-mid cursor-pointer">
                  <input
                    type="radio"
                    name="dateMode"
                    checked={useCustomDate}
                    onChange={() => setUseCustomDate(true)}
                    className="accent-navy"
                  />
                  <span className="font-medium text-navy">
                    Choose a different date
                  </span>
                </label>
                {useCustomDate && (
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={new Date(Date.now() + 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0]}
                    className="ml-6 px-3 py-2 border border-navy/15 rounded-lg text-sm text-navy bg-white outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {topError && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {topError}
          </p>
        )}
      </div>

      {/* Sticky footer: proof-read is the required step before sealing */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-cream/95 backdrop-blur border-t border-navy/[0.08]">
        <div className="mx-auto max-w-[720px] px-6 py-3 flex items-center justify-between gap-4">
          <div className="text-xs text-ink-light">
            <SaveBadge state={saveState} />
          </div>
          <div className="text-xs text-ink-light tabular-nums hidden sm:block">
            {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"} ·{" "}
            {readingTime}
          </div>
          <button
            type="button"
            onClick={handleProofRead}
            disabled={!hasContent() || navigating}
            className="bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-50"
          >
            {navigating ? "Opening…" : "Proof Read →"}
          </button>
        </div>
      </footer>
    </main>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === "saving") return <span className="italic">Saving…</span>;
  if (state === "saved")
    return (
      <span className="inline-flex items-center gap-1.5 text-sage font-medium">
        <svg
          width="12"
          height="12"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M3 7.5 L6 10 L11 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
          Auto-saved
      </span>
    );
  if (state === "error")
    return <span className="text-red-600">⚠ Save failed</span>;
  return <span className="text-ink-light/70">Not saved yet</span>;
}
