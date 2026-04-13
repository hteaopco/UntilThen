"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

export type CollectionEntryRow = {
  id: string;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  title: string | null;
  body: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<
  CollectionEntryRow["type"],
  { label: string; icon: string }
> = {
  TEXT: { label: "Letter", icon: "✍️" },
  PHOTO: { label: "Photo", icon: "📷" },
  VOICE: { label: "Voice", icon: "🎙" },
  VIDEO: { label: "Video", icon: "🎥" },
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

export function CollectionDetail({
  collectionId,
  title,
  description,
  coverEmoji,
  revealDate,
  vaultRevealDate,
  isSealed,
  entries: initialEntries,
}: {
  collectionId: string;
  title: string;
  description: string | null;
  coverEmoji: string | null;
  revealDate: string | null;
  vaultRevealDate: string | null;
  isSealed: boolean;
  entries: CollectionEntryRow[];
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<CollectionEntryRow[]>(initialEntries);
  const [savingOrder, setSavingOrder] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const effectiveRevealDate = revealDate ?? vaultRevealDate;

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = entries.findIndex((e) => e.id === active.id);
    const newIndex = entries.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(entries, oldIndex, newIndex);
    setEntries(next);
    setSavingOrder(true);
    setError(null);
    try {
      const res = await fetch(`/api/collections/${collectionId}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: next.map((e) => e.id) }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't save order.");
      }
    } catch (err) {
      setError((err as Error).message);
      setEntries(initialEntries);
    } finally {
      setSavingOrder(false);
    }
  }

  async function handleSeal() {
    if (
      !window.confirm(
        `Seal "${title}"?\n\nYour child will receive this as one complete journal on reveal day. You can still add entries until then.`,
      )
    ) {
      return;
    }
    setSealing(true);
    setError(null);
    try {
      const res = await fetch(`/api/collections/${collectionId}/seal`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't seal.");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSealing(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete the "${title}" collection?\n\nThe entries inside will become standalone entries (not deleted). Can't be undone.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/collections/${collectionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't delete.");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-navy/[0.06]">
        <div className="mx-auto max-w-[840px] px-6 lg:px-10 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-ink-mid hover:text-navy transition-colors"
          >
            <span aria-hidden="true">←</span>
            <span>Back to Dashboard</span>
          </Link>
          <LogoSvg variant="dark" width={110} height={22} />
        </div>
      </header>

      <section className="mx-auto max-w-[840px] px-6 lg:px-10 pt-10 lg:pt-14 pb-6">
        <div className="flex items-start gap-5">
          <div
            aria-hidden="true"
            className="shrink-0 w-16 h-16 rounded-2xl bg-gold-tint flex items-center justify-center text-4xl"
          >
            {coverEmoji ?? "📖"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[32px] lg:text-[40px] font-extrabold text-navy leading-[1.05] tracking-[-0.8px]">
                {title}
              </h1>
              {isSealed && (
                <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-gold bg-gold-tint px-2 py-1 rounded">
                  Sealed
                </span>
              )}
            </div>
            {description && (
              <p className="mt-2 text-ink-mid italic text-base">
                &ldquo;{description}&rdquo;
              </p>
            )}
            <p className="mt-3 text-sm text-ink-mid">
              {entries.length.toLocaleString()}{" "}
              {entries.length === 1 ? "entry" : "entries"}
              {effectiveRevealDate && (
                <> · Unlocks {formatLong(effectiveRevealDate)}</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap mt-8">
          <Link
            href={`/dashboard/new?collectionId=${collectionId}`}
            className="bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
          >
            + Add entry
          </Link>
          {!isSealed && entries.length > 0 && (
            <button
              type="button"
              onClick={handleSeal}
              disabled={sealing}
              className="bg-gold text-navy px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-light transition-colors disabled:opacity-60"
            >
              {sealing ? "Sealing…" : "Seal collection"}
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-[11px] uppercase tracking-[0.08em] font-bold text-ink-light hover:text-red-600 transition-colors ml-auto disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete collection"}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="mx-auto max-w-[840px] px-6 lg:px-10 pb-24">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid">
            Entries in order {entries.length > 1 && "· Drag to reorder"}
          </div>
          {savingOrder && (
            <div className="text-[11px] text-ink-light italic">Saving…</div>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="rounded-2xl border border-navy/[0.08] bg-[#f8fafc] px-8 py-14 text-center">
            <p className="text-ink-mid mb-5">
              No entries in this collection yet.
            </p>
            <Link
              href={`/dashboard/new?collectionId=${collectionId}`}
              className="inline-block bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
            >
              Add the first entry →
            </Link>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={entries.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-3">
                {entries.map((entry, index) => (
                  <SortableEntryRow
                    key={entry.id}
                    entry={entry}
                    index={index + 1}
                    unlockDate={effectiveRevealDate}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>
    </main>
  );
}

function preview(body: string | null, max = 140): string {
  if (!body) return "";
  const clean = body.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd() + "…";
}

function SortableEntryRow({
  entry,
  index,
  unlockDate,
}: {
  entry: CollectionEntryRow;
  index: number;
  unlockDate: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const { label, icon } = TYPE_LABELS[entry.type];

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border bg-white px-5 py-4 flex items-start gap-4 transition-shadow ${
        isDragging
          ? "border-amber shadow-[0_12px_32px_rgba(196,122,58,0.2)]"
          : "border-navy/[0.08] hover:border-amber/25 hover:shadow-[0_6px_20px_rgba(15,31,61,0.06)]"
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="shrink-0 mt-1 w-6 h-6 flex items-center justify-center text-ink-light hover:text-navy cursor-grab active:cursor-grabbing touch-none"
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true">
          <circle cx="3" cy="3" r="1.3" fill="currentColor" />
          <circle cx="9" cy="3" r="1.3" fill="currentColor" />
          <circle cx="3" cy="8" r="1.3" fill="currentColor" />
          <circle cx="9" cy="8" r="1.3" fill="currentColor" />
          <circle cx="3" cy="13" r="1.3" fill="currentColor" />
          <circle cx="9" cy="13" r="1.3" fill="currentColor" />
        </svg>
      </button>
      <div className="shrink-0 w-8 text-center text-[13px] font-bold text-ink-light tabular-nums mt-0.5">
        {index}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            aria-hidden="true"
            className="text-sm"
          >
            {icon}
          </span>
          <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-amber">
            {label}
          </span>
          <span className="text-[11px] text-ink-light">
            · Sealed {formatShort(entry.createdAt)}
          </span>
        </div>
        {entry.title && (
          <h3 className="text-[16px] font-bold text-navy tracking-[-0.2px] leading-tight">
            {entry.title}
          </h3>
        )}
        {entry.body && (
          <p className="mt-1 text-sm text-ink-mid leading-[1.6]">
            {preview(entry.body)}
          </p>
        )}
      </div>
      {unlockDate && (
        <div className="shrink-0 text-right">
          <div className="text-[10px] uppercase tracking-[0.08em] font-bold text-gold">
            Unlocks
          </div>
          <div className="text-[11px] text-ink-mid whitespace-nowrap">
            {formatShort(unlockDate)}
          </div>
        </div>
      )}
    </li>
  );
}
