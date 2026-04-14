import { Camera, Mic, Pencil } from "lucide-react";
import Link from "next/link";

/**
 * Top-of-dashboard creation spark. Not a live editor — a warm,
 * one-click-away invitation to write. The actual composition
 * happens in /dashboard/new; this card's job is to make that
 * feel like the default action the moment the page loads.
 */
export function MemoryStarter({
  childFirstName,
  vaultId,
}: {
  childFirstName: string;
  vaultId: string;
}) {
  const writeHref = `/dashboard/new?vault=${vaultId}`;

  return (
    <section
      aria-label="Write a new memory"
      className="rounded-3xl border border-navy/[0.06] bg-white px-6 py-8 lg:px-10 lg:py-10 shadow-[0_2px_22px_rgba(15,31,61,0.04)]"
    >
      <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
        Write while it&rsquo;s fresh
      </p>

      {/* Warm starting state — tapping anywhere on the prompt opens
          the editor already pointing at the right vault. */}
      <Link
        href={writeHref}
        prefetch={false}
        className="block text-[26px] lg:text-[32px] font-extrabold text-navy leading-[1.2] tracking-[-0.5px] hover:text-amber transition-colors"
      >
        Dear {childFirstName},
        <span className="block mt-1 text-[15px] lg:text-[17px] font-medium text-ink-light/80 italic leading-[1.5]">
          Capture this moment now — it only takes a minute.
        </span>
      </Link>

      <div className="mt-7 flex flex-wrap items-center gap-3">
        <Link
          href={writeHref}
          prefetch={false}
          className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
        >
          <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
          Write a memory
        </Link>
        <Link
          href={writeHref}
          prefetch={false}
          className="inline-flex items-center gap-2 bg-white border border-navy/15 text-navy px-4 py-2.5 rounded-lg text-sm font-bold hover:border-navy transition-colors"
        >
          <Mic size={16} strokeWidth={1.5} aria-hidden="true" />
          Record voice note
        </Link>
        <Link
          href={writeHref}
          prefetch={false}
          className="inline-flex items-center gap-2 bg-white border border-navy/15 text-navy px-4 py-2.5 rounded-lg text-sm font-bold hover:border-navy transition-colors"
        >
          <Camera size={16} strokeWidth={1.5} aria-hidden="true" />
          Add a photo
        </Link>
      </div>
    </section>
  );
}
