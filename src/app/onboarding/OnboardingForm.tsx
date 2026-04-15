"use client";

import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Library, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

type Step = "name" | "path" | "child";

type Path = "vault" | "capsule";

/**
 * Onboarding wizard with a two-path split.
 *
 *  Step 1 — first name (both paths).
 *  Step 2 — choose path: child vault or memory capsule.
 *  Step 3 — only on vault path, collect child details; capsule
 *           path hits the API immediately and then redirects to
 *           /capsules/new.
 *
 * If the caller passes `addVaultOnly`, the existing user wants
 * to add a child vault after having organized a capsule; we skip
 * the path step and go straight to step 3.
 *
 * `?path=capsule` persisted through Clerk sign-up auto-selects
 * the capsule path after step 1.
 */
export function OnboardingForm({
  initialPath,
  addVaultOnly,
}: {
  initialPath: "capsule" | null;
  addVaultOnly: boolean;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [step, setStep] = useState<Step>(addVaultOnly ? "child" : "name");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [childFirstName, setChildFirstName] = useState("");
  const [childLastName, setChildLastName] = useState("");
  const [childDateOfBirth, setChildDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill the parent's name from Clerk once the session
  // hydrates — we collected it at sign-up.
  useEffect(() => {
    if (!isLoaded) return;
    if (user?.firstName) setFirstName((prev) => prev || user.firstName || "");
    if (user?.lastName) setLastName((prev) => prev || user.lastName || "");
  }, [isLoaded, user?.firstName, user?.lastName]);

  async function saveName(path: Path) {
    // Capsule path: create the user record name-only and route
    // to /capsules/new so the organiser lands on the actual
    // creation form they were reaching for.
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          path: "memory_capsule",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Something went wrong.");
      }
      if (path === "capsule") {
        router.push("/capsules/new");
      } else {
        setStep("child");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function saveChild(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim() || (user?.firstName ?? ""),
          lastName: lastName.trim() || (user?.lastName ?? ""),
          childFirstName: childFirstName.trim(),
          childLastName: childLastName.trim(),
          childDateOfBirth,
          path: "child_vault",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Something went wrong.");
      }
      router.push("/dashboard");
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
      await saveName("capsule");
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
            {/* lastName is optional at this step — we keep the
                column filled but don't block progress. */}
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
              {loading ? "Saving…" : "Continue →"}
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
                Pick either one — you can add the other later.
              </p>
            </div>

            <PathCard
              icon="vault"
              title="Write to my child"
              body="Seal memories, letters and voice notes in a vault they open when they're ready."
              price="$3.99/month — 7-day free trial"
              cta="Get started →"
              onClick={() => {
                // Vault path: keep the name on the wizard and
                // advance to child details. We don't hit the API
                // until the child details are in — the record
                // gets created with both halves in one go so a
                // user that bails at step 3 doesn't leave a
                // half-initialized account behind.
                setStep("child");
              }}
              disabled={loading}
            />

            <PathCard
              icon="capsule"
              title="Create a Memory Capsule"
              body="Collect memories from friends and family for a birthday, anniversary, retirement or any milestone."
              price="$9.99 one-time · No subscription"
              cta="Create a capsule →"
              onClick={() => saveName("capsule")}
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

        {step === "child" && (
          <form onSubmit={saveChild} className="space-y-5">
            <div>
              <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
                Tell us about your child
              </h1>
              <p className="mt-2 text-[15px] text-ink-mid leading-[1.6]">
                We&rsquo;ll set up their vault with a reveal date on their
                18th birthday — you can change it any time.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
                  First name
                </span>
                <input
                  type="text"
                  value={childFirstName}
                  onChange={(e) => setChildFirstName(e.target.value)}
                  className="account-input"
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
                  value={childLastName}
                  onChange={(e) => setChildLastName(e.target.value)}
                  className="account-input"
                  required
                />
              </label>
            </div>

            <label className="block">
              <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
                Birthdate
              </span>
              <input
                type="date"
                value={childDateOfBirth}
                onChange={(e) => setChildDateOfBirth(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
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
              disabled={
                !childFirstName.trim() ||
                !childLastName.trim() ||
                !childDateOfBirth ||
                loading
              }
              className="w-full bg-amber text-white py-3.5 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create their vault →"}
            </button>

            {!addVaultOnly && (
              <button
                type="button"
                onClick={() => setStep("path")}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-mid hover:text-navy transition-colors"
              >
                <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
                Back
              </button>
            )}
          </form>
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
