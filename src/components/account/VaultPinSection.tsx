"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Mode = "idle" | "change" | "disable";

export function VaultPinSection() {
  const router = useRouter();
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>("idle");

  useEffect(() => {
    fetch("/api/account/pin")
      .then((r) => r.json())
      .then((data: { hasPin?: boolean }) => setHasPin(Boolean(data.hasPin)))
      .catch(() => setHasPin(false));
  }, []);

  function onDone() {
    setMode("idle");
    // Re-fetch so the UI reflects the new state.
    fetch("/api/account/pin")
      .then((r) => r.json())
      .then((data: { hasPin?: boolean }) => setHasPin(Boolean(data.hasPin)))
      .catch(() => undefined);
    router.refresh();
  }

  if (hasPin === null) {
    return (
      <section>
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold mb-3 text-amber">
          Vault PIN
        </p>
        <p className="text-sm text-ink-light">Loading…</p>
      </section>
    );
  }

  return (
    <section>
      <p className="text-[11px] uppercase tracking-[0.14em] font-bold mb-3 text-amber">
        Vault PIN
      </p>
      <div className="rounded-xl border border-navy/10 bg-white p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[14px] font-bold text-navy">
              {hasPin ? "PIN is on" : "PIN is off"}
            </p>
            <p className="text-[13px] text-ink-mid leading-[1.55] mt-1">
              {hasPin
                ? "Your dashboard + vault require a 4-digit PIN once per session. Turn it off anytime below."
                : "Off by default. Add a 4-digit PIN to require it once per session before your dashboard + vault unlock."}
            </p>
          </div>
          <span
            className={`text-[10px] uppercase tracking-[0.08em] font-bold px-2 py-0.5 rounded ${
              hasPin
                ? "bg-sage-tint text-sage"
                : "bg-[#f1f5f9] text-ink-mid"
            }`}
          >
            {hasPin ? "On" : "Off"}
          </span>
        </div>

        {hasPin ? (
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              type="button"
              onClick={() => setMode("change")}
              className="bg-navy text-white rounded-md px-4 py-2 text-[13px] font-bold hover:bg-navy/90"
            >
              Change PIN
            </button>
            <button
              type="button"
              onClick={() => setMode("disable")}
              className="rounded-md px-4 py-2 text-[13px] font-bold text-red-600 hover:bg-red-50"
            >
              Turn off PIN
            </button>
          </div>
        ) : (
          <Link
            href="/account/pin/setup"
            className="inline-block mt-2 bg-amber text-white rounded-md px-4 py-2 text-[13px] font-bold hover:bg-amber-dark"
          >
            Turn on PIN
          </Link>
        )}
      </div>

      {mode === "change" ? (
        <PinActionModal
          title="Change your PIN"
          description="Enter your current PIN, then choose a new 4-digit code."
          requireNew
          onClose={() => setMode("idle")}
          onSuccess={onDone}
          action="change"
        />
      ) : null}
      {mode === "disable" ? (
        <PinActionModal
          title="Turn off PIN?"
          description="Enter your current PIN to confirm. Your dashboard and vault will no longer require a PIN to unlock."
          onClose={() => setMode("idle")}
          onSuccess={onDone}
          action="disable"
        />
      ) : null}
    </section>
  );
}

function PinActionModal({
  title,
  description,
  requireNew = false,
  onClose,
  onSuccess,
  action,
}: {
  title: string;
  description: string;
  requireNew?: boolean;
  onClose: () => void;
  onSuccess: () => void;
  action: "change" | "disable";
}) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[0-9]{4}$/.test(currentPin)) {
      setError("Current PIN must be 4 digits.");
      return;
    }
    if (requireNew) {
      if (!/^[0-9]{4}$/.test(newPin)) {
        setError("New PIN must be 4 digits.");
        return;
      }
      if (newPin !== confirmPin) {
        setError("New PINs don't match.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/account/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "change"
            ? { action: "change", pin: currentPin, newPin }
            : { action: "disable", pin: currentPin },
        ),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      onSuccess();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.25)] w-full max-w-[420px] p-6">
        <h2 className="text-[18px] font-extrabold text-navy tracking-[-0.3px] mb-1">
          {title}
        </h2>
        <p className="text-[13px] text-ink-mid leading-[1.55] mb-5">
          {description}
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <PinInput
            label="Current PIN"
            value={currentPin}
            onChange={setCurrentPin}
            autoFocus
          />
          {requireNew ? (
            <>
              <PinInput
                label="New PIN"
                value={newPin}
                onChange={setNewPin}
              />
              <PinInput
                label="Confirm new PIN"
                value={confirmPin}
                onChange={setConfirmPin}
              />
            </>
          ) : null}
          {error ? (
            <p className="text-[13px] text-red-600 font-semibold">{error}</p>
          ) : null}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-navy text-white rounded-md px-4 py-2.5 text-[13px] font-bold hover:bg-navy/90 disabled:opacity-50"
            >
              {submitting ? "Saving…" : action === "change" ? "Save new PIN" : "Turn off"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-[13px] font-medium text-ink-mid hover:text-navy"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PinInput({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.1em] font-bold text-ink-mid mb-1">
        {label}
      </span>
      <input
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        className="w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-[18px] tracking-[0.3em] font-mono text-navy text-center"
      />
    </label>
  );
}
