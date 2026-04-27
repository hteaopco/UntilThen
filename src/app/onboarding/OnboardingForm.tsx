"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

/**
 * Onboarding — single-step name capture.
 *
 * After Clerk sign-up + email confirm, the user lands here. We
 * collect first + last name (prefilled from Clerk if available)
 * and create the User row, then route them to /home.
 *
 * Path-picker (Time Capsule vs Gift Capsule) used to live here as
 * a second step — it was removed because /home already surfaces
 * both products. New users default to userType: "BOTH" so the
 * dashboard personalisation shows everything; userType updates
 * dynamically as they actually use one product or the other.
 *
 * `?path=capsule` is still honoured: when set, after creating the
 * User row we route to /capsules/new instead of /home so the
 * landing-page Gift Capsule CTA → /sign-up?path=capsule lands the
 * user directly in the capsule creation flow.
 */
export function OnboardingForm({
  initialPath,
  redirectUrl,
}: {
  initialPath: "capsule" | null;
  /** When supplied (typically from a /sign-up?redirect_url=...
   *  upstream link), the onboarding form pushes here on successful
   *  submit instead of /home or /capsules/new. Lets flows like the
   *  reveal-claim handler or capsule creation resume after the user
   *  signs up + names themselves. */
  redirectUrl: string | null;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill the parent's name from Clerk once the session
  // hydrates — we collected it at sign-up.
  useEffect(() => {
    if (!isLoaded) return;
    if (user?.firstName) setFirstName((prev) => prev || user.firstName || "");
    if (user?.lastName) setLastName((prev) => prev || user.lastName || "");
  }, [isLoaded, user?.firstName, user?.lastName]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          // Honour the landing-page Gift Capsule CTA so the userType
          // stamps appropriately. When initialPath is null we default
          // to BOTH (handled API-side) so the dashboard shows both
          // products until the user actually picks one.
          path: initialPath === "capsule" ? "memory_capsule" : undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Something went wrong.");
      }
      // Destination priority:
      //   1. explicit redirect_url (capsule creation resume,
      //      reveal-claim handler, etc.)
      //   2. initialPath=capsule → /capsules/new (Gift Capsule CTA)
      //   3. /home (default)
      const next =
        redirectUrl ??
        (initialPath === "capsule" ? "/capsules/new" : "/home");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream">
      <header className="px-6 lg:px-10 py-5 flex items-center justify-between max-w-[720px] mx-auto">
        <span className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber">
          Welcome
        </span>
        <LogoSvg variant="dark" width={110} height={22} />
      </header>

      <section className="mx-auto max-w-[520px] px-6 pt-10 pb-20">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
              Welcome to untilThen
            </h1>
            <p className="mt-2 text-[15px] text-ink-mid leading-[1.6]">
              Tell us your name and we&rsquo;ll get you set up.
            </p>
          </div>
          <label className="block">
            <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
              First name
            </span>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="account-input"
              placeholder="Alex"
              required
              autoFocus
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
              Last name
            </span>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="account-input"
              placeholder="Morgan"
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
            disabled={!firstName.trim() || !lastName.trim() || loading}
            className="w-full bg-amber text-white py-3.5 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
          >
            {loading ? "Saving…" : "Continue"}
          </button>
        </form>
      </section>
    </main>
  );
}
