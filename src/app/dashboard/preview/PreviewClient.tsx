"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { EntryTypeBadge } from "@/components/ui/EntryTypeBadge";
import { TimeVault, type TimeVaultState } from "@/components/ui/TimeVault";
import {
  MediaDisplay,
  type MediaItem,
} from "@/components/editor/MediaDisplay";

export type PreviewMedia = MediaItem;

export type PreviewEntry = {
  id: string;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  title: string | null;
  body: string | null;
  createdAt: string;
  media: PreviewMedia[];
};

export type PreviewCollection = {
  id: string;
  title: string;
  description: string | null;
  coverEmoji: string | null;
  revealDate: string | null;
  entries: PreviewEntry[];
};

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function PreviewClient({
  childFirstName,
  parentFirstName,
  revealDate,
  standaloneEntries,
  collections,
}: {
  childFirstName: string;
  parentFirstName: string;
  revealDate: string | null;
  standaloneEntries: PreviewEntry[];
  collections: PreviewCollection[];
}) {
  const [state, setState] = useState<TimeVaultState>("sealed");
  const [revealed, setRevealed] = useState(false);
  const [openCollection, setOpenCollection] = useState<string | null>(null);

  // Reveal-day preview sequence: sealed → unlocking → open, then the
  // entries fade in once the 1.8s unlock animation has fully landed.
  useEffect(() => {
    const t1 = setTimeout(() => setState("unlocking"), 700);
    const t2 = setTimeout(() => setState("open"), 2500);
    const t3 = setTimeout(() => setRevealed(true), 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const totalEntries =
    standaloneEntries.length +
    collections.reduce((acc, c) => acc + c.entries.length, 0);

  const nothingYet = totalEntries === 0;
  const currentCollection = openCollection
    ? collections.find((c) => c.id === openCollection) ?? null
    : null;

  return (
    <main className="min-h-screen bg-warm-slate text-white relative overflow-x-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 w-[420px] h-[420px]"
        style={{
          background:
            "radial-gradient(circle, rgba(201,168,76,0.22) 0%, rgba(201,168,76,0.05) 40%, transparent 70%)",
          opacity: revealed ? 1 : 0.4,
          transition: "opacity 1.2s ease",
        }}
      />

      <header className="relative sticky top-0 z-40 bg-warm-slate/90 backdrop-blur-md border-b border-white/10">
        <div className="mx-auto max-w-[900px] px-6 py-4 flex items-center justify-between">
          {currentCollection ? (
            <button
              type="button"
              onClick={() => setOpenCollection(null)}
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>Back to vault</span>
            </button>
          ) : (
            <Link
              href="/dashboard"
              prefetch={false}
              className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
              <span>Back to dashboard</span>
            </Link>
          )}
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/50 font-bold hidden sm:block">
            Reveal preview
          </p>
        </div>
      </header>

      {!currentCollection ? (
        <>
          <section className="relative mx-auto max-w-[720px] px-6 pt-10 lg:pt-14 text-center">
            <p className="text-[11px] uppercase tracking-[0.14em] text-gold font-bold mb-3">
              What {childFirstName} will see on reveal day
            </p>
            <h1 className="text-[32px] lg:text-[44px] font-extrabold tracking-[-0.8px] leading-[1.05] text-white mb-2">
              {childFirstName}&rsquo;s Vault
            </h1>
            {revealDate && (
              <p className="text-white/60 text-base">
                Opens {formatLong(revealDate)}
              </p>
            )}
          </section>

          <section className="relative flex justify-center my-10 lg:my-14">
            <TimeVault
              state={state}
              ariaLabel={`${childFirstName}'s time vault`}
            />
          </section>

          <section
            className="relative mx-auto max-w-[720px] px-6 text-center transition-opacity duration-700"
            style={{ opacity: revealed ? 1 : 0 }}
          >
            <p className="text-2xl lg:text-3xl font-bold text-white tracking-[-0.3px] mb-2">
              {nothingYet
                ? `${parentFirstName} hasn't sealed anything yet.`
                : totalEntries === 1
                  ? `One memory from ${parentFirstName}.`
                  : `${totalEntries.toLocaleString()} memories from ${parentFirstName}.`}
            </p>
            <p className="text-white/60 text-[15px]">
              {nothingYet
                ? "As you seal letters, voice notes, photos, and videos, they'll appear here."
                : "Open each journal or letter to read what's inside."}
            </p>
          </section>

          <section className="relative mx-auto max-w-[680px] px-6 pt-12 pb-24">
            {nothingYet && revealed ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-10 text-center">
                <p className="text-white/70 mb-5">
                  The vault is still empty. Go write {childFirstName} something.
                </p>
                <Link
                  href="/dashboard/new"
                  prefetch={false}
                  className="inline-block bg-gold text-navy px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-light transition-colors"
                >
                  Write your first letter →
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Collections as journal books */}
                {collections.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setOpenCollection(c.id)}
                    className="block w-full text-left rounded-2xl bg-[#fdfbf5] text-navy px-7 py-7 lg:px-9 lg:py-9 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] hover:shadow-[0_24px_60px_-16px_rgba(201,168,76,0.4)] transition-shadow"
                    style={{
                      opacity: revealed ? 1 : 0,
                      transform: revealed ? "translateY(0)" : "translateY(20px)",
                      transition:
                        "opacity 0.7s ease, transform 0.7s cubic-bezier(0.2,0.8,0.3,1), box-shadow 0.3s ease",
                      transitionDelay: revealed ? `${i * 120}ms` : "0ms",
                    }}
                  >
                    <div className="flex items-start gap-5">
                      <div
                        aria-hidden="true"
                        className="shrink-0 w-14 h-14 rounded-xl bg-gold-tint flex items-center justify-center text-3xl"
                      >
                        {c.coverEmoji ?? "📖"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-amber mb-1">
                          Journal · {c.entries.length.toLocaleString()} {c.entries.length === 1 ? "entry" : "entries"}
                        </div>
                        <h2 className="text-2xl lg:text-[28px] font-extrabold tracking-[-0.4px] leading-tight mb-2 text-navy">
                          {c.title}
                        </h2>
                        {c.description && (
                          <p className="text-sm text-ink-mid italic">
                            &ldquo;{c.description}&rdquo;
                          </p>
                        )}
                        <p className="mt-3 text-[13px] font-semibold text-amber">
                          Open Journal →
                        </p>
                      </div>
                    </div>
                  </button>
                ))}

                {/* Standalone entries as individual letters */}
                {standaloneEntries.map((entry, i) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    parentFirstName={parentFirstName}
                    delay={(collections.length + i) * 120}
                    revealed={revealed}
                  />
                ))}
              </div>
            )}

            {!nothingYet && revealed && (
              <div className="mt-12 text-center">
                <Link
                  href="/dashboard"
                  prefetch={false}
                  className="inline-block text-sm font-medium text-white/70 hover:text-white transition-colors underline underline-offset-4"
                >
                  Return to your dashboard
                </Link>
              </div>
            )}
          </section>
        </>
      ) : (
        <CollectionReader
          collection={currentCollection}
          parentFirstName={parentFirstName}
          vaultRevealDate={revealDate}
        />
      )}
    </main>
  );
}

function EntryCard({
  entry,
  parentFirstName,
  delay,
  revealed,
}: {
  entry: PreviewEntry;
  parentFirstName: string;
  delay: number;
  revealed: boolean;
}) {
  return (
    <div
      className="rounded-2xl bg-[#fdfbf5] text-navy px-7 py-7 lg:px-9 lg:py-9 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)]"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(20px)",
        transition:
          "opacity 0.7s ease, transform 0.7s cubic-bezier(0.2,0.8,0.3,1)",
        transitionDelay: revealed ? `${delay}ms` : "0ms",
      }}
    >
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <EntryTypeBadge type={entry.type} />
        <span className="text-[11px] text-ink-light">
          Sealed {formatShort(entry.createdAt)}
        </span>
      </div>
      {entry.title && (
        <h2 className="text-2xl lg:text-[28px] font-extrabold tracking-[-0.4px] leading-tight mb-4 text-navy">
          {entry.title}
        </h2>
      )}
      {entry.body && (
        <div
          className="tiptap-editor text-[16px] leading-[1.75] text-ink-mid"
          dangerouslySetInnerHTML={{ __html: entry.body }}
        />
      )}
      <MediaDisplay items={entry.media} />
      <div className="mt-6 pt-4 border-t border-navy/[0.06] text-[11px] uppercase tracking-[0.14em] font-bold text-gold">
        — {parentFirstName}
      </div>
    </div>
  );
}

function CollectionReader({
  collection,
  parentFirstName,
  vaultRevealDate,
}: {
  collection: PreviewCollection;
  parentFirstName: string;
  vaultRevealDate: string | null;
}) {
  const revealDate = collection.revealDate ?? vaultRevealDate;

  return (
    <>
      <section className="relative mx-auto max-w-[720px] px-6 pt-10 lg:pt-14 text-center">
        <div
          aria-hidden="true"
          className="mx-auto w-16 h-16 rounded-2xl bg-gold-tint flex items-center justify-center text-4xl mb-4"
        >
          {collection.coverEmoji ?? "📖"}
        </div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-gold font-bold mb-2">
          Journal · {collection.entries.length.toLocaleString()}{" "}
          {collection.entries.length === 1 ? "entry" : "entries"}
        </p>
        <h1 className="text-[32px] lg:text-[44px] font-extrabold tracking-[-0.8px] leading-[1.05] text-white mb-2">
          {collection.title}
        </h1>
        {collection.description && (
          <p className="text-white/60 italic text-base">
            &ldquo;{collection.description}&rdquo;
          </p>
        )}
        {revealDate && (
          <p className="text-white/50 text-sm mt-2">
            Opens {formatLong(revealDate)}
          </p>
        )}
      </section>

      <section className="relative mx-auto max-w-[680px] px-6 pt-10 pb-24">
        {collection.entries.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-10 text-center">
            <p className="text-white/70">
              This journal is still empty.
            </p>
          </div>
        ) : (
          <ul className="space-y-5">
            {collection.entries.map((entry, i) => (
              <li key={entry.id}>
                <div className="rounded-2xl bg-[#fdfbf5] text-navy px-7 py-7 lg:px-9 lg:py-9 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="w-7 h-7 rounded-full bg-amber text-white text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <EntryTypeBadge type={entry.type} />
                    <span className="text-[11px] text-ink-light">
                      Sealed {formatShort(entry.createdAt)}
                    </span>
                  </div>
                  {entry.title && (
                    <h2 className="text-2xl lg:text-[28px] font-extrabold tracking-[-0.4px] leading-tight mb-4 text-navy">
                      {entry.title}
                    </h2>
                  )}
                  {entry.body && (
                    <div
                      className="tiptap-editor text-[16px] leading-[1.75] text-ink-mid"
                      dangerouslySetInnerHTML={{ __html: entry.body }}
                    />
                  )}
                  <MediaDisplay items={entry.media} />
                  <div className="mt-6 pt-4 border-t border-navy/[0.06] text-[11px] uppercase tracking-[0.14em] font-bold text-gold">
                    — {parentFirstName}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
