"use client";

import { Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";
import { formatLong } from "@/lib/dateFormatters";
import { OCCASION_LABELS } from "@/lib/capsules";

export function CapsuleContributeForm({
  token,
  capsule,
  invite,
}: {
  token: string;
  capsule: {
    title: string;
    recipientName: string;
    occasionType: keyof typeof OCCASION_LABELS;
    revealDate: string;
    contributorDeadline: string | null;
  };
  invite: { name: string };
}) {
  const [name, setName] = useState(invite.name);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/contribute/capsule/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: name.trim(),
          type: "TEXT",
          body: message.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't submit.");
      }
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="max-w-[440px] text-center">
          <div
            aria-hidden="true"
            className="mx-auto w-12 h-12 rounded-full bg-amber-tint text-amber flex items-center justify-center mb-4"
          >
            <Sparkles size={20} strokeWidth={1.5} />
          </div>
          <h1 className="text-[26px] font-extrabold text-navy tracking-[-0.4px] leading-tight">
            Added to {capsule.recipientName}&rsquo;s capsule.
          </h1>
          <p className="mt-3 text-sm text-ink-mid leading-[1.6]">
            {capsule.recipientName} will open everything on{" "}
            {formatLong(capsule.revealDate)}.
            <br />
            Thank you for showing up for them.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream">
      <header className="px-6 py-5 flex items-center justify-between max-w-[560px] mx-auto">
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-bold text-amber">
          <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
          Memory Capsule
        </span>
        <LogoSvg variant="dark" width={100} height={20} />
      </header>

      <section className="mx-auto max-w-[560px] px-6 pt-4 pb-20">
        <h1 className="text-balance text-[26px] lg:text-[32px] font-extrabold text-navy leading-[1.1] tracking-[-0.5px]">
          {capsule.title}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-mid">
          Leave something for {capsule.recipientName}.
        </p>
        {capsule.contributorDeadline && (
          <p className="mt-2 text-xs italic text-ink-light">
            Last day to contribute:{" "}
            {formatLong(capsule.contributorDeadline)}.
          </p>
        )}

        <form onSubmit={submit} className="mt-7 space-y-5">
          <label className="block">
            <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
              Your name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sarah"
              className="account-input"
              required
            />
          </label>

          <label className="block">
            <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
              Your message
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Dear ${capsule.recipientName},`}
              className="account-input min-h-[200px] leading-[1.7] resize-y"
              required
            />
          </label>

          {/* TODO: media uploads (photo + voice note). The DB
              schema already supports mediaUrls/mediaTypes arrays;
              this endpoint needs a public R2 signing path before
              we can turn those buttons on. Text contributions
              only for v1. */}

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim() || !message.trim()}
            className="w-full bg-amber text-white py-3.5 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : "Submit my contribution →"}
          </button>
          <p className="text-center text-xs italic text-ink-light">
            {capsule.recipientName} won&rsquo;t see this until{" "}
            {formatLong(capsule.revealDate)}.
          </p>
        </form>
      </section>
    </main>
  );
}
