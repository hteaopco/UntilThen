"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import {
  AlertCircle,
  Check,
  KeyRound,
  Lock,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AvatarUploader } from "@/components/account/AvatarUploader";

type SaveState = "idle" | "saving" | "saved" | "error";

export function ProfileForm({
  userId,
  firstName: initialFirstName,
  lastName: initialLastName,
  displayName: initialDisplayName,
  avatarViewUrl,
}: {
  userId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarViewUrl: string | null;
}) {
  const router = useRouter();
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();

  const [avatarOpen, setAvatarOpen] = useState(false);

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [pinOpen, setPinOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [pinState, setPinState] = useState<SaveState>("idle");
  const [pinError, setPinError] = useState<string | null>(null);
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

  async function changePin() {
    if (!/^\d{4}$/.test(newPin)) { setPinError("PIN must be 4 digits."); return; }
    setPinState("saving");
    setPinError(null);
    try {
      const hasExisting = currentPin.length === 4;
      const res = await fetch("/api/account/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          hasExisting
            ? { action: "change", currentPin, newPin }
            : { action: "setup", pin: newPin }
        ),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? "Couldn't update PIN.");
      setPinState("saved");
      setCurrentPin("");
      setNewPin("");
      setTimeout(() => { setPinState("idle"); setPinOpen(false); }, 2000);
    } catch (err) {
      setPinError((err as Error).message);
      setPinState("error");
    }
  }

  async function resetPin() {
    setPinState("saving");
    setPinError(null);
    try {
      const res = await fetch("/api/account/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (!res.ok) throw new Error("Couldn't reset PIN.");
      setPinState("saved");
      setCurrentPin("");
      setNewPin("");
      setTimeout(() => { setPinState("idle"); setPinOpen(false); }, 2000);
    } catch (err) {
      setPinError((err as Error).message);
      setPinState("error");
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
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <SectionLabel>Profile</SectionLabel>
            <h2 className="text-2xl font-extrabold text-navy tracking-[-0.3px]">
              Your details
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setAvatarOpen(true)}
            aria-label={avatarViewUrl ? "Change profile photo" : "Add profile photo"}
            className="relative shrink-0 group"
          >
            <span className="flex w-20 h-20 rounded-full overflow-hidden border border-amber/25 bg-amber-tint items-center justify-center text-amber font-extrabold text-[22px] tracking-[-0.3px]">
              {avatarViewUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarViewUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initials(initialFirstName, initialLastName)}</span>
              )}
            </span>
            <span
              aria-hidden="true"
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber text-white flex items-center justify-center shadow-[0_4px_12px_rgba(15,31,61,0.15)] group-hover:bg-amber-dark transition-colors"
            >
              <Pencil size={13} strokeWidth={2.25} />
            </span>
          </button>
        </div>

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
            hint={'How you appear on entries — e.g. \u201CMom\u201D or \u201CDad\u201D.'}
          >
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Mom"
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

          <Field label="Vault PIN">
            {!pinOpen ? (
              <button
                type="button"
                onClick={() => setPinOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-navy/15 text-sm font-semibold text-navy hover:border-navy transition-colors"
              >
                <Lock size={16} strokeWidth={1.5} aria-hidden="true" />
                Change or reset PIN
              </button>
            ) : (
              <div className="space-y-3 max-w-[280px]">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Current PIN (leave blank if first time)"
                  className="account-input"
                />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="New 4-digit PIN"
                  className="account-input"
                />
                {pinError && <p className="text-xs text-red-600">{pinError}</p>}
                {pinState === "saved" && (
                  <p className="inline-flex items-center gap-1.5 text-xs font-medium text-sage">
                    <Check size={14} strokeWidth={2} /> PIN updated
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={changePin} disabled={pinState === "saving"}
                    className="bg-amber text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-amber-dark transition-colors disabled:opacity-50">
                    {pinState === "saving" ? "Saving\u2026" : "Update PIN"}
                  </button>
                  <button type="button" onClick={resetPin} disabled={pinState === "saving"}
                    className="text-xs font-semibold text-ink-mid hover:text-red-600 transition-colors disabled:opacity-50">
                    Remove PIN
                  </button>
                  <button type="button" onClick={() => { setPinOpen(false); setPinError(null); }}
                    className="text-xs font-semibold text-ink-light hover:text-navy transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
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

      {avatarOpen && (
        <AvatarUploader
          userId={userId}
          currentAvatarUrl={avatarViewUrl}
          onClose={() => setAvatarOpen(false)}
        />
      )}
    </div>
  );
}

function initials(firstName: string, lastName: string): string {
  const f = (firstName ?? "").trim().charAt(0).toUpperCase();
  const l = (lastName ?? "").trim().charAt(0).toUpperCase();
  return `${f}${l}` || "?";
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
