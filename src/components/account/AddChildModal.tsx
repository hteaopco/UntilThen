"use client";

import { AlertCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { RevealDatePicker } from "@/components/ui/RevealDatePicker";

/**
 * Add-another-child modal. Mirrors the onboarding fields (name,
 * optional DOB, optional reveal date) so multi-child parents can
 * create a fresh vault without leaving the account section.
 *
 * Billing note: the brief charges +$1.99/month per additional
 * vault, gated through Square. Square isn't wired up yet, so this
 * flow runs free for now — see POST /api/account/children for the
 * matching TODO.
 */
export function AddChildModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [revealDate, setRevealDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = firstName.trim().length > 0 && !saving;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/account/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: dob || null,
          revealDate: revealDate || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't add the child.");
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[520px] max-h-[92vh] overflow-y-auto"
      >
        <div className="px-7 py-5 border-b border-navy/[0.08] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-navy tracking-[-0.3px]">
              Add another child
            </h2>
            <p className="mt-1 text-sm text-ink-mid">
              Create a new time capsule and start writing in minutes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-ink-mid hover:text-navy"
            aria-label="Close"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="px-7 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoFocus
                required
                className="account-input"
              />
            </Field>
            <Field label="Last name">
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="account-input"
              />
            </Field>
          </div>

          <Field
            label="Date of birth (optional)"
            hint="If we know their DOB the reveal date defaults to their 18th birthday — you can override below."
          >
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="account-input"
            />
          </Field>

          <div>
            <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
              Reveal date (optional)
            </span>
            <RevealDatePicker
              value={revealDate}
              onChange={setRevealDate}
              childFirstName={firstName || null}
              childDateOfBirth={dob || null}
            />
            <p className="mt-1.5 text-xs italic text-ink-light">
              When the vault opens for this child. Change it any time later
              from the vault&rsquo;s edit page.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="inline-flex items-start gap-2 text-sm text-red-600"
            >
              <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" />
              {error}
            </div>
          )}
        </div>

        <div className="px-7 py-4 border-t border-navy/[0.08] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-sm font-semibold text-ink-mid hover:text-navy px-3 py-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create vault"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
        {label}
      </span>
      {children}
      {hint && <p className="mt-1.5 text-xs italic text-ink-light">{hint}</p>}
    </label>
  );
}
