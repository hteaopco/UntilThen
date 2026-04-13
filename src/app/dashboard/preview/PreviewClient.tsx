"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { VaultDoor } from "@/components/dashboard/VaultDoor";

export type PreviewEntry = {
  id: string;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  title: string | null;
  body: string | null;
  createdAt: string;
};

type DoorState = "idle" | "unlocking" | "open";

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

const TYPE_LABELS: Record<PreviewEntry["type"], { label: string; icon: string }> = {
  TEXT: { label: "Letter", icon: "✍️" },
  PHOTO: { label: "Photo", icon: "📷" },
  VOICE: { label: "Voice note", icon: "🎙" },
  VIDEO: { label: "Video", icon: "🎥" },
};

export function PreviewClient({
  childFirstName,
  parentFirstName,
  revealDate,
  entries,
}: {
  childFirstName: string;
  parentFirstName: string;
  revealDate: string | null;
  entries: PreviewEntry[];
}) {
  const [state, setState] = useState<DoorState>("idle");
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setState("unlocking"), 700);
    const t2 = setTimeout(() => setState("open"), 1900);
    const t3 = setTimeout(() => setRevealed(true), 3200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const count = entries.length;

  return (
    <main className="min-h-screen bg-navy text-white relative overflow-x-hidden">
      {/* Ambient glow behind the door */}
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

      {/* Header bar */}
      <header className="relative sticky top-0 z-40 bg-navy/90 backdrop-blur-md border-b border-white/10">
        <div className="mx-auto max-w-[900px] px-6 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            prefetch={false}
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            <span aria-hidden="true">←</span>
            <span>Back to dashboard</span>
          </Link>
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/50 font-bold hidden sm:block">
            Reveal preview
          </p>
        </div>
      </header>

      {/* Preview banner */}
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

      {/* Vault door */}
      <section className="relative flex justify-center my-10 lg:my-14">
        <VaultDoor state={state} size={260} />
      </section>

      {/* Reveal count + instruction */}
      <section
        className="relative mx-auto max-w-[720px] px-6 text-center transition-opacity duration-700"
        style={{ opacity: revealed ? 1 : 0 }}
      >
        <p className="text-2xl lg:text-3xl font-bold text-white tracking-[-0.3px] mb-2">
          {count === 0
            ? `${parentFirstName} hasn't sealed anything yet.`
            : count === 1
              ? `One memory from ${parentFirstName}.`
              : `${count.toLocaleString()} memories from ${parentFirstName}.`}
        </p>
        <p className="text-white/60 text-[15px]">
          {count === 0
            ? "As you seal letters, voice notes, photos, and videos, they'll appear here."
            : "They'll unlock one by one on reveal day."}
        </p>
      </section>

      {/* Entries */}
      <section className="relative mx-auto max-w-[680px] px-6 pt-12 pb-24">
        {count === 0 && revealed ? (
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
          <ul className="space-y-5">
            {entries.map((entry, i) => (
              <li
                key={entry.id}
                className="rounded-2xl bg-[#fdfbf5] text-navy px-7 py-7 lg:px-9 lg:py-9 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)]"
                style={{
                  opacity: revealed ? 1 : 0,
                  transform: revealed ? "translateY(0)" : "translateY(20px)",
                  transition:
                    "opacity 0.7s ease, transform 0.7s cubic-bezier(0.2,0.8,0.3,1)",
                  transitionDelay: revealed
                    ? `${i * 120}ms`
                    : "0ms",
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    aria-hidden="true"
                    className="text-base"
                  >
                    {TYPE_LABELS[entry.type].icon}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-sky">
                    {TYPE_LABELS[entry.type].label}
                  </span>
                  <span className="text-[11px] text-ink-light">
                    · Sealed {formatShort(entry.createdAt)}
                  </span>
                </div>
                {entry.title && (
                  <h2 className="text-2xl lg:text-[28px] font-extrabold tracking-[-0.4px] leading-tight mb-4 text-navy">
                    {entry.title}
                  </h2>
                )}
                {entry.body && (
                  <div className="text-[16px] leading-[1.75] text-ink-mid whitespace-pre-line">
                    {entry.body}
                  </div>
                )}
                <div className="mt-6 pt-4 border-t border-navy/[0.06] text-[11px] uppercase tracking-[0.14em] font-bold text-gold">
                  — {parentFirstName}
                </div>
              </li>
            ))}
          </ul>
        )}

        {count > 0 && revealed && (
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
    </main>
  );
}
