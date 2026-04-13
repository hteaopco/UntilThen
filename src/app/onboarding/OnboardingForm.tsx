"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

export function OnboardingForm() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [childName, setChildName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill first name from Clerk once the user is loaded.
  useEffect(() => {
    if (isLoaded && user?.firstName) {
      setFirstName((prev) => prev || user.firstName || "");
    }
  }, [isLoaded, user?.firstName]);

  const canSubmit = firstName.trim().length > 0 && childName.trim().length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          childName: childName.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't create your vault. Try again?");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <div className="mb-12">
        <LogoSvg variant="dark" width={140} height={28} />
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-[400px]">
        <h1 className="text-[28px] font-extrabold text-navy tracking-[-0.5px] mb-2">
          Let&rsquo;s get started.
        </h1>
        <p className="text-[15px] text-ink-mid leading-[1.6] mb-8">
          Two quick things and you&rsquo;re in.
        </p>

        <div className="mb-4">
          <label
            htmlFor="firstName"
            className="block text-xs font-bold tracking-[0.06em] uppercase text-ink-light mb-1.5"
          >
            Your first name
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Sarah"
            autoComplete="given-name"
            autoFocus
            disabled={loading}
            className="w-full px-4 py-[13px] text-[15px] text-navy bg-white border-[1.5px] border-navy/[0.12] rounded-lg outline-none focus:border-sky focus:ring-2 focus:ring-sky/20 disabled:opacity-50"
          />
        </div>

        <div className="mb-6">
          <label
            htmlFor="childName"
            className="block text-xs font-bold tracking-[0.06em] uppercase text-ink-light mb-1.5"
          >
            Your child&rsquo;s name
          </label>
          <input
            id="childName"
            type="text"
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="Ellie"
            disabled={loading}
            className="w-full px-4 py-[13px] text-[15px] text-navy bg-white border-[1.5px] border-navy/[0.12] rounded-lg outline-none focus:border-sky focus:ring-2 focus:ring-sky/20 disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="w-full py-3.5 bg-navy text-white text-[15px] font-bold rounded-lg hover:bg-navy-mid transition-colors disabled:bg-ink-light disabled:cursor-not-allowed"
        >
          {loading ? "Setting up your vault…" : "Create my vault →"}
        </button>

        <p className="mt-3.5 text-xs italic text-ink-light text-center">
          You can add more details later from your dashboard.
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-600 text-center" role="alert">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
