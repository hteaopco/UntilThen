"use client";

import { Lock } from "lucide-react";
import { useEffect, useState } from "react";

import { EntryTypeBadge } from "@/components/ui/EntryTypeBadge";
import { TimeVault } from "@/components/ui/TimeVault";

type LockedEntry = {
  id: string;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  author: string;
};

type LockedCollection = {
  id: string;
  coverEmoji: string | null;
  entryCount: number;
};

function getTimeLeft(revealDate: Date) {
  const diff = revealDate.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    secs: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function formatLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function LockedVaultView({
  childFirstName,
  revealDate,
  entries,
  collections,
}: {
  childFirstName: string;
  revealDate: string | null;
  entries: LockedEntry[];
  collections: LockedCollection[];
}) {
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof getTimeLeft> | null>(
    revealDate ? getTimeLeft(new Date(revealDate)) : null,
  );

  useEffect(() => {
    if (!revealDate) return;
    const target = new Date(revealDate);
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [revealDate]);

  const totalSealed = entries.length + collections.length;

  return (
    <section className="mx-auto max-w-[640px] px-6 pt-6 pb-20 text-center">
      <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-amber mb-2">
        {childFirstName.toUpperCase()}&rsquo;S VAULT
      </p>
      <h1 className="text-[40px] lg:text-[52px] font-extrabold text-navy tracking-[-1px] leading-[1.05] mb-2">
        Hi {childFirstName} <span aria-hidden="true">👋</span>
      </h1>
      <p className="text-ink-mid text-[15px]">
        Your family is writing to you. A collection of moments, sealed in
        time.
      </p>

      <div className="flex justify-center my-10">
        <TimeVault
          state="sealed"
          ariaLabel={`${childFirstName}'s time vault`}
        />
      </div>

      {revealDate && timeLeft ? (
        <>
          <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-ink-mid mb-4">
            Your vault opens in
          </p>
          <div className="grid grid-cols-4 gap-2 max-w-[400px] mx-auto mb-4">
            <TimeCell value={timeLeft.days} label="days" />
            <TimeCell
              value={String(timeLeft.hours).padStart(2, "0")}
              label="hours"
            />
            <TimeCell
              value={String(timeLeft.mins).padStart(2, "0")}
              label="mins"
            />
            <TimeCell
              value={String(timeLeft.secs).padStart(2, "0")}
              label="secs"
            />
          </div>
          <p className="text-sm text-ink-mid">{formatLong(revealDate)}</p>
        </>
      ) : revealDate ? (
        <p className="text-lg font-bold text-navy">
          Your vault is ready. ✨
        </p>
      ) : (
        <p className="text-sm text-ink-light italic">
          Your reveal date hasn&rsquo;t been set yet.
        </p>
      )}

      <div className="mt-12 mb-4">
        <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-ink-mid">
          ── {totalSealed.toLocaleString()}{" "}
          {totalSealed === 1 ? "memory" : "memories"} sealed for you ──
        </p>
      </div>

      {totalSealed === 0 ? (
        <div className="mt-6 rounded-2xl border border-navy/[0.06] bg-white px-8 py-10">
          <p className="text-ink-mid">
            Nothing has been sealed for you yet. Check back soon.
          </p>
        </div>
      ) : (
        <ul className="mt-2 space-y-2 text-left">
          {collections.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 bg-white rounded-xl border border-navy/[0.06] px-5 py-4"
            >
              <span aria-hidden="true" className="text-xl">
                {c.coverEmoji ?? "📖"}
              </span>
              <span className="flex-1 text-[15px] text-navy font-medium">
                A journal sealed for you
              </span>
              <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-ink-light">
                {c.entryCount.toLocaleString()} entries
              </span>
              <Lock
                size={16}
                strokeWidth={1.5}
                className="text-gold"
                aria-hidden="true"
              />
            </li>
          ))}
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 bg-white rounded-xl border border-navy/[0.06] px-5 py-4"
            >
              <Lock
                size={16}
                strokeWidth={1.5}
                className="text-gold shrink-0"
                aria-hidden="true"
              />
              <span className="flex-1 text-[15px] text-ink-mid italic">
                A memory sealed for you
              </span>
              <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] font-bold text-ink-light">
                <EntryTypeBadge type={e.type} />
                <span className="hidden sm:inline">· from {e.author}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-12 text-sm text-ink-mid italic px-4">
        &ldquo;Your family has been writing to you. Check back as the date gets
        closer.&rdquo;
      </p>
    </section>
  );
}

function TimeCell({
  value,
  label,
}: {
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-navy/[0.06] py-3">
      <div className="text-3xl lg:text-4xl font-extrabold text-navy tracking-[-0.5px] tabular-nums leading-none">
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.14em] font-bold text-ink-light">
        {label}
      </div>
    </div>
  );
}
