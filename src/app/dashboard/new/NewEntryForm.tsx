"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

export type CollectionOption = {
  id: string;
  title: string;
  coverEmoji: string | null;
  revealDate: string | null;
};

function formatLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

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
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [collectionId, setCollectionId] = useState<string | "">(
    lockedCollectionId ?? "",
  );
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCollection = collectionId
    ? collections.find((c) => c.id === collectionId) ?? null
    : null;
  const inCollection = Boolean(selectedCollection);

  const canSubmit = body.trim().length > 0 && !saving;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "TEXT",
          title: title.trim() || null,
          body: body.trim(),
          revealDate:
            !inCollection && useCustomDate && customDate ? customDate : null,
          collectionId: collectionId || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't seal your letter. Try again?");
      }
      // If it's part of a collection, return there; otherwise dashboard.
      if (collectionId) {
        router.push(`/dashboard/collection/${collectionId}`);
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

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
            type="submit"
            form="new-entry-form"
            disabled={!canSubmit}
            className="bg-navy text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-navy-mid transition-colors disabled:opacity-50"
          >
            {saving ? "Sealing…" : "Seal letter →"}
          </button>
        </div>
      </header>

      <form
        id="new-entry-form"
        onSubmit={handleSubmit}
        className="mx-auto max-w-[680px] px-6 pt-10 pb-32"
      >
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-sky mb-5">
          Writing to {childFirstName}
          {selectedCollection && (
            <>
              {" · "}
              <span className="text-navy">
                {selectedCollection.coverEmoji ?? "📖"} {selectedCollection.title}
              </span>
            </>
          )}
        </p>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          aria-label="Letter title"
          className="w-full px-0 py-2 text-[32px] lg:text-[36px] font-extrabold text-navy bg-transparent border-0 outline-none placeholder-ink-light/60 tracking-[-0.8px] leading-tight"
        />

        {/* Collection selector */}
        {collections.length > 0 && (
          <div className="mt-4 mb-4">
            <label className="block text-[11px] font-bold tracking-[0.1em] uppercase text-ink-mid mb-1.5">
              Add to a collection {lockedCollectionId && "(locked)"}
              {!lockedCollectionId && (
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
              disabled={saving || Boolean(lockedCollectionId)}
              className="w-full min-h-[44px] px-3 rounded-lg border border-navy/15 text-sm text-navy bg-white focus:outline-none focus:border-sky focus:ring-2 focus:ring-sky/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">None — standalone entry</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.coverEmoji ?? "📖"} {c.title}
                </option>
              ))}
            </select>
            {selectedCollection && (
              <p className="mt-1.5 text-xs italic text-ink-light">
                This entry will unlock with the &ldquo;{selectedCollection.title}&rdquo;
                collection
                {selectedCollection.revealDate
                  ? ` on ${formatLong(selectedCollection.revealDate)}`
                  : vaultRevealDate
                    ? ` on ${formatLong(vaultRevealDate)}`
                    : ""}
                .
              </p>
            )}
          </div>
        )}

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Dear ${childFirstName},\n\n`}
          rows={18}
          aria-label="Letter body"
          className="w-full mt-4 px-0 py-2 text-[17px] text-navy bg-transparent border-0 outline-none placeholder-ink-light/60 leading-[1.75] resize-none"
        />

        {/* Per-entry override only relevant for standalone entries */}
        {!inCollection && (
          <details className="mt-8 rounded-xl border border-navy/[0.08] bg-white/60 px-5 py-4">
            <summary className="cursor-pointer text-sm text-ink-mid hover:text-navy transition-colors list-none flex items-center justify-between">
              <span>
                <span className="font-semibold text-navy">
                  Unlock on a different date?
                </span>{" "}
                <span className="text-ink-light italic text-xs">(optional)</span>
              </span>
              <span aria-hidden="true" className="text-ink-light text-xs">
                ▾
              </span>
            </summary>
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm text-ink-mid">
                <input
                  type="checkbox"
                  checked={useCustomDate}
                  onChange={(e) => setUseCustomDate(e.target.checked)}
                  className="w-4 h-4 accent-navy"
                />
                <span>
                  Override the vault&rsquo;s reveal date for this letter
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
                  className="px-4 py-2 border border-navy/15 rounded-lg text-sm text-navy bg-white outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
                />
              )}
              {!useCustomDate && vaultRevealDate && (
                <p className="text-xs italic text-ink-light">
                  Will unlock with the rest of the vault on{" "}
                  {formatLong(vaultRevealDate)}.
                </p>
              )}
            </div>
          </details>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <p className="mt-10 text-xs italic text-ink-light text-center">
          Sealed once you click &ldquo;Seal letter&rdquo;. Edit anytime before
          the reveal date.
        </p>
      </form>
    </main>
  );
}
