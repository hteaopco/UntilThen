"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { TiptapEditor, getReadingStats } from "@/components/editor/TiptapEditor";
import { LogoSvg } from "@/components/ui/LogoSvg";

export function ContributorEntryForm({
  vaultId,
  childFirstName,
  requiresApproval,
}: {
  vaultId: string;
  childFirstName: string;
  requiresApproval: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = Boolean(body.replace(/<[^>]*>/g, "").trim()) && !saving;

  async function seal() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/contribute/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultId,
          title: title.trim() || null,
          body,
          isSealed: true,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't seal.");
      }
      router.push(`/contribute/${vaultId}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const { wordCount, readingTime } = getReadingStats(body);

  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-navy/[0.06]">
        <div className="mx-auto max-w-[720px] px-6 py-4 flex items-center justify-between gap-4">
          <Link
            href={`/contribute/${vaultId}`}
            className="flex items-center gap-2 text-sm text-ink-mid hover:text-navy transition-colors"
          >
            <span aria-hidden="true">←</span>
            <span>Back</span>
          </Link>
          <LogoSvg variant="dark" width={110} height={22} />
          <button
            type="button"
            onClick={seal}
            disabled={!canSubmit}
            className="bg-amber text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-50"
          >
            {saving ? "Sealing…" : "Seal Moment →"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[680px] px-6 pt-10 pb-40">
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-5">
          Writing to {childFirstName}
        </p>

        {requiresApproval && (
          <div className="rounded-xl border border-gold/40 bg-gold-tint px-4 py-3 text-sm text-navy mb-6">
            <span aria-hidden="true">👁</span>{" "}
            {childFirstName}&rsquo;s parent will review this before it&rsquo;s
            added to the vault.
          </div>
        )}

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full px-0 py-2 text-[32px] lg:text-[36px] font-extrabold text-navy bg-transparent border-0 outline-none placeholder-ink-light/60 tracking-[-0.8px] leading-tight mb-4"
        />

        <TiptapEditor
          initialContent={body}
          placeholder={`Dear ${childFirstName},`}
          onUpdate={setBody}
        />

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <p className="mt-10 text-xs italic text-ink-light text-center">
          {wordCount.toLocaleString()} {wordCount === 1 ? "word" : "words"} ·{" "}
          {readingTime}
        </p>
      </div>
    </main>
  );
}
