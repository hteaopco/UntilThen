"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "loading" | "success" | "error";

export function WaitlistForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
    }
  }

  if (status === "success") {
    return (
      <div className="max-w-[420px] mx-auto bg-sky-tint text-navy px-6 py-5 rounded-[10px]">
        <p className="font-bold flex items-center justify-center gap-2">
          <span aria-hidden="true" className="text-gold">
            ✦
          </span>
          You&rsquo;re on the list.
        </p>
        <p className="text-sm text-ink-mid mt-1">
          We&rsquo;ll be in touch when untilThen is ready.
        </p>
      </div>
    );
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="flex max-w-[420px] mx-auto rounded-[10px] overflow-hidden border border-navy/[0.08] shadow-[0_4px_20px_rgba(15,31,61,0.12)] hover:shadow-[0_10px_32px_rgba(74,158,221,0.22)] focus-within:shadow-[0_10px_32px_rgba(74,158,221,0.28)] transition-shadow"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          placeholder="your@email.com"
          aria-label="Email address"
          className="flex-1 px-5 py-[15px] text-sm font-normal bg-white text-navy placeholder-ink-light outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="bg-navy text-white px-[22px] py-[15px] text-[13px] font-bold whitespace-nowrap hover:bg-navy-mid transition-colors disabled:opacity-50"
        >
          {status === "loading" ? "Joining…" : "Join waitlist →"}
        </button>
      </form>
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
