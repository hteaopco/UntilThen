"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SealMomentActions({
  entryId,
  entryTitle,
  childFirstName,
  unlockLabel,
  isSealed,
}: {
  entryId: string;
  entryTitle: string;
  childFirstName: string;
  unlockLabel: string;
  isSealed: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSealed: true, isDraft: false }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't seal. Try again?");
      }
      setOpen(false);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const buttonLabel = isSealed ? "Save changes" : "Seal Moment →";

  return (
    <>
      <button
        type="button"
        onClick={() => (isSealed ? confirm() : setOpen(true))}
        disabled={busy}
        className="bg-navy text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-navy-mid transition-colors disabled:opacity-60"
      >
        {busy ? "Saving…" : buttonLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[440px]"
          >
            <div className="px-8 pt-10 pb-6 text-center">
              <div aria-hidden="true" className="text-4xl mb-5">
                ✉️
              </div>
              <h2 className="text-2xl font-extrabold text-navy tracking-[-0.3px] mb-3">
                Seal this moment?
              </h2>
              <p className="text-[15px] font-semibold text-navy mb-1">
                &ldquo;{entryTitle}&rdquo;
              </p>
              <p className="text-sm text-ink-mid mb-5">Unlocks {unlockLabel}</p>
              <p className="text-sm text-ink-mid leading-[1.6]">
                Once sealed, {childFirstName} won&rsquo;t be able to see this
                until the reveal date. You can still edit it until then.
              </p>
              {error && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}
            </div>
            <div className="px-8 py-4 border-t border-navy/[0.08] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm font-semibold text-ink-mid hover:text-navy transition-colors px-3 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={busy}
                className="bg-navy text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-navy-mid transition-colors disabled:opacity-60"
              >
                {busy ? "Sealing…" : "Seal Moment →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
