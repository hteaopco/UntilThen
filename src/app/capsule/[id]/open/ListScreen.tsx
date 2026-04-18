"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";

import { captureEvent } from "@/components/PosthogProvider";
import { EntryTypeBadge } from "@/components/ui/EntryTypeBadge";
import { formatLong } from "@/lib/dateFormatters";

type Occasion =
  | "BIRTHDAY"
  | "ANNIVERSARY"
  | "RETIREMENT"
  | "GRADUATION"
  | "WEDDING"
  | "OTHER";

type Contribution = {
  id: string;
  authorName: string;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  title: string | null;
  body: string | null;
};

export function ListScreen({
  capsule,
  token,
  contributions,
  preview,
}: {
  capsule: {
    id: string;
    title: string;
    recipientName: string;
    occasionType: Occasion;
    revealDate: string;
    hasAccount: boolean;
  };
  token: string;
  contributions: Contribution[];
  preview: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(capsule.hasAccount);

  async function linkToAccount() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/capsules/${capsule.id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't save.");
      }
      setSaved(true);
      if (!preview) captureEvent("capsule_account_created");
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const open = openId
    ? contributions.find((c) => c.id === openId) ?? null
    : null;

  return (
    <main className="min-h-screen bg-warm-slate text-white">
      <section className="mx-auto max-w-[680px] px-6 pt-14 pb-10 text-center">
        <h1 className="text-[28px] lg:text-[36px] font-extrabold tracking-[-0.5px] leading-[1.1]">
          {capsule.title}
        </h1>
        <p className="mt-2 text-white/60 text-[15px]">
          {formatLong(capsule.revealDate)} ·{" "}
          {contributions.length.toLocaleString()}{" "}
          {contributions.length === 1 ? "memory" : "memories"}
        </p>
      </section>

      {open ? (
        <section className="mx-auto max-w-[680px] px-6 pb-16">
          <button
            type="button"
            onClick={() => setOpenId(null)}
            className="mb-4 text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            ← Back to list
          </button>
          <article className="rounded-2xl bg-[#fdfbf5] text-navy px-7 py-8 lg:px-9 lg:py-10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)]">
            <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
              From {open.authorName}
            </div>
            {open.title && (
              <h2 className="text-2xl lg:text-[28px] font-extrabold tracking-[-0.4px] leading-tight text-navy mb-4">
                {open.title}
              </h2>
            )}
            {open.body && (
              <div
                className="tiptap-editor text-[16px] leading-[1.75] text-ink-mid"
                dangerouslySetInnerHTML={{ __html: open.body }}
              />
            )}
          </article>
        </section>
      ) : (
        <section className="mx-auto max-w-[680px] px-6 pb-12">
          {contributions.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center text-white/70">
              Nothing came through in time for the reveal.
            </div>
          ) : (
            <ul className="space-y-2">
              {contributions.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(c.id)}
                    className="w-full flex items-center gap-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 px-5 py-4 text-left transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs uppercase tracking-[0.12em] font-bold text-white/55">
                        From {c.authorName}
                      </div>
                      {c.title && (
                        <div className="mt-1 text-sm font-bold text-white truncate">
                          {c.title}
                        </div>
                      )}
                      {c.body && (
                        <p className="mt-1 text-sm text-white/85 line-clamp-2">
                          {c.body.replace(/<[^>]+>/g, " ")}
                        </p>
                      )}
                    </div>
                    <EntryTypeBadge type={c.type} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="mx-auto max-w-[680px] px-6 pb-16">
        <div className="border-t border-white/10 pt-10 space-y-10">
          {!saved && (
            <div className="text-center">
              <h2 className="text-xl font-extrabold text-white tracking-[-0.3px]">
                Want to keep this forever?
              </h2>
              <p className="mt-2 text-sm text-white/60 leading-[1.6]">
                Create a free account to save your capsule and revisit it
                any time.
              </p>
              <div className="mt-5 inline-flex flex-wrap items-center gap-3 justify-center">
                <SignedIn>
                  <button
                    type="button"
                    onClick={linkToAccount}
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-gold text-navy px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-light transition-colors disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Save my capsule"}
                  </button>
                </SignedIn>
                <SignedOut>
                  <SignUpButton mode="modal">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 bg-gold text-navy px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-light transition-colors"
                    >
                      Save my capsule
                    </button>
                  </SignUpButton>
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      className="text-sm font-medium text-white/70 hover:text-white underline underline-offset-4"
                    >
                      Already have an account?
                    </button>
                  </SignInButton>
                </SignedOut>
              </div>
              {saveError && (
                <p className="mt-3 text-sm text-red-300" role="alert">
                  {saveError}
                </p>
              )}
            </div>
          )}

          {saved && (
            <div className="text-center text-sm italic text-white/70">
              Saved to your account. Open it any time from your dashboard.
            </div>
          )}

          <div className="text-center">
            <h2 className="text-xl font-extrabold text-white tracking-[-0.3px]">
              Love this idea?
            </h2>
            <p className="mt-2 text-sm text-white/60 leading-[1.6]">
              Write to someone you love — for years, not just once.
            </p>
            <div className="mt-5">
              <Link
                href="/"
                onClick={() => {
                  if (!preview) captureEvent("capsule_upsell_clicked");
                }}
                className="inline-flex items-center gap-2 bg-white text-navy px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-white/90 transition-colors"
              >
                Start writing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
