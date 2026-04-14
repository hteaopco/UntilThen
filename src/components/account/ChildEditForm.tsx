"use client";

import { AlertCircle, ArrowLeft, Check, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { RevealDatePicker } from "@/components/ui/RevealDatePicker";

type SaveState = "idle" | "saving" | "saved" | "error";

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.split("T")[0] ?? "";
}

export function ChildEditForm({
  childId,
  firstName: initialFirstName,
  dateOfBirth: initialDob,
  revealDate: initialReveal,
  trusteeName: initialTrusteeName,
  trusteeEmail: initialTrusteeEmail,
}: {
  childId: string;
  firstName: string;
  dateOfBirth: string | null;
  revealDate: string | null;
  trusteeName: string;
  trusteeEmail: string;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [dob, setDob] = useState(toDateInput(initialDob));
  const [revealDate, setRevealDate] = useState(toDateInput(initialReveal));
  const [trusteeName, setTrusteeName] = useState(initialTrusteeName);
  const [trusteeEmail, setTrusteeEmail] = useState(initialTrusteeEmail);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("saving");
    setError(null);
    try {
      const res = await fetch(`/api/account/children/${childId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          dateOfBirth: dob || null,
          revealDate: revealDate || null,
          trusteeName: trusteeName.trim() || null,
          trusteeEmail: trusteeEmail.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't save.");
      }
      setState("saved");
      router.refresh();
      setTimeout(() => setState("idle"), 2200);
    } catch (err) {
      setError((err as Error).message);
      setState("error");
    }
  }

  async function confirmDelete() {
    if (deleteText.trim().toLowerCase() !== firstName.trim().toLowerCase())
      return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/account/children/${childId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't delete vault.");
      }
      router.push("/account/children");
      router.refresh();
    } catch (err) {
      window.alert((err as Error).message);
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-10">
      <Link
        href="/account/children"
        prefetch={false}
        className="inline-flex items-center gap-2 text-sm text-ink-mid hover:text-navy transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
        All children
      </Link>

      <section>
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
          Vault details
        </p>
        <h2 className="text-2xl font-extrabold text-navy tracking-[-0.3px] mb-6">
          Edit {firstName}&rsquo;s vault
        </h2>

        <form onSubmit={submit} className="space-y-5">
          <Field label="Child's name">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="account-input"
              required
            />
          </Field>

          <Field
            label="Date of birth (optional)"
            hint="Used to show age-based milestones."
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
              Reveal date
            </span>
            <RevealDatePicker
              value={revealDate}
              onChange={setRevealDate}
              childFirstName={firstName || null}
              childDateOfBirth={dob || null}
            />
            <p className="mt-1.5 text-xs italic text-ink-light">
              The day the vault opens to {firstName || "your child"}.
            </p>
          </div>

          <div className="pt-6 border-t border-navy/[0.06]">
            <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-2">
              Trustee / Legacy contact
            </p>
            <p className="text-sm text-ink-mid mb-5">
              The person who can request vault transfer if you&rsquo;re unable
              to access your account. We only contact them after 12+ months of
              inactivity.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Name">
                <input
                  type="text"
                  value={trusteeName}
                  onChange={(e) => setTrusteeName(e.target.value)}
                  placeholder="Partner, sibling, close friend"
                  className="account-input"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={trusteeEmail}
                  onChange={(e) => setTrusteeEmail(e.target.value)}
                  placeholder="trustee@email.com"
                  className="account-input"
                />
              </Field>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={state === "saving"}
              className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
            >
              {state === "saving" ? "Saving…" : "Save changes"}
            </button>
            {state === "saved" && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sage">
                <Check size={16} strokeWidth={2} aria-hidden="true" />
                Saved
              </span>
            )}
            {state === "error" && error && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" />
                {error}
              </span>
            )}
          </div>
        </form>
      </section>

      <hr className="border-navy/[0.06]" />

      <section>
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-red-600 mb-3">
          Danger zone
        </p>
        <p className="text-sm text-ink-mid max-w-[520px] mb-5">
          Deleting this vault permanently removes all entries written for{" "}
          {firstName}. This cannot be undone.
        </p>

        {!deleteOpen ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-[1.5px] border-red-600 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors"
          >
            <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
            Delete this vault
          </button>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-5 max-w-[520px]">
            <p className="text-sm text-red-800 font-semibold mb-2">
              Are you absolutely sure?
            </p>
            <p className="text-sm text-red-700/90 mb-4 leading-[1.5]">
              Type <strong>{firstName}</strong>&rsquo;s name below to confirm.
            </p>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder={firstName}
              className="account-input bg-white border-red-300 mb-4"
              autoFocus
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={
                  deleteText.trim().toLowerCase() !==
                    firstName.trim().toLowerCase() || deleting
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                {deleting ? "Deleting…" : "Delete vault"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteText("");
                }}
                disabled={deleting}
                className="text-sm font-semibold text-ink-mid hover:text-navy px-2 py-2 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
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
