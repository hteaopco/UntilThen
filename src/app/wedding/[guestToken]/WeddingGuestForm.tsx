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

type Phase =
  | "splash"
  | "card"
  | "editor"
  | "thankyou-typing"
  | "thankyou"
  | "preview";

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
  return { isCouple, coupleNames };
}

export function WeddingGuestForm({
  guestToken,
  capsule,
  assetVersions,
}: {
  guestToken: string;
  capsule: Capsule;
  /** Server-computed mtime stamps for /Card.png and /Roses.png.
   *  Appended as ?v=… so any re-upload busts the browser cache
   *  automatically on next deploy — see src/lib/asset-version.ts. */
  assetVersions: { card: string; roses: string };
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
  const [saveForLaterOpen, setSaveForLaterOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  // Fade the card-phase CTAs in after a short pause so they
  // don't pop into view before the Card.png finishes painting.
  // Resets each time the phase re-enters "card".
  const [cardCtasVisible, setCardCtasVisible] = useState(false);
  useEffect(() => {
    if (phase !== "card") return;
    setCardCtasVisible(false);
    const t = window.setTimeout(() => setCardCtasVisible(true), 1500);
    return () => window.clearTimeout(t);
  }, [phase]);
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
        <RosesCorner version={assetVersions.roses} />
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
          {/* The card art has a transparent border around the
              cream paper. We paint the same cream onto the img's
              own background so transparent pixels render as the
              page color (no checkerboard, no fringe). The
              `transform: scale(1.1)` makes the painted artwork
              ~10% larger than its layout box; bleed off the
              phone edges is clipped by the parent `<main>`'s
              `overflow-hidden`, and CTAs absorb the bottom
              overflow with the bumped top margin below. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/Card.png?v=${assetVersions.card}`}
            alt=""
            aria-hidden="true"
            className="w-full h-auto block select-none bg-cream"
            style={{
              transform: "scale(1.1)",
              transformOrigin: "center",
            }}
          />
          <div
            className="mt-12 flex flex-wrap items-center justify-center gap-3 transition-all duration-700 ease-out"
            style={{
              opacity: cardCtasVisible ? 1 : 0,
              transform: cardCtasVisible ? "translateY(0)" : "translateY(16px)",
            }}
          >
            <button
              type="button"
              onClick={() => setPhase("editor")}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-amber text-white text-[14px] font-bold shadow-[0_8px_22px_-8px_rgba(196,122,58,0.6)] hover:bg-amber-dark transition-colors"
            >
              <Pencil size={14} strokeWidth={2} aria-hidden="true" />
              Leave Message Now
            </button>
            <button
              type="button"
              onClick={() => setSaveForLaterOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-amber/50 text-amber-dark bg-white text-[14px] font-bold hover:bg-amber/10 transition-colors"
            >
              Save For Later
            </button>
          </div>
        </div>
        {saveForLaterOpen && (
          <SaveForLaterModal
            guestToken={guestToken}
            coupleNames={couple.coupleNames}
            onClose={() => setSaveForLaterOpen(false)}
          />
        )}
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
        <RosesCorner version={assetVersions.roses} />
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
                className="mt-6 flex flex-col items-center gap-2.5 transition-opacity duration-700 ease-out"
                style={{ opacity: showCta ? 1 : 0 }}
              >
                <button
                  type="button"
                  onClick={() => setPhase("preview")}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-[15px] font-bold border border-amber/50 bg-white text-amber-dark hover:bg-amber/10 transition-colors"
                >
                  Preview my message
                </button>
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

  // ── Phase 5: Preview the contributor's own message ─────
  // Mirrors what the recipient will see on reveal day, but
  // restricted to the contributor's own entry. Tapping
  // "View all messages" surfaces the explainer modal that
  // makes the limitation explicit and offers an exit back
  // to /weddings.
  if (phase === "preview") {
    const plainBody = body
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return (
      <main className="relative min-h-screen bg-cream overflow-hidden pb-20">
        <RosesCorner version={assetVersions.roses} />
        <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-navy/[0.06]">
          <div className="px-6 py-4 flex items-center justify-between max-w-[720px] mx-auto">
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-bold text-amber">
              <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
              Preview
            </span>
            <LogoSvg variant="dark" width={110} height={22} />
          </div>
        </header>
        <section className="relative z-10 mx-auto max-w-[640px] px-6 pt-6">
          <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.22em] uppercase text-amber">
            Messages for {couple.coupleNames}
          </p>
          <h1 className="mt-2 font-brush text-[36px] sm:text-[44px] text-navy leading-[0.95]">
            A memory for
            <br />
            <span className="text-amber">{couple.coupleNames}</span>
          </h1>
          <ul className="mt-6 space-y-3">
            <li className="rounded-2xl border border-amber/30 bg-white px-5 py-4 shadow-[0_4px_18px_rgba(196,122,58,0.06)]">
              <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-amber-dark">
                From {name.trim() || "you"}
              </div>
              {plainBody && (
                <p className="mt-2 text-[15px] text-navy leading-[1.6] whitespace-pre-line">
                  {plainBody}
                </p>
              )}
              {!plainBody && (
                <p className="mt-2 text-[13px] text-ink-light italic">
                  (No text — your media will appear here on reveal day.)
                </p>
              )}
            </li>
          </ul>
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setPreviewModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-[15px] font-bold bg-amber text-white hover:bg-amber-dark transition-colors"
            >
              View all messages
            </button>
          </div>
        </section>
        {previewModalOpen && (
          <PreviewExitModal
            coupleNames={couple.coupleNames}
            onClose={() => setPreviewModalOpen(false)}
          />
        )}
      </main>
    );
  }

  // ── Phase 3: Editor ───────────────────────────────────
  const dearLine = `Dear ${couple.coupleNames},`;

  return (
    <main className="relative min-h-screen bg-cream overflow-hidden">
      <RosesCorner version={assetVersions.roses} />
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
        <h1 className="mt-2 font-brush text-[36px] sm:text-[44px] text-navy leading-[0.95]">
          A memory for
          <br />
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
 * Editor-only top-right roses decoration. The Roses.png asset
 * has a lot of cream padding around the actual flowers, so we
 * size it large and translate the bounding box up + right so
 * the empty padding bleeds off-screen and only the floral peeks
 * into the corner. Absolute (not fixed) so it scrolls away with
 * the heading instead of clinging while the user is in the
 * editor body.
 */
function RosesCorner({ version }: { version: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-0 right-0 z-0 w-[240px] sm:w-[305px] lg:w-[375px]"
      style={{ transform: "translate(20%, -18%)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/Roses.png?v=${version}`}
        alt=""
        className="w-full h-auto select-none"
      />
    </div>
  );
}

/**
 * Modal that fires when the contributor taps "View all messages"
 * inside the preview phase. Makes it explicit that only their
 * own message is visible right now and that the couple will see
 * everyone's contributions on reveal day. The "Exit preview" CTA
 * routes them back to /weddings.
 */
function PreviewExitModal({
  coupleNames,
  onClose,
}: {
  coupleNames: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-navy/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[440px] px-6 py-6"
      >
        <h2 className="text-[18px] font-extrabold text-navy tracking-[-0.2px]">
          Just a preview
        </h2>
        <p className="mt-2 text-[14px] text-ink-mid leading-[1.55]">
          {coupleNames} will be able to filter through all messages left for
          them in this section. Right now only yours shows, but when the
          reveal is sent to them, they&rsquo;ll have access to everyone&rsquo;s.
          Thank you for contributing.
        </p>
        <div className="mt-5 flex gap-2">
          <Link
            href="/weddings"
            className="flex-1 inline-flex items-center justify-center bg-amber text-white py-2.5 rounded-lg text-[14px] font-bold hover:bg-amber-dark transition-colors"
          >
            Exit preview
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-[13px] font-semibold border border-navy/15 text-ink-mid hover:text-navy hover:border-navy/30 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * "Save For Later" modal — collects first / last / phone so we
 * can text the guest a reminder link to the same /wedding/[token]
 * URL. Persists to WeddingSaveForLater on submit; the actual
 * SMS dispatch is a follow-up (Twilio not wired yet), so this
 * is currently a polite IOU plus a stored lead row.
 */
function SaveForLaterModal({
  guestToken,
  coupleNames,
  onClose,
}: {
  guestToken: string;
  coupleNames: string;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (busy) return;
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setError("Please fill in all three fields.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/wedding/save-for-later/${guestToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't save.");
      }
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-navy/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[420px] px-6 py-6"
      >
        {done ? (
          <>
            <h2 className="text-[18px] font-extrabold text-navy tracking-[-0.2px]">
              We&rsquo;ll text you a reminder.
            </h2>
            <p className="mt-2 text-[14px] text-ink-mid leading-[1.55]">
              When you&rsquo;re ready, tap the link in our text and pick up
              right where you left off. Thanks for sharing in {coupleNames}
              &rsquo;s moment.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full bg-amber text-white py-2.5 rounded-lg text-[14px] font-bold hover:bg-amber-dark transition-colors"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <p className="text-[15px] text-navy leading-[1.55]">
              Thank you for wanting to share in this moment, we&rsquo;ll
              send you a text alert with a link so you don&rsquo;t forget!
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                className="w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy placeholder-ink-light/40 outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                className="w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy placeholder-ink-light/40 outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
              />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone Number"
                className="w-full sm:col-span-2 px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy placeholder-ink-light/40 outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
              />
            </div>
            {error && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="flex-1 bg-amber text-white py-2.5 rounded-lg text-[14px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save For Later"}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="px-4 py-2.5 rounded-lg text-[13px] font-semibold border border-navy/15 text-ink-mid hover:text-navy hover:border-navy/30 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
