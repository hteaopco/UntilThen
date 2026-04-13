"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

export function OnboardingForm() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [childFirstName, setChildFirstName] = useState("");
  const [childLastName, setChildLastName] = useState("");
  const [childDateOfBirth, setChildDateOfBirth] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill parent names from Clerk once the session is hydrated.
  useEffect(() => {
    if (!isLoaded) return;
    if (user?.firstName) setFirstName((prev) => prev || user.firstName || "");
    if (user?.lastName) setLastName((prev) => prev || user.lastName || "");
  }, [isLoaded, user?.firstName, user?.lastName]);

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    childFirstName.trim().length > 0 &&
    childLastName.trim().length > 0 &&
    childDateOfBirth.length > 0;

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
          lastName: lastName.trim(),
          childFirstName: childFirstName.trim(),
          childLastName: childLastName.trim(),
          childDateOfBirth,
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
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 py-12">
      <div className="mb-10">
        <LogoSvg variant="dark" width={140} height={28} />
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-[440px]">
        <h1 className="text-[28px] font-extrabold text-navy tracking-[-0.5px] mb-2">
          Let&rsquo;s get started.
        </h1>
        <p className="text-[15px] text-ink-mid leading-[1.6] mb-8">
          A few quick things and you&rsquo;re in.
        </p>

        {/* Parent first + last name */}
        <FieldLabel>Your name</FieldLabel>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            autoComplete="given-name"
            autoFocus
            disabled={loading}
            className="w-full px-4 py-[13px] text-[15px] text-navy bg-white border-[1.5px] border-navy/[0.12] rounded-lg outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 disabled:opacity-50"
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            autoComplete="family-name"
            disabled={loading}
            className="w-full px-4 py-[13px] text-[15px] text-navy bg-white border-[1.5px] border-navy/[0.12] rounded-lg outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 disabled:opacity-50"
          />
        </div>

        {/* Child first + last name */}
        <FieldLabel>Your child&rsquo;s name</FieldLabel>
        <div className="grid grid-cols-2 gap-3 mb-5">
          <input
            type="text"
            value={childFirstName}
            onChange={(e) => setChildFirstName(e.target.value)}
            placeholder="First name"
            disabled={loading}
            className="w-full px-4 py-[13px] text-[15px] text-navy bg-white border-[1.5px] border-navy/[0.12] rounded-lg outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 disabled:opacity-50"
          />
          <input
            type="text"
            value={childLastName}
            onChange={(e) => setChildLastName(e.target.value)}
            placeholder="Last name"
            disabled={loading}
            className="w-full px-4 py-[13px] text-[15px] text-navy bg-white border-[1.5px] border-navy/[0.12] rounded-lg outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 disabled:opacity-50"
          />
        </div>

        {/* Child birthdate */}
        <FieldLabel>Your child&rsquo;s birthdate</FieldLabel>
        <input
          type="date"
          value={childDateOfBirth}
          onChange={(e) => setChildDateOfBirth(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          disabled={loading}
          className="w-full px-4 py-[13px] text-[15px] text-navy bg-white border-[1.5px] border-navy/[0.12] rounded-lg outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 disabled:opacity-50 mb-6"
        />

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="w-full py-3.5 bg-amber text-white text-[15px] font-bold rounded-lg hover:bg-amber-dark transition-colors disabled:bg-ink-light disabled:cursor-not-allowed"
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold tracking-[0.06em] uppercase text-ink-light mb-1.5">
      {children}
    </label>
  );
}
