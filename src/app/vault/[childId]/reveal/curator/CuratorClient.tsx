"use client";

import {
  ArrowLeft,
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mic,
  Music,
  Plus,
  Save,
  Search,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { VaultPreviewClient } from "@/app/vault/[childId]/preview/PreviewClient";
import type {
  RevealCapsule,
  RevealContribution,
} from "@/app/reveal/[token]/RevealExperience";
import { formatLong } from "@/lib/dateFormatters";

const SLOTS = 5;

export type CuratorEntry = {
  id: string;
  title: string | null;
  bodySnippet: string;
  bodyHasContent: boolean;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  media: { kind: "photo" | "voice" | "video"; url: string }[];
  createdAt: string;
  collectionTitle: string | null;
};

export type CuratorSlide = {
  entryId: string;
  view: "letter" | "VOICE" | "PHOTO" | "VIDEO";
};

type LibraryItem = CuratorSlide & {
  entry: CuratorEntry;
};

type Song = {
  id: string;
  name: string;
  durationSec: number | null;
  previewUrl: string | null;
};

/**
 * Curator UI for vault.revealMode === BUILD.
 *
 * Layout:
 *   - 5 slot cards at the top (taps open the library picker
 *     focused on filling that slot)
 *   - Music picker (radio list of admin-uploaded songs + preview)
 *   - Library picker (modal-ish drawer): search + type filter,
 *     each entry expanded into its modality slides
 *   - Preview the Reveal button — only enabled when all 5 slots
 *     are filled. Renders the preview inline without leaving the
 *     page so the user can tweak + retry.
 *   - Save button — persists curatedSlides + revealSongId to the
 *     vault.
 *
 * State is local until Save fires. Closing without saving keeps
 * whatever was last persisted on the server.
 */
export function CuratorClient({
  vaultId,
  childId,
  childFirstName,
  revealDate,
  library,
  initialSlides,
  initialSongId,
}: {
  vaultId: string;
  childId: string;
  childFirstName: string;
  revealDate: string | null;
  library: CuratorEntry[];
  initialSlides: CuratorSlide[];
  initialSongId: string | null;
}) {
  const router = useRouter();
  const [slides, setSlides] = useState<(CuratorSlide | null)[]>(() => {
    const padded: (CuratorSlide | null)[] = [];
    for (let i = 0; i < SLOTS; i++) padded.push(initialSlides[i] ?? null);
    return padded;
  });
  const [songId, setSongId] = useState<string | null>(initialSongId);
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<
    "all" | "letter" | "VOICE" | "PHOTO" | "VIDEO"
  >("all");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load song catalog for the music picker. Falls back to "no
  // music" if the request fails or there are zero songs.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/reveal-songs", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const body = (await res.json()) as { songs: Song[] };
        if (!cancelled) setSongs(body.songs);
      } catch {
        if (!cancelled) setSongs([]);
      } finally {
        if (!cancelled) setSongsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Expand the library into per-modality items so the picker
  // shows one card per modality (so a letter+voice entry shows
  // up as two pickable items).
  const libraryItems = useMemo<LibraryItem[]>(() => {
    const out: LibraryItem[] = [];
    for (const e of library) {
      if (e.bodyHasContent) {
        out.push({ entryId: e.id, view: "letter", entry: e });
      }
      for (const m of e.media) {
        const view = m.kind.toUpperCase() as "VOICE" | "PHOTO" | "VIDEO";
        out.push({ entryId: e.id, view, entry: e });
      }
    }
    return out;
  }, [library]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return libraryItems.filter((item) => {
      if (filterType !== "all" && item.view !== filterType) return false;
      if (q) {
        const hay = [
          item.entry.title ?? "",
          item.entry.bodySnippet,
          item.entry.collectionTitle ?? "",
          new Date(item.entry.createdAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // Hide items that are already in another slot — picker
      // should never let you double-add the same modality.
      const taken = slides.some(
        (s, i) =>
          s &&
          s.entryId === item.entryId &&
          s.view === item.view &&
          i !== pickerSlot,
      );
      return !taken;
    });
  }, [libraryItems, search, filterType, slides, pickerSlot]);

  function openPickerFor(slot: number) {
    setPickerSlot(slot);
    setSearch("");
    setFilterType("all");
    setPickerOpen(true);
  }

  function pick(item: LibraryItem) {
    setSlides((prev) => {
      const next = [...prev];
      next[pickerSlot] = { entryId: item.entryId, view: item.view };
      return next;
    });
    setPickerOpen(false);
  }

  function clearSlot(slot: number) {
    setSlides((prev) => {
      const next = [...prev];
      next[slot] = null;
      return next;
    });
  }

  const filledCount = slides.filter((s) => s !== null).length;
  const allFilled = filledCount === SLOTS;
  const dirty = useMemo(() => {
    if (songId !== initialSongId) return true;
    for (let i = 0; i < SLOTS; i++) {
      const a = slides[i];
      const b = initialSlides[i] ?? null;
      if ((a?.entryId ?? null) !== (b?.entryId ?? null)) return true;
      if ((a?.view ?? null) !== (b?.view ?? null)) return true;
    }
    return false;
  }, [slides, initialSlides, songId, initialSongId]);

  async function save() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/account/vaults/${vaultId}/reveal`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revealMode: "BUILD",
          curatedSlides: slides.filter(
            (s): s is CuratorSlide => s !== null,
          ),
          revealSongId: songId,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't save.");
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2200);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Build a temporary "preview" payload from the current (possibly
  // unsaved) slot state so the user can preview without saving.
  // Each curated slide becomes a reveal contribution carrying
  // ONLY the modality it represents — so a letter slot for an
  // entry with audio shows just the letter, not the audio
  // (matches the per-modality slide contract).
  const previewContributions = useMemo<RevealContribution[]>(() => {
    const out: RevealContribution[] = [];
    for (const slot of slides) {
      if (!slot) continue;
      const entry = library.find((e) => e.id === slot.entryId);
      if (!entry) continue;
      const filteredMedia: { kind: "photo" | "voice" | "video"; url: string }[] = [];
      if (slot.view === "VOICE")
        filteredMedia.push(...entry.media.filter((m) => m.kind === "voice"));
      if (slot.view === "PHOTO")
        filteredMedia.push(...entry.media.filter((m) => m.kind === "photo"));
      if (slot.view === "VIDEO")
        filteredMedia.push(...entry.media.filter((m) => m.kind === "video"));

      out.push({
        id: `${entry.id}-${slot.view}`,
        authorName: childFirstName ? "" : "",
        authorAvatarUrl: null,
        type:
          slot.view === "letter"
            ? "TEXT"
            : (slot.view as "VOICE" | "PHOTO" | "VIDEO"),
        title: slot.view === "letter" ? entry.title : null,
        body: slot.view === "letter" ? snippetAsHtml(entry) : null,
        media: filteredMedia,
        createdAt: entry.createdAt,
        collectionTitle: entry.collectionTitle,
      });
    }
    return out;
  }, [slides, library, childFirstName]);

  const previewCapsule: RevealCapsule = {
    id: vaultId,
    title: `${childFirstName}'s Capsule`,
    recipientName: childFirstName,
    occasionType: "OTHER",
    tone: "LOVE",
    revealDate: revealDate ?? new Date(Date.now() + 365 * 86400000).toISOString(),
    isFirstOpen: true,
    hasCompleted: false,
  };

  if (previewOpen) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setPreviewOpen(false)}
          aria-label="Close preview"
          className="fixed top-4 right-4 z-[300] w-10 h-10 rounded-full bg-white/90 backdrop-blur border border-navy/10 text-navy hover:bg-white flex items-center justify-center shadow-[0_2px_8px_rgba(15,31,61,0.12)]"
          style={{ marginTop: "max(env(safe-area-inset-top), 4px)" }}
        >
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        <VaultPreviewClient
          realCapsule={previewCapsule}
          realContributions={previewContributions}
          childId={childId}
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-cream pb-20">
      <div className="mx-auto max-w-[920px] px-5 sm:px-6 lg:px-10 pt-6">
        <Link
          href={`/vault/${childId}`}
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-mid hover:text-navy transition-colors"
        >
          <ArrowLeft size={13} strokeWidth={2} aria-hidden="true" />
          Back to capsule
        </Link>

        <header className="mt-4 mb-8">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-2">
            Customize the reveal
          </p>
          <h1 className="text-[28px] sm:text-[34px] font-extrabold text-navy tracking-[-0.4px] leading-tight">
            Pick your 5 highlights
          </h1>
          <p className="mt-2 text-[14px] text-ink-mid max-w-[560px]">
            These play first, in order, when {childFirstName} opens the
            reveal. Letters, voice notes, photos, and videos are all
            pickable individually — a single memory can fill more than one
            slot if it has multiple kinds.
          </p>
        </header>

        {/* Slots */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {slides.map((slot, i) => {
            const entry = slot ? library.find((e) => e.id === slot.entryId) : null;
            const filled = slot != null && entry != null;
            return (
              <div
                key={i}
                className={`relative rounded-2xl border p-3 min-h-[160px] flex flex-col transition-all ${
                  filled
                    ? "bg-white border-amber/40 shadow-[0_4px_14px_rgba(196,122,58,0.08)]"
                    : "bg-white/40 border-dashed border-navy/15 hover:border-amber/30"
                }`}
              >
                <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-ink-light mb-2">
                  Slide {i + 1}
                </div>
                {filled && entry && slot ? (
                  <>
                    <div className="text-[12px] font-bold text-navy mb-1 line-clamp-2">
                      {entry.title?.trim() || entry.bodySnippet.slice(0, 60) || "Untitled"}
                    </div>
                    <ViewBadge view={slot.view} />
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => clearSlot(i)}
                        className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => openPickerFor(i)}
                        className="text-[11px] font-semibold text-amber hover:text-amber-dark"
                      >
                        Swap
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openPickerFor(i)}
                    className="flex-1 flex flex-col items-center justify-center text-ink-light hover:text-amber transition-colors gap-1.5"
                  >
                    <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
                    <span className="text-[12px] font-semibold">Add</span>
                  </button>
                )}
              </div>
            );
          })}
        </section>

        {/* Music picker */}
        <section className="mt-10">
          <h2 className="text-[16px] font-extrabold text-navy mb-3 inline-flex items-center gap-2">
            <Music size={16} strokeWidth={1.75} aria-hidden="true" />
            Background music
          </h2>
          {songsLoading ? (
            <p className="text-sm text-ink-light">Loading songs…</p>
          ) : songs.length === 0 ? (
            <p className="text-sm text-ink-light italic">
              No songs available yet — your reveal will run silent until
              admin uploads one.
            </p>
          ) : (
            <ul className="space-y-2 max-w-[560px]">
              <SongOption
                checked={songId === null}
                onChange={() => setSongId(null)}
                name="No background music"
                hint="Reveal plays silent."
              />
              {songs.map((s) => (
                <SongOption
                  key={s.id}
                  checked={songId === s.id}
                  onChange={() => setSongId(s.id)}
                  name={s.name}
                  hint={
                    s.durationSec
                      ? `${Math.floor(s.durationSec / 60)}:${(s.durationSec % 60).toString().padStart(2, "0")}`
                      : null
                  }
                  previewUrl={s.previewUrl}
                />
              ))}
            </ul>
          )}
        </section>

        {/* Theme picker — placeholder. */}
        <section className="mt-10">
          <h2 className="text-[16px] font-extrabold text-navy mb-3 inline-flex items-center gap-2">
            <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />
            Theme
          </h2>
          <div className="rounded-xl border border-dashed border-navy/15 bg-white/40 px-5 py-4 max-w-[560px]">
            <p className="text-sm text-ink-mid">Coming soon.</p>
          </div>
        </section>

        {/* Action row */}
        <section className="mt-12 sticky bottom-3 z-20">
          <div className="rounded-2xl border border-navy/10 bg-white/95 backdrop-blur shadow-[0_8px_24px_rgba(15,31,61,0.08)] px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[13px] text-ink-mid">
              {filledCount} / {SLOTS} slides picked
              {dirty && (
                <span className="ml-2 text-amber font-semibold">·  Unsaved</span>
              )}
              {saved && (
                <span className="ml-2 text-sage font-semibold inline-flex items-center gap-1">
                  <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                  Saved
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                disabled={!allFilled}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber/40 text-amber bg-amber-tint/40 text-[13px] font-bold hover:bg-amber-tint hover:border-amber transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
                Preview the Reveal
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || !dirty}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber text-white text-[13px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2
                    size={14}
                    strokeWidth={1.75}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Save size={14} strokeWidth={1.75} aria-hidden="true" />
                )}
                Save
              </button>
            </div>
          </div>
          {saveError && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {saveError}
            </p>
          )}
        </section>
      </div>

      {/* Library picker drawer */}
      {pickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pick a slide"
          className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPickerOpen(false);
          }}
        >
          <div className="bg-white w-full sm:max-w-[560px] sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col">
            <div className="px-5 py-4 border-b border-navy/[0.06] flex items-center justify-between">
              <h3 className="text-[16px] font-extrabold text-navy">
                Pick slide {pickerSlot + 1}
              </h3>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                aria-label="Close picker"
                className="w-8 h-8 rounded-full text-ink-mid hover:text-navy hover:bg-navy/[0.04] flex items-center justify-center"
              >
                <X size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <div className="px-5 pt-4 pb-2 space-y-3">
              <label className="block relative">
                <Search
                  size={14}
                  strokeWidth={2}
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light pointer-events-none"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title, words, dates, collections…"
                  className="w-full bg-white border border-navy/10 rounded-full pl-9 pr-3 py-2 text-[13px] text-navy placeholder-ink-light focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <FilterChip active={filterType === "all"} onClick={() => setFilterType("all")}>
                  All
                </FilterChip>
                <FilterChip
                  active={filterType === "letter"}
                  onClick={() => setFilterType("letter")}
                  icon={<FileText size={11} strokeWidth={2} aria-hidden="true" />}
                >
                  Letters
                </FilterChip>
                <FilterChip
                  active={filterType === "VOICE"}
                  onClick={() => setFilterType("VOICE")}
                  icon={<Mic size={11} strokeWidth={2} aria-hidden="true" />}
                >
                  Audio
                </FilterChip>
                <FilterChip
                  active={filterType === "PHOTO"}
                  onClick={() => setFilterType("PHOTO")}
                  icon={<ImageIcon size={11} strokeWidth={2} aria-hidden="true" />}
                >
                  Photos
                </FilterChip>
                <FilterChip
                  active={filterType === "VIDEO"}
                  onClick={() => setFilterType("VIDEO")}
                  icon={<Video size={11} strokeWidth={2} aria-hidden="true" />}
                >
                  Videos
                </FilterChip>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {filteredItems.length === 0 ? (
                <p className="text-center text-ink-light italic py-10 text-[13px]">
                  Nothing matches.
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredItems.map((item, idx) => (
                    <li key={`${item.entryId}-${item.view}-${idx}`}>
                      <button
                        type="button"
                        onClick={() => pick(item)}
                        className="w-full text-left rounded-xl border border-navy/[0.08] bg-white px-4 py-3 hover:border-amber/40 hover:shadow-[0_4px_14px_rgba(196,122,58,0.08)] transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-navy text-[13px] truncate">
                              {item.entry.title?.trim() ||
                                item.entry.bodySnippet.slice(0, 60) ||
                                "Untitled"}
                            </div>
                            <div className="text-[11px] text-ink-light mt-0.5">
                              {item.entry.collectionTitle ?? "Main Diary"} ·{" "}
                              {formatLong(item.entry.createdAt)}
                            </div>
                          </div>
                          <ViewBadge view={item.view} />
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ViewBadge({ view }: { view: CuratorSlide["view"] }) {
  const map = {
    letter: { label: "Letter", icon: <FileText size={11} strokeWidth={2} /> },
    VOICE: { label: "Voice", icon: <Mic size={11} strokeWidth={2} /> },
    PHOTO: { label: "Photo", icon: <ImageIcon size={11} strokeWidth={2} /> },
    VIDEO: { label: "Video", icon: <Video size={11} strokeWidth={2} /> },
  } as const;
  const meta = map[view];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] font-bold text-amber-dark bg-amber-tint px-2 py-0.5 rounded-full">
      {meta.icon}
      {meta.label}
    </span>
  );
}

function SongOption({
  checked,
  onChange,
  name,
  hint,
  previewUrl,
}: {
  checked: boolean;
  onChange: () => void;
  name: string;
  hint?: string | null;
  previewUrl?: string | null;
}) {
  return (
    <li>
      <label
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
          checked
            ? "border-amber bg-amber-tint/40"
            : "border-navy/[0.08] bg-white hover:border-amber/30"
        }`}
      >
        <input
          type="radio"
          name="reveal-song"
          checked={checked}
          onChange={onChange}
          className="accent-amber"
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-navy text-[13px]">{name}</div>
          {hint && <div className="text-[11px] text-ink-light">{hint}</div>}
        </div>
        {previewUrl && (
          <audio
            src={previewUrl}
            controls
            className="h-8 max-w-[180px]"
            preload="none"
          />
        )}
      </label>
    </li>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-semibold transition-colors ${
        active
          ? "bg-amber text-white"
          : "bg-white border border-navy/10 text-ink-mid hover:border-navy/30"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function snippetAsHtml(entry: CuratorEntry): string {
  // The preview path expects body HTML, not plain text. We don't
  // have the original entry body here (only a 200-char snippet
  // used for picker display); wrap it in a <p> so LetterCard
  // renders cleanly.
  return entry.bodySnippet ? `<p>${escapeHtml(entry.bodySnippet)}</p>` : "";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
