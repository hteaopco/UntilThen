"use client";

import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Library, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

type Step = "name" | "path";
type Path = "vault" | "capsule";

/**
 * Onboarding wizard — simplified to the two questions we
 * actually need at signup:
 *
 *   Step 1 — parent's first name.
 *   Step 2 — path: child vault or gift capsule.
 *
 * Both paths create the User row only. Child details (name,
 * DOB, reveal date) are collected later via AddChildModal,
 * where the subscription paywall lives. That means new signups
 * land in the product without hitting a paywall at step 0 —
 * they get to explore their free owner vault first, then pay
 * when they commit to starting a time capsule.
 *
 * `?path=capsule` persisted through Clerk sign-up auto-selects
 * the capsule path after step 1 (used by the landing-page
 * "Start a gift capsule" CTA that routes through sign-up).
 */
export function OnboardingForm({
  initialPath,
}: {
  initialPath: "capsule" | null;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [step, setStep] = useState<Step>("name");
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

  async function saveAndRoute(path: Path) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          path: path === "capsule" ? "memory_capsule" : "child_vault",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Something went wrong.");
      }
      if (path === "capsule") {
        // Gift capsule path → land on the capsule creation form.
        router.push("/capsules/new");
      } else {
        // Vault path → dashboard. They'll hit SubscriptionCheckout
        // the first time they click "Add a time capsule".
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // URL param wins: if the user came from the landing CTA with
  // ?path=capsule, skip step 2 after step 1 and go straight to
  // the capsule flow.
  async function continueFromName(e: FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || loading) return;
    if (initialPath === "capsule") {
      await saveAndRoute("capsule");
      return;
    }
    setStep("path");
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
        {step === "name" && (
          <form onSubmit={continueFromName} className="space-y-5">
            <div>
              <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
                Welcome to untilThen
              </h1>
              <p className="mt-2 text-[15px] text-ink-mid leading-[1.6]">
                Let&rsquo;s start with your first name.
              </p>
            </div>
            <label className="block">
              <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
                Your first name
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
                Last name (optional)
              </span>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="account-input"
                placeholder="Morgan"
              />
            </label>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={!firstName.trim() || loading}
              className="w-full bg-amber text-white py-3.5 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
            >
              {loading ? "Saving…" : "Continue"}
            </button>
          </form>
        )}

        {step === "path" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
                What would you like to do?
              </h1>
              <p className="mt-2 text-[15px] text-ink-mid leading-[1.6]">
                Pick one — you can do the other later.
              </p>
            </div>

            <PathCard
              icon="vault"
              title="Write to my child"
              body="Seal memories, letters and voice notes in a vault they open when they're ready."
              price="$4.99/month"
              cta="Get started"
              onClick={() => saveAndRoute("vault")}
              disabled={loading}
            />

            <PathCard
              icon="capsule"
              title="Create a Gift Capsule"
              body="Collect memories from friends and family for a birthday, anniversary, retirement or any milestone."
              price="$9.99 one-time · No subscription"
              cta="Create a capsule"
              onClick={() => saveAndRoute("capsule")}
              disabled={loading}
            />

            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => setStep("name")}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-mid hover:text-navy transition-colors"
            >
              <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
              Back
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function PathCard({
  icon,
  title,
  body,
  price,
  cta,
  onClick,
  disabled,
}: {
  icon: "vault" | "capsule";
  title: string;
  body: string;
  price: string;
  cta: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = icon === "vault" ? Library : Sparkles;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group w-full text-left rounded-2xl border border-navy/[0.08] bg-white px-6 py-6 hover:border-amber/40 hover:shadow-[0_8px_24px_rgba(15,31,61,0.06)] focus:outline-none focus:border-amber/60 focus:shadow-[0_8px_24px_rgba(15,31,61,0.06)] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className="shrink-0 w-11 h-11 rounded-xl bg-amber-tint text-amber flex items-center justify-center"
        >
          <Icon size={20} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[17px] font-bold text-navy tracking-[-0.2px]">
            {title}
          </h2>
          <p className="mt-1 text-sm text-ink-mid leading-[1.6]">{body}</p>
          <p className="mt-2 text-xs italic text-ink-light">{price}</p>
          <p className="mt-3 text-sm font-bold text-amber group-hover:text-amber-dark transition-colors">
            {cta}
          </p>
        </div>
      </div>
    </button>
  );
}
