"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const ROLES: Array<{
  value: "FAMILY" | "FRIEND" | "TEACHER" | "OTHER";
  label: string;
  hint: string;
}> = [
  { value: "FAMILY", label: "Family", hint: "grandparents, godparents" },
  { value: "FRIEND", label: "Friend", hint: "" },
  { value: "TEACHER", label: "Teacher / Educator", hint: "" },
  { value: "OTHER", label: "Other", hint: "" },
];

export function InviteModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("FAMILY");
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || null,
          role,
          requiresApproval,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't send invite.");
      }
      onClose();
      router.refresh();
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
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[500px] max-h-[92vh] overflow-y-auto"
      >
        <div className="px-7 py-5 border-b border-navy/[0.08] flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-navy tracking-[-0.3px]">
            Invite a contributor
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none text-ink-mid hover:text-navy"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-7 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Name"
              optional
              value={name}
              onChange={setName}
              autoFocus
            />
            <Field
              label="Email"
              required
              type="email"
              value={email}
              onChange={setEmail}
            />
          </div>

          <div>
            <Label>Role</Label>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="accent-navy"
                  />
                  <span className="text-navy font-medium">{r.label}</span>
                  {r.hint && (
                    <span className="text-ink-light italic text-xs">
                      ({r.hint})
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>Review before publishing?</Label>
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="review"
                  checked={!requiresApproval}
                  onChange={() => setRequiresApproval(false)}
                  className="mt-1 accent-navy"
                />
                <span>
                  <span className="font-medium text-navy">Auto-approve</span>
                  <span className="ml-1 text-ink-light">
                    — entries go straight into the vault
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="review"
                  checked={requiresApproval}
                  onChange={() => setRequiresApproval(true)}
                  className="mt-1 accent-navy"
                />
                <span>
                  <span className="font-medium text-navy">Review first</span>
                  <span className="ml-1 text-ink-light">
                    — I&rsquo;ll approve each entry before it joins the vault
                  </span>
                </span>
              </label>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="px-7 py-4 border-t border-navy/[0.08] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-ink-mid hover:text-navy px-3 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !email.trim()}
            className="bg-navy text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-navy-mid disabled:opacity-60"
          >
            {saving ? "Sending…" : "Send invitation →"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-bold tracking-[0.1em] uppercase text-ink-mid mb-2">
      {children}
    </label>
  );
}

function Field({
  label,
  required,
  optional,
  type = "text",
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <Label>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
        {optional && (
          <span className="ml-1 text-ink-light font-medium normal-case tracking-normal text-[10px] italic">
            (optional)
          </span>
        )}
      </Label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="w-full px-3 py-2.5 text-sm text-navy bg-white border border-navy/15 rounded-lg outline-none focus:border-sky focus:ring-2 focus:ring-sky/20"
      />
    </div>
  );
}
