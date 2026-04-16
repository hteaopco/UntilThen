"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function InviteAccept({
  token,
  alreadyAccepted,
  vaultId,
}: {
  token: string;
  alreadyAccepted: boolean;
  vaultId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invites/${token}/accept`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't accept invite.");
      }
      router.push(`/contribute/${vaultId}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div>
      <SignedOut>
        <div className="flex flex-wrap gap-3">
          <SignUpButton
            mode="redirect"
            forceRedirectUrl={`/invite/${token}`}
            signInForceRedirectUrl={`/invite/${token}`}
          >
            <button
              type="button"
              className="bg-amber text-white px-5 py-3 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
            >
              Create account
            </button>
          </SignUpButton>
          <SignInButton
            mode="redirect"
            forceRedirectUrl={`/invite/${token}`}
          >
            <button
              type="button"
              className="border border-navy/15 text-navy px-5 py-3 rounded-lg text-sm font-bold hover:border-navy transition-colors"
            >
              Sign in
            </button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        {alreadyAccepted ? (
          <button
            type="button"
            onClick={() => router.push(`/contribute/${vaultId}`)}
            className="bg-amber text-white px-5 py-3 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
          >
            Go to your contributor dashboard
          </button>
        ) : (
          <button
            type="button"
            onClick={accept}
            disabled={loading}
            className="bg-amber text-white px-5 py-3 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
          >
            {loading ? "Accepting…" : "Accept invitation"}
          </button>
        )}
        {error && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </SignedIn>
    </div>
  );
}
