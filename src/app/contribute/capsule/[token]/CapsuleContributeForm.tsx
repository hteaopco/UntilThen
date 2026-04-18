"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { Typewriter } from "@/components/ui/Typewriter";
import { IntroSplash } from "@/components/landing/IntroSplash";
import { FirstScreen } from "@/app/capsule/[id]/open/FirstScreen";
import { SequentialRevealScreen } from "@/app/capsule/[id]/open/SequentialRevealScreen";
import { PublicMediaAttachments } from "@/app/contribute/capsule/[token]/PublicMediaAttachments";
import { formatLong } from "@/lib/dateFormatters";
import { OCCASION_LABELS } from "@/lib/capsules";
import {
  TONE_INVITE_LINE1,
  TONE_INVITE_LINE2,
  TONE_EDITOR_HINT,
  TONE_THANKYOU,
  type CapsuleTone,
} from "@/lib/tone";

type Phase = "splash" | "invite" | "editor" | "thankyou-typing" | "thankyou" | "preview-reveal";

function derivePronouns(recipientName: string) {
  const isCouple = recipientName.includes("&");
  const parts = recipientName.split("&");
  const firstName1 = (parts[0] ?? "").trim().split(" ")[0] ?? "";
  const firstName2 = isCouple && parts.length > 1 ? (parts[1] ?? "").trim().split(" ")[0] ?? "" : "";
  const displayName = isCouple && firstName2
    ? `${firstName1} & ${firstName2}`
    : firstName1;
  const pronoun = isCouple ? "them" : "her";
  const possessive = isCouple ? "their" : "her";
  const subjectContraction = isCouple ? "they'll" : "she'll";
  return { isCouple, firstName1, firstName2, displayName, pronoun, possessive, subjectContraction };
}

export function CapsuleContributeForm({
  token,
  capsule,
  invite,
  existingContribution,
}: {
  token: string;
  capsule: {
    title: string;
    recipientName: string;
    occasionType: keyof typeof OCCASION_LABELS;
    tone?: CapsuleTone;
    revealDate: string;
    contributorDeadline: string | null;
  };
  invite: { name: string };
  existingContribution?: { id: string; title: string | null; body: string | null } | null;
}) {
  const r = derivePronouns(capsule.recipientName);
  const capsuleTone: CapsuleTone = capsule.tone ?? "CELEBRATION";
  const isEditing = Boolean(existingContribution);
  const [phase, setPhase] = useState<Phase>(isEditing ? "editor" : "splash");
  const [name, setName] = useState(invite.name);
  const [title, setTitle] = useState(existingContribution?.title ?? "");
  const [body, setBody] = useState(existingContribution?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contributionId, setContributionId] = useState<string | null>(existingContribution?.id ?? null);
  const [showCta, setShowCta] = useState(false);
  const [inviteLine2, setInviteLine2] = useState(false);
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
    if (token === "preview-mode") return "preview-contribution";
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
    if (token === "preview-mode") {
      setPhase("thankyou-typing");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = stateRef.current.contributionId;

      if (id) {
        const res = await fetch(`/api/contribute/capsule/${token}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contributionId: id,
            title: title.trim() || null,
            body: body || null,
            mediaUrls: mediaKeysRef.current,
            mediaTypes: mediaTypesRef.current,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Couldn't update.");
        }
      } else {
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
      }

      setPhase("thankyou-typing");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  // ── Phase 1: Brand splash ────────────────────────────────
  if (phase === "splash") {
    return <IntroSplash onComplete={() => setPhase("invite")} />;
  }

  // ── Phase 2: Invite message ──────────────────────────────
  if (phase === "invite") {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
        <div className="fixed top-8 left-0 right-0 flex justify-center z-10">
          <LogoSvg variant="dark" width={100} height={20} />
        </div>
        <div className="max-w-[440px] text-center">
          <h1 className="text-[20px] lg:text-[26px] font-extrabold text-navy tracking-[-0.5px] leading-[1.3]">
            <Typewriter
              text={`${TONE_INVITE_LINE1[capsuleTone]} ${r.displayName}.`}
              speed={61}
              startDelay={500}
              cursorBlinks={1}
              onComplete={() => {
                setTimeout(() => setInviteLine2(true), 1100);
              }}
            />
          </h1>
          <p
            className="mt-4 text-[15px] text-ink-mid leading-[1.5] transition-opacity duration-700 ease-out"
            style={{ opacity: inviteLine2 ? 1 : 0 }}
          >
            {TONE_INVITE_LINE2[capsuleTone](r.subjectContraction)}
          </p>
          <div
            className="mt-6 transition-opacity duration-700 ease-out"
            style={{ opacity: inviteLine2 ? 1 : 0 }}
          >
            <button
              type="button"
              onClick={() => setPhase("editor")}
              className="px-5 py-2.5 rounded-lg text-[13px] font-semibold border border-amber/30 text-amber/70 hover:text-amber hover:border-amber transition-colors"
            >
              Start writing
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Phase 4: Thank you ───────────────────────────────────
  if (phase === "thankyou-typing" || phase === "thankyou") {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
        <div className="fixed top-8 left-0 right-0 flex justify-center z-10">
          <LogoSvg variant="dark" width={100} height={20} />
        </div>
        <div className="max-w-[440px] text-center">
          {phase === "thankyou-typing" ? (
            <div className="text-[20px] lg:text-[26px] font-extrabold text-navy tracking-[-0.5px] leading-[1.3]">
              <Typewriter
                text={TONE_THANKYOU[capsuleTone](r.pronoun)}
                speed={61}
                startDelay={400}
                onComplete={() => {
                  setTimeout(() => {
                    setPhase("thankyou");
                    setTimeout(() => setShowCta(true), 500);
                  }, 1000);
                }}
              />
            </div>
          ) : (
            <>
              <div className="text-[20px] lg:text-[26px] font-extrabold text-navy tracking-[-0.5px] leading-[1.3] mb-8">
                {TONE_THANKYOU[capsuleTone](r.pronoun)}
              </div>
              <div
                className="transition-opacity duration-700 ease-out space-y-3"
                style={{ opacity: showCta ? 1 : 0 }}
              >
                <Link
                  href="/"
                  className="inline-block bg-amber text-white px-6 py-3 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors"
                >
                  Start one for someone you love
                </Link>
                <div>
                  <button
                    type="button"
                    onClick={() => setPhase("preview-reveal")}
                    className="inline-block px-4 py-2 rounded-lg text-[13px] font-semibold border border-amber/30 text-amber/80 hover:text-amber hover:border-amber transition-colors"
                  >
                    Preview what {r.pronoun === "them" ? "they" : r.pronoun === "her" ? "she" : "he"}&rsquo;ll see
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  // ── Phase 5: Preview reveal (contributor sees the full reveal) ──
  if (phase === "preview-reveal") {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => { setPhase("thankyou"); setShowCta(true); }}
          className="fixed top-4 right-4 z-[300] bg-navy text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg"
        >
          Back
        </button>
        <PreviewReveal
          capsule={capsule}
          contribution={{
            id: contributionId ?? "preview",
            authorName: name,
            type: "TEXT",
            title: title || null,
            body: body || null,
          }}
          onDone={() => { setPhase("thankyou"); setShowCta(true); }}
        />
      </div>
    );
  }

  // ── Phase 3: Editor ──────────────────────────────────────
  const dearLine = r.isCouple
    ? `Dear ${r.firstName1} & ${r.firstName2},`
    : `Dear ${r.firstName1},`;

  const editorPlaceholder = `${dearLine}\n\n${TONE_EDITOR_HINT[capsuleTone]}`;

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

      <section className="mx-auto max-w-[720px] px-6 pt-4 pb-20">
        <h1 className="text-balance text-[26px] lg:text-[36px] font-extrabold text-navy leading-[1.08] tracking-[-0.8px]">
          {capsule.title}
        </h1>
        <p className="mt-1.5 text-[14px] text-ink-mid leading-[1.5]">
          {r.subjectContraction.charAt(0).toUpperCase() + r.subjectContraction.slice(1)} open everything on{" "}
          <span className="font-semibold text-navy">{formatLong(capsule.revealDate)}</span>.
        </p>
        {capsule.contributorDeadline && (
          <p className="mt-1 text-xs italic text-ink-light">
            Last day to contribute: {formatLong(capsule.contributorDeadline)}.
          </p>
        )}

        <form onSubmit={submit} className="mt-3">
          {/* From field */}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`From ${invite.name || "your name"}`}
            required
            className="w-full mb-2.5 px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy placeholder-ink-light/40 outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
          />

          {/* ── Writing card ─────────────────────────────── */}
          <div className="rounded-2xl border border-amber/40 bg-white shadow-[0_4px_18px_rgba(196,122,58,0.08)] overflow-hidden">
            <div className="relative px-5 pt-3 pb-3">
              <TiptapEditor
                initialContent={body}
                onUpdate={setBody}
                placeholder={editorPlaceholder}
              />
              {/* Scroll indicator */}
              <div className="absolute top-3 right-2.5 bottom-3 w-px flex flex-col items-center pointer-events-none">
                <div className="w-[3px] flex-1 rounded-full bg-gradient-to-b from-amber via-amber/60 to-transparent" />
                <div className="w-2.5 h-2.5 rounded-full border-2 border-amber/40 bg-white mt-1" />
                <div className="w-px flex-1 border-l border-dashed border-amber/30" />
              </div>
            </div>
            <div className="px-5 pb-2 text-right">
              <span className="text-[11px] text-ink-light/50 italic">
                Write as much as you&rsquo;d like.
              </span>
            </div>
          </div>

          {/* ── Media card ────────────────────────────────── */}
          <div className="mt-2.5 rounded-2xl border border-amber/30 bg-white shadow-[0_2px_10px_rgba(196,122,58,0.05)] px-5 py-4">
            <p className="text-[14px] font-bold text-navy">
              Add a photo, voice note, or video
            </p>
            <p className="mt-0.5 text-[12px] text-ink-mid">
              Your voice makes it even more special.
            </p>
            <div className="mt-2.5">
              <PublicMediaAttachments
                token={token}
                ensureContribution={ensureContribution}
                onChange={onMediaChange}
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600 text-center" role="alert">{error}</p>
          )}

          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-[14px] text-navy">
              {r.subjectContraction.charAt(0).toUpperCase() + r.subjectContraction.slice(1)} won&rsquo;t see this until{" "}
              <span className="font-bold">{formatLong(capsule.revealDate)}</span>.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="w-full max-w-[400px] bg-amber text-white py-3.5 rounded-xl text-[16px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60 shadow-[0_2px_8px_rgba(196,122,58,0.25)]"
            >
              {saving ? "Sending\u2026" : "Add my message"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function PreviewReveal({
  capsule,
  contribution,
  onDone,
}: {
  capsule: {
    title: string;
    recipientName: string;
    occasionType: keyof typeof OCCASION_LABELS;
    revealDate: string;
  };
  contribution: {
    id: string;
    authorName: string;
    type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
    title: string | null;
    body: string | null;
  };
  onDone: () => void;
}) {
  const [view, setView] = useState<"first" | "sequence">("first");

  const mockCapsule = {
    id: "preview",
    title: capsule.title,
    recipientName: capsule.recipientName,
    occasionType: capsule.occasionType,
    revealDate: capsule.revealDate,
    hasAccount: false,
  };

  if (view === "first") {
    return (
      <FirstScreen
        capsule={mockCapsule}
        contributionCount={1}
        onOpen={() => setView("sequence")}
      />
    );
  }

  return (
    <SequentialRevealScreen
      contributions={[contribution]}
      onComplete={onDone}
    />
  );
}
