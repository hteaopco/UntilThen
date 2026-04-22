"use client";

import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Full-page prompt shown in place of the memory editor when the
 * target vault is locked (over-quota after an addon was removed,
 * or manually locked from the capsules page). Gives two clear
 * paths: unlock this capsule in place, or head to Billing to
 * juggle slots / swap which capsule is active.
 *
 * Unlock may fail with 409 needsAddOn if every slot is already
 * in use — we surface that back to the user with a "Go to
 * Billing" fallback so they can lock a different capsule first
 * or buy another add-on.
 */
export function LockedCapsulePrompt({
  vaultId,
  childId,
  childFirstName,
}: {
  vaultId: string;
  childId: string;
  childFirstName: string;
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/vaults/${vaultId}/lock`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't unlock this capsule.");
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream">
      <section className="mx-auto max-w-[520px] px-6 pt-16 pb-20">
        <Link
          href={`/vault/${childId}`}
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.12em] uppercase text-ink-light hover:text-navy transition-colors mb-10"
        >
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          Back to capsule
        </Link>

        <div className="rounded-2xl border border-navy/[0.08] bg-white px-6 py-8 sm:px-8">
          <div
            aria-hidden="true"
            className="w-12 h-12 rounded-full bg-amber-tint flex items-center justify-center text-amber mb-4"
          >
            <Lock size={22} strokeWidth={1.75} />
          </div>

          <h1 className="text-[22px] font-extrabold text-navy tracking-[-0.3px] mb-2">
            {childFirstName}&rsquo;s capsule is locked.
          </h1>
          <p className="text-[14px] text-ink-mid leading-[1.6] mb-5">
            You need an active paid slot to add or edit memories here.
            Unlock this capsule to pick up where you left off, or head to
            Billing to swap which capsule is active.
          </p>

          {error && (
            <p className="text-sm text-red-600 mb-4" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={unlock}
              disabled={working}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-amber text-white py-3 rounded-lg text-[14px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
            >
              {working ? "Unlocking…" : "Unlock this capsule"}
            </button>
            <Link
              href="/account/billing"
              prefetch={false}
              className="inline-flex items-center justify-center px-4 py-3 rounded-lg border border-navy/15 text-navy text-[14px] font-semibold hover:border-navy transition-colors"
            >
              Go to Billing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
