"use client";

import {
  BookHeart,
  Heart,
  Lightbulb,
  Pencil,
  Smile,
  Sparkles,
  Star,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, type FormEvent } from "react";

import { MediaAttachments } from "@/components/editor/MediaAttachments";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { formatLong } from "@/lib/dateFormatters";

type CollectionOption = {
  id: string;
  title: string;
  revealDate: string | null;
};

type Props = {
  vaultId: string;
  childId: string;
  childFirstName: string;
  revealDate: string | null;
  initialCollectionId: string | null;
  collections: CollectionOption[];
};

const MAIN_DIARY_VALUE = "__main_diary__";

const PROMPTS: { icon: React.ReactNode; label: string }[] = [
  { icon: <Smile size={14} strokeWidth={1.75} />, label: "What made you laugh today?" },
  { icon: <Heart size={14} strokeWidth={1.75} />, label: "Something I love about you" },
  { icon: <BookHeart size={14} strokeWidth={1.75} />, label: "A favorite memory together" },
  { icon: <Star size={14} strokeWidth={1.75} />, label: "A milestone worth remembering" },
  { icon: <Sun size={14} strokeWidth={1.75} />, label: "What I hope for your future" },
  { icon: <Lightbulb size={14} strokeWidth={1.75} />, label: "Something I want you to know" },
];

/**
 * Vault-side clone of the CapsuleContributeForm editor phase. Same
 * visual chrome (instruction banner, Tiptap card with scroll rail,
 * media attachments, footer actions) but wired for authenticated
 * parents writing to the Entry table instead of public contributors
 * writing to CapsuleContribution.
 *
 * Media uploads persist directly to the Entry row via the shared
 * upload/complete endpoint, so the form doesn't need to track keys
 * locally the way the public variant does.
 *
 * The copy here mirrors the CELEBRATION tone for now — we can swap
 * in vault-specific prompts later without touching the layout.
 */
export function MemoryEditorForm({
  vaultId,
  childId,
  childFirstName,
  revealDate,
  initialCollectionId,
  collections,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [collectionId, setCollectionId] = useState<string | null>(
    initialCollectionId,
  );
  const [entryId, setEntryId] = useState<string | null>(null);
  const [extraHeight, setExtraHeight] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stateRef = useRef({ title, body, collectionId, entryId });
  stateRef.current = { title, body, collectionId, entryId };

  const selectedCollection = collections.find((c) => c.id === collectionId);
  const effectiveRevealDate = selectedCollection?.revealDate ?? revealDate;

  const bodyText = body.replace(/<[^>]*>/g, "").trim();
  const hasContent = Boolean(title.trim()) || bodyText.length > 0;

  /**
   * Creates a draft Entry lazily so MediaAttachments has something to
   * anchor uploads to. Returns null if the user hasn't typed anything
   * yet — matches the contract the attachments component expects.
   */
  const ensureEntry = useCallback(async (): Promise<string | null> => {
    const s = stateRef.current;
    if (s.entryId) return s.entryId;
    const sBodyText = s.body.replace(/<[^>]*>/g, "").trim();
    if (!s.title.trim() && sBodyText.length === 0) return null;
    try {
      const res = await fetch("/api/dashboard/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultId,
          collectionId: s.collectionId,
          title: s.title.trim() || null,
          body: s.body || null,
          type: "TEXT",
          isDraft: true,
          isSealed: false,
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { id?: string };
      if (data.id) {
        setEntryId(data.id);
        return data.id;
      }
      return null;
    } catch {
      return null;
    }
  }, [vaultId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!hasContent) {
      setError("Write something before sealing the memory.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const existingId = stateRef.current.entryId;
      if (existingId) {
        const res = await fetch(`/api/dashboard/entries/${existingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim() || null,
            body: body || null,
            isSealed: true,
            isDraft: false,
            collectionId,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? "Couldn't save.");
        }
      } else {
        const res = await fetch("/api/dashboard/entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vaultId,
            collectionId,
            title: title.trim() || null,
            body: body || null,
            type: "TEXT",
            isSealed: true,
            isDraft: false,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? "Couldn't save.");
        }
      }
      router.push(`/vault/${childId}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const editorPlaceholder = `Dear ${childFirstName},`;

  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-navy/[0.06]">
        <div className="px-6 py-4 flex items-center justify-between max-w-[720px] mx-auto">
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-bold text-amber">
            <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
            {childFirstName}&rsquo;s Time Capsule
          </span>
          <LogoSvg variant="dark" width={110} height={22} />
        </div>
      </header>

      <section className="mx-auto max-w-[720px] px-6 pt-4 pb-20">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-balance text-[26px] lg:text-[36px] font-extrabold text-navy leading-[1.08] tracking-[-0.8px]">
            A new memory for {childFirstName}
          </h1>
          <Link
            href={`/vault/${childId}`}
            prefetch={false}
            className="shrink-0 text-[13px] font-semibold text-ink-mid hover:text-navy transition-colors"
          >
            Cancel
          </Link>
        </div>
        {/* Collection picker — replaces the static reveal-date sentence.
            Reveal date now hangs off the right side and reflects the
            chosen collection (or vault default for Main Diary). */}
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-navy/10 bg-white px-3 py-2">
          <label
            htmlFor="collection-picker"
            className="text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-light shrink-0"
          >
            Collection
          </label>
          <select
            id="collection-picker"
            value={collectionId ?? MAIN_DIARY_VALUE}
            onChange={(e) =>
              setCollectionId(
                e.target.value === MAIN_DIARY_VALUE ? null : e.target.value,
              )
            }
            className="flex-1 min-w-0 bg-transparent text-[14px] font-semibold text-navy outline-none cursor-pointer"
          >
            <option value={MAIN_DIARY_VALUE}>Main Capsule Diary</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <span className="shrink-0 text-[12px] text-ink-mid italic">
            {effectiveRevealDate
              ? `Reveals on ${formatLong(effectiveRevealDate)}`
              : "No reveal date set"}
          </span>
        </div>

        <form onSubmit={submit} className="mt-3">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a title (optional)"
            className="w-full mb-2.5 px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy placeholder-ink-light/40 outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
          />

          {/* ── Inspiration card ─────────────────────────── */}
          <div className="mb-2.5 rounded-2xl border border-amber/40 bg-white shadow-[0_4px_18px_rgba(196,122,58,0.08)] overflow-hidden">
            <div className="mx-3 mt-3 rounded-lg bg-[#eef0f8] border border-[#d4d8e8] px-4 py-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 text-amber shrink-0" aria-hidden="true">
                  <Sparkles size={10} strokeWidth={2} className="inline -mt-1" />
                  <Lightbulb size={16} strokeWidth={1.75} className="inline" />
                </span>
                <div>
                  <p className="text-[13px] font-bold text-navy leading-snug">
                    Need a little inspiration?
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-mid leading-[1.4]">
                    Tap a prompt to drop it into your title — then take it
                    wherever feels right.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PROMPTS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setTitle(p.label)}
                  className="flex items-center gap-2 rounded-lg border border-amber/20 bg-white px-3 py-2 text-left text-[12px] font-semibold text-navy hover:border-amber/50 hover:bg-amber-tint/40 transition-colors"
                >
                  <span className="shrink-0 w-7 h-7 rounded-full bg-amber-tint text-amber flex items-center justify-center">
                    {p.icon}
                  </span>
                  <span className="min-w-0 truncate">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Writing card ─────────────────────────────── */}
          <div className="rounded-2xl border border-amber/40 bg-white shadow-[0_4px_18px_rgba(196,122,58,0.08)] overflow-hidden">
            {/* Instruction banner */}
            <div className="mx-3 mt-3 rounded-lg bg-[#eef0f8] border border-[#d4d8e8] px-4 py-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 text-amber shrink-0" aria-hidden="true">
                  <Sparkles size={10} strokeWidth={2} className="inline -mt-1" />
                  <Pencil size={16} strokeWidth={1.75} className="inline" />
                </span>
                <div>
                  <p className="text-[13px] font-bold text-navy leading-snug">
                    Write something meaningful.
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-mid leading-[1.4]">
                    Write what comes to mind — a favorite memory, something you
                    admire, or just what you want them to know.
                  </p>
                </div>
              </div>
            </div>

            {/* Editor */}
            <div
              className="relative px-5 pt-3 pb-2 transition-all"
              style={{
                minHeight: extraHeight ? `${180 + extraHeight}px` : undefined,
              }}
            >
              <TiptapEditor
                initialContent={body}
                onUpdate={setBody}
                placeholder={editorPlaceholder}
              />
              {/* Scroll indicator */}
              <div className="absolute top-3 right-2.5 bottom-2 w-px flex flex-col items-center pointer-events-none">
                <div className="w-[3px] flex-1 rounded-full bg-gradient-to-b from-amber via-amber/60 to-transparent" />
                <div className="w-2.5 h-2.5 rounded-full border-2 border-amber/40 bg-white mt-1" />
                <div className="w-px flex-1 border-l border-dashed border-amber/30" />
              </div>
            </div>
            <div className="px-5 pb-2 flex items-center justify-between">
              <div className="flex gap-3">
                {extraHeight > 0 && (
                  <button
                    type="button"
                    onClick={() => setExtraHeight(Math.max(0, extraHeight - 180))}
                    className="text-[11px] text-amber/70 hover:text-amber transition-colors"
                  >
                    Collapse
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setExtraHeight(extraHeight + 180)}
                  className="text-[11px] text-amber/70 hover:text-amber transition-colors"
                >
                  Expand
                </button>
              </div>
              <span className="text-[11px] text-ink-light/50 italic">
                Write as much as you&rsquo;d like.
              </span>
            </div>
          </div>

          {/* ── Media card ────────────────────────────────── */}
          <div className="mt-2.5 rounded-2xl border border-amber/30 bg-white shadow-[0_2px_10px_rgba(196,122,58,0.05)] px-5 py-4">
            <p className="text-[14px] font-bold text-navy">
              Add a photo, voice note, or video
            </p>
            <p className="mt-0.5 text-[12px] text-ink-mid">
              Your voice makes it even more special.
            </p>
            <div className="mt-2.5">
              <MediaAttachments
                entryId={entryId}
                initial={[]}
                ensureEntry={ensureEntry}
                canAttach={hasContent}
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600 text-center" role="alert">
              {error}
            </p>
          )}

          <div className="mt-8 flex flex-col items-center gap-3">
            {effectiveRevealDate && (
              <p className="text-[14px] text-navy">
                {childFirstName} won&rsquo;t see this until{" "}
                <span className="font-bold">
                  {formatLong(effectiveRevealDate)}
                </span>
                .
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full max-w-[400px] bg-amber text-white py-3.5 rounded-xl text-[16px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60 shadow-[0_2px_8px_rgba(196,122,58,0.25)]"
            >
              {saving ? "Saving…" : "Seal this memory"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

