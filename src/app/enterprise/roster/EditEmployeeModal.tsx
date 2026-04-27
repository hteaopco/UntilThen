"use client";

import { useState, type FormEvent } from "react";

export type EmployeeFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  department: string | null;
  subTeam: string | null;
};

/**
 * Modal that edits all six personal fields on a single employee
 * row. Validation is light here — the API does the heavy lift —
 * but we surface 409 (duplicate email) errors cleanly.
 */
export function EditEmployeeModal({
  orgId,
  employeeId,
  initial,
  onClose,
  onSaved,
}: {
  orgId: string;
  employeeId: string;
  initial: EmployeeFields;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [department, setDepartment] = useState(initial.department ?? "");
  const [subTeam, setSubTeam] = useState(initial.subTeam ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${orgId}/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          phone: phone.trim() || null,
          department: department.trim() || null,
          subTeam: subTeam.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't save.");
      }
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[480px] px-6 py-6"
      >
        <h2 className="text-[18px] font-extrabold text-navy tracking-[-0.2px]">
          Edit employee
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="First name">
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
            />
          </Field>
          <Field label="Last name">
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
            />
          </Field>
          <Field label="Email" colSpan={2}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
            />
          </Field>
          <Field label="Phone" colSpan={2}>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
            />
          </Field>
          <Field label="Department">
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
            />
          </Field>
          <Field label="Sub team">
            <input
              type="text"
              value={subTeam}
              onChange={(e) => setSubTeam(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
            />
          </Field>
        </div>
        {error && (
          <p className="mt-3 text-[13px] text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-navy/15 text-ink-mid hover:text-navy hover:border-navy/30 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-lg text-[13px] font-bold bg-amber text-white hover:bg-amber-dark transition-colors disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  colSpan,
  children,
}: {
  label: string;
  colSpan?: number;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${colSpan === 2 ? "col-span-2" : ""}`}>
      <span className="block text-[11px] uppercase tracking-[0.1em] font-bold text-ink-mid mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
