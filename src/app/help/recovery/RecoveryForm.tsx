"use client";

import { useState } from "react";

interface FormState {
  originalEmail: string;
  newEmail: string;
  fullName: string;
  childFirstName: string;
  approximateSignupDate: string;
  details: string;
}

const EMPTY: FormState = {
  originalEmail: "",
  newEmail: "",
  fullName: "",
  childFirstName: "",
  approximateSignupDate: "",
  details: "",
};

export function RecoveryForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/help/recovery-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error ?? "Something went wrong. Try again in a minute.");
        return;
      }
      setSuccess(true);
      setForm(EMPTY);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-lg bg-sage-tint border border-sage/20 px-4 py-5 text-[14px] text-navy">
        <p className="font-bold mb-1">Request received.</p>
        <p className="text-ink-mid leading-[1.55]">
          We&rsquo;ll review what you sent and reach you at the new email within
          1&ndash;2 business days. A confirmation is also on its way to that
          address.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        label="Original email on the account"
        value={form.originalEmail}
        type="email"
        autoComplete="off"
        required
        placeholder="the email you signed up with"
        onChange={(v) => update("originalEmail", v)}
      />
      <Field
        label="New email where we can reach you"
        value={form.newEmail}
        type="email"
        autoComplete="email"
        required
        placeholder="an inbox you can access"
        onChange={(v) => update("newEmail", v)}
      />
      <Field
        label="Full name on the account"
        value={form.fullName}
        required
        placeholder="First and last name"
        onChange={(v) => update("fullName", v)}
      />
      <Field
        label="Child's first name"
        value={form.childFirstName}
        required
        placeholder="Used to verify account ownership"
        onChange={(v) => update("childFirstName", v)}
      />
      <Field
        label="Approximately when you signed up"
        value={form.approximateSignupDate}
        placeholder="e.g. Spring 2026"
        onChange={(v) => update("approximateSignupDate", v)}
      />
      <label className="block">
        <span className="block text-[11px] uppercase tracking-[0.1em] font-bold text-ink-mid mb-1">
          Anything else that proves this is you
        </span>
        <textarea
          value={form.details}
          onChange={(e) => update("details", e.target.value)}
          rows={4}
          placeholder="Names of anyone else on your capsules, billing card last-4, approximate reveal date, etc."
          className="w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-[13px] text-navy placeholder:text-ink-light leading-[1.55]"
        />
      </label>

      {error ? (
        <p className="text-[13px] text-red-600 font-semibold">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-navy text-white rounded-md px-4 py-2.5 text-[14px] font-bold hover:bg-navy/90 disabled:opacity-50"
      >
        {submitting ? "Sending…" : "Send recovery request"}
      </button>
      <p className="text-[12px] text-ink-light leading-[1.5]">
        We&rsquo;ll only use this to verify identity and update your account
        email. No other use.
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.1em] font-bold text-ink-mid mb-1">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-[13px] text-navy placeholder:text-ink-light"
      />
    </label>
  );
}
