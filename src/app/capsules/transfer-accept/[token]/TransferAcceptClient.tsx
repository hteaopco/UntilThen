"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TransferAcceptClient({
  token,
  capsuleTitle,
  recipientName,
  toEmail,
  toFirstName,
}: {
  token: string;
  capsuleTitle: string;
  recipientName: string;
  toEmail: string;
  toFirstName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/capsules/transfer-accept/${token}`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        capsuleId?: string;
        error?: string;
      };
      if (!res.ok || !data.capsuleId)
        throw new Error(data.error ?? "Couldn't accept transfer.");
      router.push(`/capsules/${data.capsuleId}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber/25 bg-white px-7 py-7">
      <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber">
        Wedding Capsule
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-navy tracking-[-0.3px]">
        Manage {recipientName}&rsquo;s wedding capsule, {toFirstName}?
      </h1>
      <p className="mt-3 text-[15px] text-ink-mid leading-[1.55]">
        You&rsquo;ve been asked to take over the management of{" "}
        <strong className="text-navy">{capsuleTitle}</strong> through reveal
        day. Once you accept, you&rsquo;ll be able to see contributions as they
        come in, share the QR code with guests, and seal the capsule. The
        original purchaser will no longer be able to manage it.
      </p>
      <p className="mt-3 text-[13px] text-ink-light italic">
        Signed in as <span className="font-mono">{toEmail}</span>. If this
        isn&rsquo;t the right account, sign in with a different email first.
      </p>
      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={accept}
        disabled={busy}
        className="mt-6 w-full bg-amber text-white py-3 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
      >
        {busy ? "Accepting…" : "Accept & take over"}
      </button>
    </div>
  );
}
