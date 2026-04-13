"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";
import { TiptapEditor, getReadingStats } from "@/components/editor/TiptapEditor";

export type CollectionOption = {
  id: string;
  title: string;
  coverEmoji: string | null;
  revealDate: string | null;
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
}: {
  childFirstName: string;
  vaultRevealDate: string | null;
  collections: CollectionOption[];
  lockedCollectionId: string | null;
}) {
  const router = useRouter();

  const [entryId, setEntryId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [collectionId, setCollectionId] = useState<string | "">(
    lockedCollectionId ?? "",
  );
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState("");

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [topError, setTopError] = useState<string | null>(null);
  const [showSealModal, setShowSealModal] = useState(false);
  const [sealing, setSealing] = useState(false);

  // Mutable refs so setInterval / event handlers always see latest values
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
    // Tiptap emits "<p></p>" for empty docs — treat as empty.
    const bodyText = s.body.replace(/<[^>]*>/g, "").trim();
    return Boolean(s.title.trim()) || bodyText.length > 0;
  };

  const selectedCollection = collectionId
    ? collections.find((c) => c.id === collectionId) ?? null
    : null;
  const inCollection = Boolean(selectedCollection);

  const save = useCallback(
    async ({
      seal = false,
    }: {
      seal?: boolean;
    } = {}): Promise<boolean> => {
      const s = stateRef.current;
      if (!hasContent() && !seal) return false;

      const payload = {
        title: s.title.trim() || null,
        body: s.body,
        type: "TEXT",
        collectionId: s.collectionId || null,
        revealDate:
          !s.collectionId && s.useCustomDate && s.customDate
            ? s.customDate
            : null,
        isSealed: seal ? true : false,
        isDraft: seal ? false : true,
      };

      const snapshot = JSON.stringify(payload);
      if (snapshot === lastSnapshotRef.current && !seal) {
        // Nothing changed since the last persisted save.
        return true;
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
        return true;
      } catch (err) {
        setSaveState("error");
        setTopError((err as Error).message);
        return false;
      }
    },
    [],
  );

  // Auto-save every 30s if dirty.
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
    const ok = await save();
    if (!ok) return;
    const id = stateRef.current.entryId;
    if (id) router.push(`/dashboard/entry/${id}/preview`);
  }

  async function openSealModal() {
    // Persist latest changes before opening the confirmation.
    await save();
    if (!hasContent()) {
      setTopError("Write something (or add a title) before sealing.");
      return;
    }
    setShowSealModal(true);
  }

  async function confirmSeal() {
    setSealing(true);
    const ok = await save({ seal: true });
    setSealing(false);
    if (!ok) return;
    setShowSealModal(false);
    router.push(
      collectionId ? `/dashboard/collection/${collectionId}` : "/dashboard",
    );
    router.refresh();
  }

  const { wordCount, readingTime } = getReadingStats(body);

  return (
    <main className="min-h-screen bg-[#fdfbf5]">
      <header className="sticky top-0 z-40 bg-[#fdfbf5]/90 backdrop-blur-md border-b border-navy/[0.06]">
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
          <button
            type="button"
            onClick={handleProofRead}
            disabled={!hasContent() || saveState === "saving"}
            className="text-sm font-semibold text-ink-mid hover:text-navy transition-colors px-3 py-2 disabled:opacity-50"
          >
            Proof Read
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[680px] px-6 pt-10 pb-40">
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-sky mb-5">
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

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (hasContent()) save();
          }}
          placeholder="Title (optional)"
          aria-label="Letter title"
          className="w-full px-0 py-2 text-[32px] lg:text-[36px] font-extrabold text-navy bg-transparent border-0 outline-none placeholder-ink-light/60 tracking-[-0.8px] leading-tight mb-4"
        />

        <TiptapEditor
          initialContent={body}
          onUpdate={setBody}
          onBlur={() => {
            if (hasContent()) save();
          }}
          placeholder={`Dear ${childFirstName},`}
        />

        {/* Collection selector */}
        {collections.length > 0 && (
          <div className="mt-8">
            <label className="block text-[11px] font-bold tracking-[0.1em] uppercase text-ink-mid mb-1.5">
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
              className="w-full min-h-[44px] px-3 rounded-lg border border-navy/15 text-sm text-navy bg-white focus:outline-none focus:border-sky focus:ring-2 focus:ring-sky/20 disabled:opacity-60 disabled:cursor-not-allowed"
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

        {/* Unlock date */}
        <div className="mt-8">
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
                    {vaultRevealDate ? ` — ${formatLong(vaultRevealDate)}` : ""}
                  </span>
                  <span className="text-ink-light italic ml-1">(default)</span>
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
                  className="ml-6 px-3 py-2 border border-navy/15 rounded-lg text-sm text-navy bg-white outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
                />
              )}
            </div>
          )}
        </div>

        {topError && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {topError}
          </p>
        )}
      </div>

      {/* Sticky footer bar: save state + word count + seal button */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-navy/[0.08]">
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
            onClick={openSealModal}
            disabled={!hasContent()}
            className="bg-navy text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-navy-mid transition-colors disabled:opacity-50"
          >
            Seal Moment →
          </button>
        </div>
      </footer>

      {showSealModal && (
        <SealMomentModal
          title={title.trim() || "Untitled"}
          unlockDateLabel={
            selectedCollection?.revealDate
              ? formatLong(selectedCollection.revealDate)
              : !inCollection && useCustomDate && customDate
                ? formatLong(customDate)
                : vaultRevealDate
                  ? formatLong(vaultRevealDate)
                  : "the vault reveal date"
          }
          childFirstName={childFirstName}
          onCancel={() => setShowSealModal(false)}
          onConfirm={confirmSeal}
          busy={sealing}
        />
      )}
    </main>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === "saving") return <span className="italic">Saving…</span>;
  if (state === "saved") return <span>Auto-saved</span>;
  if (state === "error")
    return <span className="text-red-600">⚠ Save failed</span>;
  return <span className="text-ink-light/70">Not saved yet</span>;
}

function SealMomentModal({
  title,
  unlockDateLabel,
  childFirstName,
  onCancel,
  onConfirm,
  busy,
}: {
  title: string;
  unlockDateLabel: string;
  childFirstName: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[440px]"
      >
        <div className="px-8 pt-10 pb-6 text-center">
          <div aria-hidden="true" className="text-4xl mb-5">
            ✉️
          </div>
          <h2 className="text-2xl font-extrabold text-navy tracking-[-0.3px] mb-3">
            Seal this moment?
          </h2>
          <p className="text-[15px] font-semibold text-navy mb-1">
            &ldquo;{title}&rdquo;
          </p>
          <p className="text-sm text-ink-mid mb-5">
            Unlocks {unlockDateLabel}
          </p>
          <p className="text-sm text-ink-mid leading-[1.6]">
            Once sealed, {childFirstName} won&rsquo;t be able to see this until
            the reveal date. You can still edit it until then.
          </p>
        </div>
        <div className="px-8 py-4 border-t border-navy/[0.08] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-semibold text-ink-mid hover:text-navy transition-colors px-3 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="bg-navy text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-navy-mid transition-colors disabled:opacity-60"
          >
            {busy ? "Sealing…" : "Seal Moment →"}
          </button>
        </div>
      </div>
    </div>
  );
}
