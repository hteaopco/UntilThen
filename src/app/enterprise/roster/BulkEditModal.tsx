"use client";

import { useState, type FormEvent } from "react";

/**
 * Bulk-edit modal — sets department + subTeam across every
 * selected employee in one shot. Only these two fields are bulk-
 * editable on purpose; bulk-stamping a name across many people
 * is almost always wrong.
 *
 * Each field has a three-state toggle: leave alone / set value /
 * clear value. "Leave alone" means the field isn't included in
 * the PATCH body at all so the existing values stay untouched.
 */
export function BulkEditModal({
  orgId,
  ids,
  onClose,
  onSaved,
}: {
  orgId: string;
  ids: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [deptMode, setDeptMode] = useState<"leave" | "set" | "clear">("leave");
  const [department, setDepartment] = useState("");
  const [subTeamMode, setSubTeamMode] = useState<"leave" | "set" | "clear">(
    "leave",
  );
  const [subTeam, setSubTeam] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    const updates: Record<string, string | null> = {};
    if (deptMode === "set") {
      const v = department.trim();
      if (!v) {
        setError("Pick a department or switch to Clear / Leave alone.");
        return;
      }
      updates.department = v;
    } else if (deptMode === "clear") {
      updates.department = null;
    }
    if (subTeamMode === "set") {
      const v = subTeam.trim();
      if (!v) {
        setError("Pick a sub team or switch to Clear / Leave alone.");
        return;
      }
      updates.subTeam = v;
    } else if (subTeamMode === "clear") {
      updates.subTeam = null;
    }

    if (Object.keys(updates).length === 0) {
      setError("Nothing to change. Pick a field to set or clear.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${orgId}/employees/bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, updates }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't apply.");
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
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[440px] px-6 py-6"
      >
        <h2 className="text-[18px] font-extrabold text-navy tracking-[-0.2px]">
          Edit {ids.length} {ids.length === 1 ? "employee" : "employees"}
        </h2>
        <p className="mt-1 text-[12px] text-ink-mid">
          Personal fields (name, email, phone) stay per-row. Bulk
          edits apply to department and sub team.
        </p>

        <FieldGroup label="Department">
          <ModeToggle value={deptMode} onChange={setDeptMode} />
          {deptMode === "set" && (
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Engineering"
              className="mt-2 w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
            />
          )}
        </FieldGroup>

        <FieldGroup label="Sub team">
          <ModeToggle value={subTeamMode} onChange={setSubTeamMode} />
          {subTeamMode === "set" && (
            <input
              type="text"
              value={subTeam}
              onChange={(e) => setSubTeam(e.target.value)}
              placeholder="e.g. Platform"
              className="mt-2 w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
            />
          )}
        </FieldGroup>

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
            {busy ? "Applying…" : "Apply to all"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <p className="text-[11px] uppercase tracking-[0.1em] font-bold text-ink-mid mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

function ModeToggle({
  value,
  onChange,
}: {
  value: "leave" | "set" | "clear";
  onChange: (next: "leave" | "set" | "clear") => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-lg bg-navy/[0.04] p-0.5">
      {(["leave", "set", "clear"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`px-3 py-1 rounded text-[12px] font-bold transition-colors ${
            value === m
              ? "bg-white text-navy shadow-[0_1px_2px_rgba(15,31,61,0.08)]"
              : "text-ink-mid hover:text-navy"
          }`}
        >
          {m === "leave" ? "Leave alone" : m === "set" ? "Set value" : "Clear"}
        </button>
      ))}
    </div>
  );
}
