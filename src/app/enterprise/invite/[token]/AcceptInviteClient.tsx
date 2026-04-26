"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AcceptInviteClient({
  token,
  inviteEmail,
  isSignedIn,
}: {
  token: string;
  inviteEmail: string;
  isSignedIn: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsEmail, setNeedsEmail] = useState<string | null>(null);

  if (!isSignedIn) {
    // New visitors: send to sign-up with redirect_url so they
    // come back here after auth, ready to claim.
    const returnTo = `/enterprise/invite/${token}`;
    return (
      <div className="space-y-3">
        <Link
          href={`/sign-up?redirect_url=${encodeURIComponent(returnTo)}&prefill_email=${encodeURIComponent(inviteEmail)}`}
          className="inline-block w-full bg-amber text-white py-3 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors"
        >
          Set up your untilThen account
        </Link>
        <Link
          href={`/sign-in?redirect_url=${encodeURIComponent(returnTo)}`}
          className="block text-[13px] font-semibold text-ink-mid hover:text-navy transition-colors"
        >
          Already have an account? Sign in.
        </Link>
      </div>
    );
  }

  async function claim() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNeedsEmail(null);
    try {
      const res = await fetch(`/api/orgs/invites/${token}/accept`, {
        method: "POST",
      });
      if (res.status === 409) {
        const data = (await res.json().catch(() => ({}))) as {
          email?: string;
        };
        setNeedsEmail(data.email ?? inviteEmail);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't claim invite.");
      }
      router.push("/enterprise");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (needsEmail) {
    return (
      <div className="space-y-3 text-left">
        <div className="rounded-lg border border-amber/30 bg-amber-tint/40 p-4 text-[13px] text-navy leading-[1.55]">
          <p className="font-semibold mb-1.5">One more step.</p>
          <p>
            This invite was sent to <strong>{needsEmail}</strong>, but that
            email isn&rsquo;t on your account yet. Add it (Clerk will verify
            with a code), then click &ldquo;Claim again.&rdquo;
          </p>
        </div>
        <Link
          href="/account"
          className="inline-block w-full text-center bg-navy text-white py-3 rounded-lg text-[14px] font-bold hover:bg-navy/90 transition-colors"
        >
          Open account → Add email
        </Link>
        <button
          type="button"
          onClick={claim}
          disabled={busy}
          className="w-full text-[13px] font-semibold text-ink-mid hover:text-navy transition-colors disabled:opacity-50"
        >
          Claim again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={claim}
        disabled={busy}
        className="w-full bg-amber text-white py-3 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
      >
        {busy ? "Claiming…" : "Claim your seat"}
      </button>
      {error && (
        <p className="text-[13px] text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
