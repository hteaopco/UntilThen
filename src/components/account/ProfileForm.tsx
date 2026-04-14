"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { AlertCircle, Check, KeyRound, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type SaveState = "idle" | "saving" | "saved" | "error";

export function ProfileForm({
  firstName: initialFirstName,
  lastName: initialLastName,
  displayName: initialDisplayName,
}: {
  firstName: string;
  lastName: string;
  displayName: string;
}) {
  const router = useRouter();
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [displayName, setDisplayName] = useState(initialDisplayName);
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
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName: displayName.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't save your profile.");
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
    if (deleteText.trim() !== "DELETE") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't delete your account.");
      }
      await signOut({ redirectUrl: "/" });
    } catch (err) {
      window.alert((err as Error).message);
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <SectionLabel>Profile</SectionLabel>
        <h2 className="text-2xl font-extrabold text-navy tracking-[-0.3px] mb-6">
          Your details
        </h2>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First name">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                className="account-input"
                required
              />
            </Field>
            <Field label="Last name">
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                className="account-input"
                required
              />
            </Field>
          </div>

          <Field label="Email address">
            <input
              type="email"
              value={user?.primaryEmailAddress?.emailAddress ?? ""}
              readOnly
              className="account-input bg-warm-surface cursor-not-allowed text-ink-mid"
            />
            <p className="mt-1.5 text-xs italic text-ink-light">
              Email is managed through your sign-in provider.{" "}
              <button
                type="button"
                onClick={() => openUserProfile()}
                className="text-amber underline-offset-4 underline hover:text-amber-dark"
              >
                Change email
              </button>
            </p>
          </Field>

          <Field
            label="Display name"
            hint="How you appear to contributors and on entries — e.g. “Mum” or “Dad”."
          >
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Mum"
              className="account-input"
              maxLength={40}
            />
          </Field>

          <Field label="Password">
            <button
              type="button"
              onClick={() => openUserProfile()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-navy/15 text-sm font-semibold text-navy hover:border-navy transition-colors"
            >
              <KeyRound size={16} strokeWidth={1.5} aria-hidden="true" />
              Change password
            </button>
          </Field>

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
        <SectionLabel danger>Danger zone</SectionLabel>
        <p className="text-sm text-ink-mid max-w-[520px] mb-5">
          Deleting your account removes your profile and schedules all of your
          entries and memories for permanent deletion after 30 days. This
          cannot be undone.
        </p>

        {!deleteOpen ? (
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-[1.5px] border-red-600 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors"
          >
            <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
            Delete my account
          </button>
        ) : (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-5 max-w-[520px]">
            <p className="text-sm text-red-800 font-semibold mb-2">
              Are you absolutely sure?
            </p>
            <p className="text-sm text-red-700/90 mb-4 leading-[1.5]">
              All your entries and memories will be permanently deleted after
              30 days. Type <strong>DELETE</strong> below to confirm.
            </p>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              placeholder="DELETE"
              className="account-input bg-white border-red-300 mb-4"
              autoFocus
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteText.trim() !== "DELETE" || deleting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                {deleting ? "Deleting…" : "Delete my account"}
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

function SectionLabel({
  children,
  danger,
}: {
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <p
      className={`text-[11px] uppercase tracking-[0.14em] font-bold mb-3 ${
        danger ? "text-red-600" : "text-amber"
      }`}
    >
      {children}
    </p>
  );
}
