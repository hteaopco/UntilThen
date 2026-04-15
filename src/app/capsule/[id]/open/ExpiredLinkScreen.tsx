"use client";

import { Mail } from "lucide-react";
import { useState, type FormEvent } from "react";

/**
 * Graceful expiry screen — no error page, no stacktrace. Per
 * the brief, expired links are emotional moments, not bug
 * reports. We ask for the recipient email, fire a new link,
 * and tell them to check their inbox.
 */
export function ExpiredLinkScreen({ capsuleId }: { capsuleId: string }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (sending || !email.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/capsules/${capsuleId}/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error("Couldn't send a new link.");
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="max-w-[440px] w-full text-center">
        <div
          aria-hidden="true"
          className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-tint text-amber flex items-center justify-center"
        >
          <Mail size={20} strokeWidth={1.5} />
        </div>
        <h1 className="text-[26px] font-extrabold text-navy tracking-[-0.4px] leading-tight">
          Your link has expired.
        </h1>
        <p className="mt-3 text-sm text-ink-mid leading-[1.6]">
          No worries — we&rsquo;ll send you a fresh one.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl border border-amber/25 bg-amber-tint/60 px-5 py-4 text-sm text-navy">
            Check your inbox. A fresh link is on its way.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3 text-left">
            <label className="block">
              <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
                Email on file
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="account-input"
                required
              />
            </label>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="w-full bg-amber text-white py-3 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send me a new link →"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
