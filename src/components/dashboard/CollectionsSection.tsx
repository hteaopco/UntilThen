import { Lock, PlusCircle } from "lucide-react";
import Link from "next/link";

export type CollectionRow = {
  id: string;
  title: string;
  description: string | null;
  coverEmoji: string | null;
  revealDate: string | null;
  isSealed: boolean;
  entryCount: number;
};

function formatShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CollectionsSection({
  collections,
  vaultRevealDate,
  vaultId,
}: {
  collections: CollectionRow[];
  vaultRevealDate: string | null;
  vaultId: string;
}) {
  if (collections.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-4">
        Collections · {collections.length}
      </div>
      <ul className="space-y-3">
        {collections.map((c) => (
          <CollectionCard
            key={c.id}
            collection={c}
            vaultRevealDate={vaultRevealDate}
            vaultId={vaultId}
          />
        ))}
      </ul>
    </div>
  );
}

function CollectionCard({
  collection,
  vaultRevealDate,
  vaultId,
}: {
  collection: CollectionRow;
  vaultRevealDate: string | null;
  vaultId: string;
}) {
  const revealDate = collection.revealDate ?? vaultRevealDate;
  return (
    <li className="relative rounded-2xl border border-navy/[0.08] bg-white px-6 py-5 hover:border-amber/25 hover:shadow-[0_8px_24px_rgba(15,31,61,0.06)] transition-all">
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className="shrink-0 w-12 h-12 rounded-xl bg-gold-tint flex items-center justify-center text-2xl"
        >
          {collection.coverEmoji ?? "📖"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/dashboard/collection/${collection.id}`}
              prefetch={false}
              className="text-[17px] font-bold text-navy hover:text-navy-mid transition-colors"
            >
              {collection.title}
            </Link>
            {collection.isSealed && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] font-bold text-gold bg-gold-tint px-2 py-0.5 rounded">
                <Lock size={11} strokeWidth={1.75} aria-hidden="true" />
                Sealed
              </span>
            )}
          </div>
          <div className="mt-1 text-sm text-ink-mid">
            {collection.entryCount.toLocaleString()}{" "}
            {collection.entryCount === 1 ? "entry" : "entries"}
            {revealDate && <> · Unlocks {formatShort(revealDate)}</>}
          </div>
          {collection.description && (
            <p className="mt-1 text-sm text-ink-mid italic truncate">
              &ldquo;{collection.description}&rdquo;
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          <Link
            href={`/dashboard/new?vault=${vaultId}&collectionId=${collection.id}`}
            prefetch={false}
            className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] font-bold text-amber hover:text-navy transition-colors whitespace-nowrap"
          >
            <PlusCircle size={14} strokeWidth={1.5} aria-hidden="true" />
            Add entry
          </Link>
          <Link
            href={`/dashboard/collection/${collection.id}`}
            prefetch={false}
            className="text-[11px] uppercase tracking-[0.08em] font-bold text-ink-light hover:text-navy transition-colors whitespace-nowrap"
          >
            Open →
          </Link>
        </div>
      </div>
    </li>
  );
}
