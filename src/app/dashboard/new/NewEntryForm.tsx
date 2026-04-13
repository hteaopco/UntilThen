"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.split("T")[0] ?? "";
}

export function NewEntryForm({
  childFirstName,
  vaultRevealDate,
}: {
  childFirstName: string;
  vaultRevealDate: string | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          revealDate: useCustomDate && customDate ? customDate : null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't seal your letter. Try again?");
      }
      router.push("/dashboard");
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
            href="/dashboard"
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
        </p>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          aria-label="Letter title"
          className="w-full px-0 py-2 text-[32px] lg:text-[36px] font-extrabold text-navy bg-transparent border-0 outline-none placeholder-ink-light/60 tracking-[-0.8px] leading-tight"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Dear ${childFirstName},\n\n`}
          rows={18}
          aria-label="Letter body"
          className="w-full mt-4 px-0 py-2 text-[17px] text-navy bg-transparent border-0 outline-none placeholder-ink-light/60 leading-[1.75] resize-none"
        />

        <details className="mt-8 rounded-xl border border-navy/[0.08] bg-white/60 px-5 py-4">
          <summary className="cursor-pointer text-sm text-ink-mid hover:text-navy transition-colors list-none flex items-center justify-between">
            <span>
              <span className="font-semibold text-navy">Unlock on a different date?</span>{" "}
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
              <span>Override the vault&rsquo;s reveal date for this letter</span>
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
                {new Date(vaultRevealDate).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                .
              </p>
            )}
          </div>
        </details>

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
