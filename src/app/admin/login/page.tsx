"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Invalid password");
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm">
        <h1 className="text-2xl font-extrabold text-navy tracking-[-0.5px] mb-2 text-center">
          untilThen
        </h1>
        <p className="text-sm text-ink-mid mb-8 text-center">Admin sign in</p>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          autoFocus
          className="w-full min-h-[44px] px-4 rounded-lg border border-navy/15 text-navy bg-white placeholder-ink-light focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 text-sm mb-3"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-amber text-white py-3 rounded-lg text-sm font-bold tracking-[0.01em] hover:bg-amber-dark transition-colors disabled:opacity-60"
        >
          {loading ? "Checking…" : "Sign in"}
        </button>
        {error && (
          <p className="mt-3 text-sm text-red-600 text-center" role="alert">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
