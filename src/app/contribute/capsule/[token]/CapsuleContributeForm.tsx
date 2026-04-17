"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState, type FormEvent } from "react";

import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { Typewriter } from "@/components/ui/Typewriter";
import { PublicMediaAttachments } from "@/app/contribute/capsule/[token]/PublicMediaAttachments";
import { formatLong } from "@/lib/dateFormatters";
import { OCCASION_LABELS } from "@/lib/capsules";

type Phase = "invite" | "editor" | "thankyou-typing" | "thankyou";

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
  const [phase, setPhase] = useState<Phase>("invite");
  const [name, setName] = useState(invite.name);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contributionId, setContributionId] = useState<string | null>(null);
  const mediaKeysRef = useRef<string[]>([]);
  const mediaTypesRef = useRef<string[]>([]);
  const stateRef = useRef({ name, title, body, contributionId });
  stateRef.current = { name, title, body, contributionId };

  const hasContent = useCallback(() => {
    const s = stateRef.current;
    const bodyText = s.body.replace(/<[^>]*>/g, "").trim();
    return Boolean(s.name.trim()) && (Boolean(s.title.trim()) || bodyText.length > 0);
  }, []);

  const ensureContribution = useCallback(async (): Promise<string | null> => {
    const s = stateRef.current;
    if (s.contributionId) return s.contributionId;
    if (!s.name.trim()) return null;
    try {
      const res = await fetch(`/api/contribute/capsule/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: s.name.trim(),
          type: "TEXT",
          title: s.title.trim() || null,
          body: s.body || null,
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
  }, [token]);

  function onMediaChange(keys: string[], types: string[]) {
    mediaKeysRef.current = keys;
    mediaTypesRef.current = types;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!hasContent()) {
      setError("Please add your name and write a message.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = stateRef.current.contributionId;

      if (!id) {
        const res = await fetch(`/api/contribute/capsule/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorName: name.trim(),
            type: "TEXT",
            title: title.trim() || null,
            body: body || null,
            mediaUrls: mediaKeysRef.current,
            mediaTypes: mediaTypesRef.current,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Couldn't submit.");
        }
        setPhase("thankyou-typing");
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

      setPhase("thankyou-typing");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  // ── Phase 1: Invite message (typewriter) ──────────────────
  if (phase === "invite") {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
        <div className="max-w-[440px] text-center">
          <div className="mb-6 opacity-30">
            <LogoSvg variant="dark" width={100} height={20} />
          </div>
          <h1 className="text-[22px] lg:text-[28px] font-extrabold text-navy tracking-[-0.5px] leading-[1.2] mb-3">
            <Typewriter
              text={`You've been invited to leave something for ${capsule.recipientName}.`}
              speed={50}
              startDelay={600}
              onComplete={() => {
                setTimeout(() => setPhase("editor"), 2000);
              }}
            />
          </h1>
          <p className="text-[13px] italic text-ink-light mt-4 opacity-0 animate-fadeIn" style={{ animationDelay: "2.5s", animationFillMode: "forwards" }}>
            {capsule.title}
          </p>
        </div>
      </main>
    );
  }

  // ── Phase 4: Thank you (typewriter → CTA) ─────────────────
  if (phase === "thankyou-typing" || phase === "thankyou") {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
        <div className="max-w-[440px] text-center">
          <div className="mb-6 opacity-30">
            <LogoSvg variant="dark" width={100} height={20} />
          </div>

          {phase === "thankyou-typing" ? (
            <h1 className="text-[22px] lg:text-[28px] font-extrabold text-navy tracking-[-0.5px] leading-[1.2]">
              <Typewriter
                text={`Thank you. ${capsule.recipientName} is going to love this.`}
                speed={55}
                startDelay={400}
                onComplete={() => {
                  setTimeout(() => setPhase("thankyou"), 1500);
                }}
              />
            </h1>
          ) : (
            <>
              <h1 className="text-[22px] lg:text-[28px] font-extrabold text-navy tracking-[-0.5px] leading-[1.2] mb-6">
                Thank you. {capsule.recipientName} is going to love this.
              </h1>
              <div className="animate-fadeIn">
                <p className="text-[15px] text-ink-mid leading-[1.6] mb-6">
                  Want to create your own time capsule for someone you love?
                </p>
                <Link
                  href="/"
                  className="inline-block bg-amber text-white px-6 py-3 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors"
                >
                  Discover untilThen
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  // ── Phase 3: Editor ───────────────────────────────────────
  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-navy/[0.06]">
        <div className="px-6 py-4 flex items-center justify-between max-w-[720px] mx-auto">
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-bold text-amber">
            <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
            Gift Capsule
          </span>
          <LogoSvg variant="dark" width={110} height={22} />
        </div>
      </header>

      <section className="mx-auto max-w-[720px] px-6 pt-8 pb-20">
        <h1 className="text-balance text-[28px] lg:text-[36px] font-extrabold text-navy leading-[1.08] tracking-[-0.8px]">
          {capsule.title}
        </h1>
        <p className="mt-2 text-[15px] text-ink-mid leading-[1.5]">
          Add your message for {capsule.recipientName}. They&rsquo;ll open everything at once on{" "}
          <span className="font-semibold text-navy">{formatLong(capsule.revealDate)}</span>.
        </p>
        {capsule.contributorDeadline && (
          <p className="mt-1.5 text-xs italic text-ink-light">
            Last day to contribute: {formatLong(capsule.contributorDeadline)}.
          </p>
        )}

        <form onSubmit={submit} className="mt-8">
          <div className="rounded-2xl border border-amber/40 bg-white shadow-[0_4px_18px_rgba(196,122,58,0.08)] overflow-hidden">
            <div className="px-6 pt-5 pb-3 border-b border-navy/[0.06]">
              <label className="flex items-center gap-3">
                <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid whitespace-nowrap">From:</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="flex-1 bg-transparent border-0 outline-none text-[15px] text-navy font-semibold placeholder-ink-light/50"
                  required
                />
              </label>
            </div>

            <div className="px-6 pt-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                aria-label="Contribution title"
                className="w-full px-0 py-2 text-[22px] lg:text-[26px] font-extrabold text-navy bg-transparent border-0 outline-none placeholder-ink-light/40 tracking-[-0.3px] leading-tight border-b border-navy/[0.06] pb-3"
              />
            </div>

            <div className="px-6 pt-4 pb-2">
              <TiptapEditor
                initialContent={body}
                onUpdate={setBody}
                placeholder={`Dear ${capsule.recipientName},`}
              />
            </div>

            <div className="px-6 pt-4 pb-5 border-t border-navy/[0.06]">
              <PublicMediaAttachments
                token={token}
                ensureContribution={ensureContribution}
                onChange={onMediaChange}
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600" role="alert">{error}</p>
          )}

          <div className="mt-6 flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-amber text-white px-6 py-3 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
            >
              {saving ? "Submitting\u2026" : "Submit my contribution"}
            </button>
            <p className="text-xs italic text-ink-light">
              {capsule.recipientName} won&rsquo;t see this until the reveal date.
            </p>
          </div>
        </form>
      </section>
    </main>
  );
}
