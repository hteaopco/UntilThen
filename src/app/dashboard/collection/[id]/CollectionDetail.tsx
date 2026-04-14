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
import {
  ArrowLeft,
  GripVertical,
  Lock,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CollectionCover } from "@/components/collections/CollectionCover";
import { EntryTypeBadge } from "@/components/ui/EntryTypeBadge";
import { LogoSvg } from "@/components/ui/LogoSvg";

export type CollectionEntryRow = {
  id: string;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  title: string | null;
  body: string | null;
  createdAt: string;
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

function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function CollectionDetail({
  collectionId,
  title,
  description,
  coverEmoji,
  childFirstName,
  createdAt,
  revealDate,
  vaultRevealDate,
  isSealed,
  entries: initialEntries,
}: {
  collectionId: string;
  title: string;
  description: string | null;
  coverEmoji: string | null;
  childFirstName: string;
  createdAt: string;
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
  const hasEntries = entries.length > 0;

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
        `Seal "${title}"?\n\n${childFirstName} will receive this as one complete journal on reveal day. You can still add memories until then.`,
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
        `Delete the "${title}" collection?\n\nThe memories inside will become standalone entries (not deleted). Can't be undone.`,
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

  const primaryCtaLabel = hasEntries
    ? "Add a memory →"
    : "Add your first memory →";

  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-navy/[0.06]">
        <div className="mx-auto max-w-[840px] px-6 lg:px-10 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-ink-mid hover:text-navy transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>Back to Dashboard</span>
          </Link>
          <LogoSvg variant="dark" width={110} height={22} />
        </div>
      </header>

      <section className="mx-auto max-w-[840px] px-6 lg:px-10 pt-10 lg:pt-12 pb-4">
        <div className="flex items-start gap-5">
          <div
            aria-hidden="true"
            className="shrink-0 w-16 h-16 rounded-2xl bg-gold-tint flex items-center justify-center"
          >
            <CollectionCover
              title={title}
              coverEmoji={coverEmoji}
              size="lg"
              tone="gold"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-balance text-[32px] lg:text-[40px] font-extrabold text-navy leading-[1.05] tracking-[-0.8px]">
                {title}
              </h1>
              {isSealed && (
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] font-bold text-gold bg-gold-tint px-2 py-1 rounded">
                  <Lock size={12} strokeWidth={1.75} aria-hidden="true" />
                  Sealed
                </span>
              )}
            </div>

            {/* Emotional subline — warm framing that applies to
                every collection, regardless of subject. */}
            <p className="mt-1.5 text-[15px] text-ink-mid">
              A story unfolding for {childFirstName}.
            </p>

            {description && (
              <p className="mt-2 text-sm text-ink-light italic">
                {description}
              </p>
            )}

            {/* Two-line meta: when it started, when it opens. The
                old "N entries · Unlocks ..." one-liner made the
                collection feel like a spreadsheet row. */}
            <div className="mt-3 text-xs text-ink-light leading-[1.6]">
              <div>Started {formatMonthYear(createdAt)}</div>
              {effectiveRevealDate && (
                <div>Unlocks {formatLong(effectiveRevealDate)}</div>
              )}
            </div>

            <p className="mt-3 text-sm italic text-amber/90">
              They&rsquo;ll read this one day.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap mt-7">
          <Link
            href={`/dashboard/new?collectionId=${collectionId}`}
            className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
          >
            <PlusCircle size={16} strokeWidth={1.5} aria-hidden="true" />
            {primaryCtaLabel}
          </Link>
          {!isSealed && hasEntries && (
            <button
              type="button"
              onClick={handleSeal}
              disabled={sealing}
              className="inline-flex items-center gap-2 bg-gold text-navy px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-light transition-colors disabled:opacity-60"
            >
              <Lock size={16} strokeWidth={1.5} aria-hidden="true" />
              {sealing ? "Sealing…" : "Seal collection"}
            </button>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="mx-auto max-w-[840px] px-6 lg:px-10 pt-8 lg:pt-10 pb-12">
        {hasEntries ? (
          <>
            {entries.length > 1 && (
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] italic text-ink-light">
                  Drag to reorder the reading sequence.
                </p>
                {savingOrder && (
                  <div className="text-[11px] text-ink-light italic">
                    Saving…
                  </div>
                )}
              </div>
            )}
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
          </>
        ) : (
          <EmptyState
            collectionId={collectionId}
            childFirstName={childFirstName}
          />
        )}
      </section>

      {/* Delete demoted to a small muted link at the bottom of the
          page so it doesn't compete with the primary CTA up top. */}
      <section className="mx-auto max-w-[840px] px-6 lg:px-10 pb-16 text-center">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-[11px] text-ink-light hover:text-red-600 transition-colors underline underline-offset-[3px] disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete collection"}
        </button>
      </section>
    </main>
  );
}

function EmptyState({
  collectionId,
  childFirstName,
}: {
  collectionId: string;
  childFirstName: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-navy/10 bg-warm-surface/60 px-6 py-14 text-center">
      <div
        aria-hidden="true"
        className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-tint text-amber flex items-center justify-center"
      >
        <Sparkles size={20} strokeWidth={1.5} />
      </div>
      <h3 className="text-[19px] font-extrabold text-navy tracking-[-0.2px]">
        This book is still blank.
      </h3>
      <p className="mt-2 text-sm text-ink-mid max-w-[320px] mx-auto">
        Write the first page — one moment {childFirstName} will get to read
        one day.
      </p>
      <Link
        href={`/dashboard/new?collectionId=${collectionId}`}
        className="mt-6 inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
      >
        <PlusCircle size={16} strokeWidth={1.5} aria-hidden="true" />
        Add your first memory →
      </Link>
    </div>
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
        <GripVertical size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <div className="shrink-0 w-8 text-center text-[13px] font-bold text-ink-light tabular-nums mt-0.5">
        {index}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <EntryTypeBadge type={entry.type} />
          <span className="text-[11px] text-ink-light">
            Sealed {formatShort(entry.createdAt)}
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
