"use client";

import { Pencil, Sparkles } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { IntroSplash } from "@/components/landing/IntroSplash";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { Typewriter } from "@/components/ui/Typewriter";
import { PublicMediaAttachments } from "@/app/contribute/capsule/[token]/PublicMediaAttachments";
import { formatLong } from "@/lib/dateFormatters";

type Capsule = {
  title: string;
  /** "Alex & Jordan Smith" — populated by the organiser as the
   *  recipient name. We split on "&" to render the couple-aware
   *  copy without needing a separate field. */
  recipientName: string;
  revealDate: string;
  contributorDeadline: string | null;
  isOpenForContributions: boolean;
  /** Why guests can't contribute right now, when they can't.
   *  Drives the friendly placeholder copy. */
  closedReason: "draft" | "revealed" | "sealed" | null;
};

type Phase = "splash" | "card" | "editor" | "thankyou-typing" | "thankyou";

function deriveCouple(recipientName: string) {
  const isCouple = recipientName.includes("&");
  const parts = recipientName.split("&");
  const first = (parts[0] ?? "").trim();
  const second = isCouple ? (parts[1] ?? "").trim() : "";
  const firstName1 = first.split(" ")[0] ?? "";
  const firstName2 = second.split(" ")[0] ?? "";
  const coupleNames = isCouple && firstName2
    ? `${firstName1} & ${firstName2}`
    : firstName1 || recipientName;
  // "Alex & Jordan's wedding capsule" reads better than the
  // possessive variant when both names are present, so use the
  // first-only possessive when the couple shares a last name and
  // the joint phrasing otherwise.
  const possessivePrefix = isCouple
    ? `${firstName1.toUpperCase()} & ${firstName2.toUpperCase()}`
    : firstName1.toUpperCase();
  return { isCouple, coupleNames, possessivePrefix };
}

export function WeddingGuestForm({
  guestToken,
  capsule,
}: {
  guestToken: string;
  capsule: Capsule;
}) {
  const couple = deriveCouple(capsule.recipientName);
  const [phase, setPhase] = useState<Phase>(
    capsule.isOpenForContributions ? "splash" : "editor",
  );
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contributionId, setContributionId] = useState<string | null>(null);
  const [showCta, setShowCta] = useState(false);
  const [extraHeight, setExtraHeight] = useState(0);
  const mediaKeysRef = useRef<string[]>([]);
  const mediaTypesRef = useRef<string[]>([]);
  const stateRef = useRef({ name, body, contributionId });
  stateRef.current = { name, body, contributionId };

  const hasContent = useCallback(() => {
    const s = stateRef.current;
    const bodyText = s.body.replace(/<[^>]*>/g, "").trim();
    return Boolean(s.name.trim()) && bodyText.length > 0;
  }, []);

  const ensureContribution = useCallback(async (): Promise<string | null> => {
    const s = stateRef.current;
    if (s.contributionId) return s.contributionId;
    if (!s.name.trim()) return null;
    try {
      const res = await fetch(`/api/wedding/contribute/${guestToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: s.name.trim(),
          type: "TEXT",
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
  }, [guestToken]);

  function onMediaChange(keys: string[], types: string[]) {
    mediaKeysRef.current = keys;
    mediaTypesRef.current = types;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!hasContent()) {
      setError("Please add your name and a message for the couple.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = stateRef.current.contributionId;
      if (id) {
        const res = await fetch(`/api/wedding/contribute/${guestToken}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contributionId: id,
            body: body || null,
            mediaUrls: mediaKeysRef.current,
            mediaTypes: mediaTypesRef.current,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? "Couldn't update.");
        }
      } else {
        const res = await fetch(`/api/wedding/contribute/${guestToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authorName: name.trim(),
            type: "TEXT",
            body: body || null,
            mediaUrls: mediaKeysRef.current,
            mediaTypes: mediaTypesRef.current,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? "Couldn't submit.");
        }
      }
      setPhase("thankyou-typing");
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  // ── Closed-capsule placeholder ─────────────────────────
  if (!capsule.isOpenForContributions) {
    const headline =
      capsule.closedReason === "draft"
        ? "Almost ready"
        : capsule.closedReason === "sealed"
          ? "Contributions closed"
          : capsule.closedReason === "revealed"
            ? `${couple.coupleNames} have already opened it`
            : "Not available";
    const body =
      capsule.closedReason === "draft"
        ? "The couple hasn't activated this capsule yet. Try again in a moment."
        : capsule.closedReason === "sealed"
          ? "This capsule has been sealed and is no longer accepting messages. The couple will see everything on their reveal day."
          : "Thanks for visiting — this capsule has already been opened.";
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <div className="fixed top-8 left-0 right-0 flex justify-center z-10">
          <LogoSvg variant="dark" width={100} height={20} />
        </div>
        <FlowerCorner />
        <div className="max-w-[420px]">
          <h1 className="font-brush text-[42px] sm:text-[54px] text-navy leading-none">
            {headline}
          </h1>
          <p className="mt-4 text-[15px] text-ink-mid leading-[1.55]">{body}</p>
        </div>
      </main>
    );
  }

  // ── Phase 1: Brand splash ──────────────────────────────
  if (phase === "splash") {
    return <IntroSplash onComplete={() => setPhase("card")} />;
  }

  // ── Phase 2: Roses + invitation card ──────────────────
  // Logo top, Card.png with the invitation copy overlaid in
  // its writable area, then a smaller Roses.png decoration
  // tucked below, CTA at the bottom. Card sits first because
  // that's where the eye lands on a wedding invitation.
  if (phase === "card") {
    return (
      <main className="relative min-h-screen bg-cream overflow-hidden flex flex-col items-center px-6 py-10">
        <div className="flex justify-center pt-2 pb-8">
          <LogoSvg variant="dark" width={110} height={22} />
        </div>
        <div className="relative z-10 w-full max-w-[440px] mx-auto flex flex-col items-center">
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Card.png"
              alt=""
              aria-hidden="true"
              className="w-full h-auto block select-none"
            />
            {/* The card art has decorative ribbon corners; the copy
                lives in the inner writable area. Padding is set
                generously so the text never touches the ribbons. */}
            <div className="absolute inset-0 flex items-center justify-center px-[18%] py-[20%]">
              <p className="text-center font-serif italic text-[14px] sm:text-[15px] leading-[1.55] text-navy">
                You&rsquo;ve been invited to contribute to a wedding capsule
                for{" "}
                <span className="font-bold not-italic">
                  {couple.coupleNames}
                </span>
                . Write them a letter, record a voice note, or share a photo
                &mdash; something they&rsquo;ll open together exactly one
                year from their wedding date. Tell them what their love
                means to you, share a memory, or offer a piece of advice
                for the road ahead. It only takes a few minutes, but what
                you leave behind will last a lifetime. Tap below to add
                your message before the capsule is sealed.
              </p>
            </div>
          </div>
          {/* Roses pulled close to the card with a negative margin
              so the empty cream space inside the rose PNG's
              bounding box doesn't add vertical air. Smaller width
              also reduces how much of that empty space is
              visible. */}
          <div className="-mt-6 sm:-mt-10 h-[110px] sm:h-[140px] w-[160px] sm:w-[200px] overflow-hidden flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Roses.png"
              alt=""
              aria-hidden="true"
              className="w-full h-auto select-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setPhase("editor")}
            className="mt-2 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-amber text-white text-[14px] font-bold shadow-[0_8px_22px_-8px_rgba(196,122,58,0.6)] hover:bg-amber-dark transition-colors"
          >
            <Pencil size={14} strokeWidth={2} aria-hidden="true" />
            Leave your message
          </button>
        </div>
      </main>
    );
  }

  // ── Phase 4: Thank you ────────────────────────────────
  if (phase === "thankyou-typing" || phase === "thankyou") {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="fixed top-8 left-0 right-0 flex justify-center z-10">
          <LogoSvg variant="dark" width={100} height={20} />
        </div>
        <FlowerCorner />
        <div className="relative z-10 max-w-[440px] text-center">
          {phase === "thankyou-typing" ? (
            <div className="text-[20px] lg:text-[26px] font-extrabold text-navy tracking-[-0.5px] leading-[1.3]">
              <Typewriter
                text={`Sealed for ${couple.coupleNames}.`}
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
              <div className="text-[20px] lg:text-[26px] font-extrabold text-navy tracking-[-0.5px] leading-[1.3] mb-3">
                Sealed for {couple.coupleNames}.
              </div>
              <p className="text-[14px] text-ink-mid leading-[1.5]">
                They&rsquo;ll see your message on{" "}
                <span className="font-semibold text-navy">
                  {formatLong(capsule.revealDate)}
                </span>
                .
              </p>
              <div
                className="mt-6 transition-opacity duration-700 ease-out"
                style={{ opacity: showCta ? 1 : 0 }}
              >
                <Link
                  href="/weddings"
                  className="inline-block bg-amber text-white px-6 py-3 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors"
                >
                  Make one for someone you love
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  // ── Phase 3: Editor ───────────────────────────────────
  const dearLine = `Dear ${couple.coupleNames},`;

  return (
    <main className="relative min-h-screen bg-cream overflow-hidden">
      <FlowerCorner />
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-navy/[0.06]">
        <div className="px-6 py-4 flex items-center justify-between max-w-[720px] mx-auto">
          <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-bold text-amber">
            <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
            Wedding Capsule
          </span>
          <LogoSvg variant="dark" width={110} height={22} />
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-[720px] px-6 pt-4 pb-20">
        <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.22em] uppercase text-amber">
          {couple.possessivePrefix}&rsquo;S WEDDING CAPSULE
        </p>
        <h1 className="mt-2 font-brush text-[36px] sm:text-[44px] text-navy leading-[0.95]">
          A memory for{" "}
          <span className="text-amber">{couple.coupleNames}</span>
        </h1>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-amber/25 text-[11px] font-bold text-navy">
          <Sparkles size={10} strokeWidth={2.25} className="text-amber" />
          Reveals on {formatLong(capsule.revealDate)}{" "}
          <span className="text-ink-light font-semibold">
            · 1-Year Anniversary
          </span>
        </div>

        <form onSubmit={submit} className="mt-5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="From your name"
            required
            className="w-full mb-2.5 px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy placeholder-ink-light/40 outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
          />

          <div className="rounded-2xl border border-amber/40 bg-white shadow-[0_4px_18px_rgba(196,122,58,0.08)] overflow-hidden">
            <div className="mx-3 mt-3 rounded-lg bg-[#eef0f8] border border-[#d4d8e8] px-4 py-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 text-amber shrink-0" aria-hidden="true">
                  <Sparkles size={10} strokeWidth={2} className="inline -mt-1" />
                  <Pencil size={16} strokeWidth={1.75} className="inline" />
                </span>
                <div>
                  <p className="text-[13px] font-bold text-navy leading-snug">
                    Write something meaningful.
                  </p>
                  <p className="mt-1 text-[12px] italic text-amber-dark leading-[1.4]">
                    &ldquo;Say the thing you&rsquo;d say at the toast.&rdquo;
                  </p>
                  <p className="mt-1 text-[12px] text-ink-mid leading-[1.4]">
                    A memory, a wish, or just what you want them to know going
                    into this next chapter.
                  </p>
                </div>
              </div>
            </div>

            <div
              className="relative px-5 pt-3 pb-2 transition-all"
              style={{
                minHeight: extraHeight ? `${180 + extraHeight}px` : undefined,
              }}
            >
              <TiptapEditor
                initialContent={body}
                onUpdate={setBody}
                placeholder={dearLine}
              />
            </div>
            <div className="px-5 pb-2 flex items-center justify-between">
              <div className="flex gap-3">
                {extraHeight > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setExtraHeight(Math.max(0, extraHeight - 180))
                    }
                    className="text-[11px] text-amber/70 hover:text-amber transition-colors"
                  >
                    Collapse
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setExtraHeight(extraHeight + 180)}
                  className="text-[11px] text-amber/70 hover:text-amber transition-colors"
                >
                  Expand
                </button>
              </div>
              <span className="text-[11px] text-ink-light/50 italic">
                Write as much as you&rsquo;d like.
              </span>
            </div>
          </div>

          <div className="mt-2.5 rounded-2xl border border-amber/30 bg-white shadow-[0_2px_10px_rgba(196,122,58,0.05)] px-5 py-4">
            <p className="text-[14px] font-bold text-navy">
              Add a photo or voice note
            </p>
            <p className="mt-0.5 text-[12px] text-ink-mid">
              A snap from the day, a quick voice memo &mdash; whatever you
              want them to find.
            </p>
            <div className="mt-2.5">
              <PublicMediaAttachments
                token={guestToken}
                ensureContribution={ensureContribution}
                onChange={onMediaChange}
                uploadEndpoint="/api/wedding/contribute"
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-600 text-center" role="alert">
              {error}
            </p>
          )}

          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-[14px] text-navy">
              {couple.coupleNames} won&rsquo;t see this until{" "}
              <span className="font-bold">{formatLong(capsule.revealDate)}</span>
              .
            </p>
            <button
              type="submit"
              disabled={saving}
              className="w-full max-w-[400px] bg-amber text-white py-3.5 rounded-xl text-[16px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60 shadow-[0_2px_8px_rgba(196,122,58,0.25)]"
            >
              {saving ? "Sending…" : "Seal my message"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

/**
 * Decorative flower-and-ribbon image anchored top-right. Sits
 * behind the content (z-0) and is purely visual. We reuse the
 * existing dried-flower asset that's used on /weddings —
 * positioned and clipped so it reads as a corner decoration
 * rather than a hero image.
 */
function FlowerCorner() {
  // Pre-deferred fetch loads the asset alongside HTML so it
  // doesn't pop in mid-render. We size it as a fraction of the
  // viewport so phones get a smaller, less obtrusive flourish.
  useEffect(() => {
    const img = new window.Image();
    img.src =
      "/auto_crop%23TUFISHowSlgtN3cjMSMxZmExNmQzYjc2N2RkY2NmNmU5N2I5NTA2ODc0NDhlNiMxNTM2IyNUUkFOU0ZPUk1BVElPTl9SRVFVRVNU.png";
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 right-0 z-0 w-[180px] sm:w-[240px] lg:w-[320px] opacity-[0.65]"
      style={{
        maskImage:
          "radial-gradient(circle at top right, black 55%, transparent 80%)",
        WebkitMaskImage:
          "radial-gradient(circle at top right, black 55%, transparent 80%)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/auto_crop%23TUFISHowSlgtN3cjMSMxZmExNmQzYjc2N2RkY2NmNmU5N2I5NTA2ODc0NDhlNiMxNTM2IyNUUkFOU0ZPUk1BVElPTl9SRVFVRVNU.png"
        alt=""
        className="w-full h-auto select-none"
      />
    </div>
  );
}
