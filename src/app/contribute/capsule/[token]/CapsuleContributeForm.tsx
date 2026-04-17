"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useRef, useState, type FormEvent } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";
import { PublicMediaAttachments } from "@/app/contribute/capsule/[token]/PublicMediaAttachments";
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
  const [contributionId, setContributionId] = useState<string | null>(null);
  const mediaKeysRef = useRef<string[]>([]);
  const mediaTypesRef = useRef<string[]>([]);

  const ensureContribution = useCallback(async (): Promise<string | null> => {
    if (contributionId) return contributionId;
    if (!name.trim()) return null;
    try {
      const res = await fetch(`/api/contribute/capsule/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: name.trim(),
          type: "TEXT",
          body: message.trim() || null,
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { id?: string };
      if (data.id) {
        setContributionId(data.id);
        return data.id;
      }
      return null;
    } catch {
      return null;
    }
  }, [contributionId, name, message, token]);

  function onMediaChange(keys: string[], types: string[]) {
    mediaKeysRef.current = keys;
    mediaTypesRef.current = types;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      let id = contributionId;

      if (!id) {
        const res = await fetch(`/api/contribute/capsule/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorName: name.trim(),
            type: "TEXT",
            body: message.trim(),
            mediaUrls: mediaKeysRef.current,
            mediaTypes: mediaTypesRef.current,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Couldn't submit.");
        }
        setDone(true);
        return;
      }

      if (mediaKeysRef.current.length > 0) {
        await fetch(`/api/contribute/capsule/${token}/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "complete",
            contributionId: id,
            mediaKeys: mediaKeysRef.current,
            mediaTypes: mediaTypesRef.current,
          }),
        });
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
          <div aria-hidden="true" className="text-5xl mb-5">&#128140;</div>
          <h1 className="text-[24px] font-extrabold text-navy tracking-[-0.5px] mb-2">
            Thank you!
          </h1>
          <p className="text-[15px] text-ink-mid leading-[1.6]">
            Your contribution has been added to {capsule.recipientName}&rsquo;s capsule.
            They&rsquo;ll see it on {formatLong(capsule.revealDate)}.
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
          Gift Capsule
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
            Last day to contribute: {formatLong(capsule.contributorDeadline)}.
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

          <PublicMediaAttachments
            token={token}
            ensureContribution={ensureContribution}
            onChange={onMediaChange}
          />

          {error && (
            <p className="text-sm text-red-600" role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving || !name.trim() || !message.trim()}
            className="w-full bg-amber text-white py-3 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
          >
            {saving ? "Submitting\u2026" : "Submit my contribution"}
          </button>
        </form>
      </section>
    </main>
  );
}
