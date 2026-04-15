"use client";

import { AlertTriangle, CheckCircle2, Mail, X } from "lucide-react";
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

type Result =
  // Email actually sent to a new invitee.
  | { kind: "sent"; email: string }
  // Invitee already had an untilThen account — added as ACTIVE, no email.
  | { kind: "already-member"; name: string | null; email: string }
  // Contributor row created but the invite email failed to deliver.
  | { kind: "email-failed"; email: string; detail: string | null };

export function InviteModal({
  vaultId,
  onClose,
}: {
  /** Optional: when set, the invite is bound to this specific vault.
      Omitted for the account-level contributors manager which
      already resolves the vault internally. */
  vaultId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]["value"]>("FAMILY");
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  function closeAndRefresh() {
    router.refresh();
    onClose();
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultId,
          email: email.trim(),
          name: name.trim() || null,
          role,
          requiresApproval,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        alreadyOnUntilThen?: boolean;
        existingUserName?: string | null;
        emailSent?: boolean;
        emailError?: string | null;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Couldn't send invite.");
      }

      // Refresh the server data now that a contributor row exists;
      // the summary screen takes over the modal UI either way.
      router.refresh();

      if (data.alreadyOnUntilThen) {
        setResult({
          kind: "already-member",
          name: data.existingUserName ?? null,
          email: email.trim(),
        });
      } else if (data.emailSent === false) {
        setResult({
          kind: "email-failed",
          email: email.trim(),
          detail: data.emailError ?? null,
        });
      } else {
        setResult({ kind: "sent", email: email.trim() });
      }
      setSaving(false);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  if (result) {
    return (
      <ResultScreen result={result} onDone={closeAndRefresh} />
    );
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
            className="text-ink-mid hover:text-navy"
            aria-label="Close"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
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
            className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark disabled:opacity-60"
          >
            <Mail size={16} strokeWidth={1.5} aria-hidden="true" />
            {saving ? "Sending…" : "Send invitation"}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Post-submit summary. Three variants:
 *   - "sent": confirms the invite email went out.
 *   - "already-member": celebrates the auto-add when the invitee
 *     already has an account on untilThen.
 *   - "email-failed": warns the parent the row was created but the
 *     email bounced so they can resend / fix the address.
 */
function ResultScreen({
  result,
  onDone,
}: {
  result: Result;
  onDone: () => void;
}) {
  const variant = result.kind === "email-failed" ? "warning" : "success";
  const Icon = variant === "warning" ? AlertTriangle : CheckCircle2;
  const iconClass =
    variant === "warning" ? "text-amber" : "text-green-600";
  const iconBgClass =
    variant === "warning" ? "bg-amber-tint" : "bg-green-50";

  const title =
    result.kind === "already-member"
      ? "Added to your vault"
      : result.kind === "email-failed"
        ? "Contributor added, but email failed"
        : "Invite sent";

  const body =
    result.kind === "already-member"
      ? `${result.name ?? result.email} is already on untilThen and has been added as a contributor. They can jump straight in next time they sign in.`
      : result.kind === "email-failed"
        ? `Contributor added but the invite email to ${result.email} failed to send. Check the address and try resending from the contributors list.`
        : `Invite sent to ${result.email}. They'll get an email with a link to accept.`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onDone}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[460px]"
      >
        <div className="px-7 pt-7 pb-5 text-center">
          <div
            className={`mx-auto w-12 h-12 rounded-full ${iconBgClass} flex items-center justify-center mb-4`}
          >
            <Icon size={24} strokeWidth={1.75} className={iconClass} />
          </div>
          <h2 className="text-xl font-extrabold text-navy tracking-[-0.3px] mb-2">
            {title}
          </h2>
          <p className="text-[15px] text-ink-mid leading-[1.55]">{body}</p>
          {result.kind === "email-failed" && result.detail && (
            <p className="mt-3 text-xs text-ink-light italic">
              {result.detail}
            </p>
          )}
        </div>
        <div className="px-7 py-4 border-t border-navy/[0.08] flex items-center justify-end">
          <button
            type="button"
            onClick={onDone}
            className="inline-flex items-center gap-2 bg-navy text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-navy-mid"
          >
            Done
          </button>
        </div>
      </div>
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
        className="w-full px-3 py-2.5 text-sm text-navy bg-white border border-navy/15 rounded-lg outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
      />
    </div>
  );
}
