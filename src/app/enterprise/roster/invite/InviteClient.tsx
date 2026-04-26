"use client";

import { ArrowLeft, Download, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Row = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: "ADMIN" | "MEMBER";
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CSV_TEMPLATE = "first_name,last_name,email,phone\nJane,Doe,jane@example.com,5551234567\n";

export function InviteClient({ orgId }: { orgId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<{
    addedExistingUsers: number;
    createdInvites: number;
    alreadyInOrg: number;
    sentEmails: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function blankRow(): Row {
    return { email: "", firstName: "", lastName: "", phone: "", role: "MEMBER" };
  }

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((r) => [...r, blankRow()]);
  }

  function removeRow(idx: number) {
    setRows((r) => (r.length === 1 ? [blankRow()] : r.filter((_, i) => i !== idx)));
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "untilthen-invites.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCsvFile(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        setError("CSV is empty.");
        return;
      }
      const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
      const idx = {
        first: header.indexOf("first_name"),
        last: header.indexOf("last_name"),
        email: header.indexOf("email"),
        phone: header.indexOf("phone"),
      };
      if (idx.email === -1) {
        setError("CSV must include an email column.");
        return;
      }
      const parsed: Row[] = lines.slice(1).map((line) => {
        const cells = line.split(",").map((c) => c.trim());
        return {
          firstName: idx.first >= 0 ? cells[idx.first] ?? "" : "",
          lastName: idx.last >= 0 ? cells[idx.last] ?? "" : "",
          email: cells[idx.email] ?? "",
          phone: idx.phone >= 0 ? cells[idx.phone] ?? "" : "",
          role: "MEMBER",
        };
      });
      setRows(parsed.length > 0 ? parsed : [blankRow()]);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submit() {
    if (submitting) return;
    setError(null);
    setSummary(null);

    const cleaned = rows
      .map((r) => ({
        ...r,
        email: r.email.trim().toLowerCase(),
        firstName: r.firstName.trim(),
        lastName: r.lastName.trim(),
        phone: r.phone.trim(),
      }))
      .filter((r) => EMAIL_RE.test(r.email));

    if (cleaned.length === 0) {
      setError("Add at least one row with a valid email.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invites: cleaned }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't send invites.");
      }
      const data = (await res.json()) as {
        addedExistingUsers: number;
        createdInvites: number;
        alreadyInOrg: number;
        sentEmails: number;
        errors: string[];
      };
      setSummary(data);
      setRows([blankRow()]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/enterprise/roster"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-mid hover:text-navy transition-colors mb-2"
        >
          <ArrowLeft size={12} strokeWidth={2} aria-hidden="true" />
          Back to roster
        </Link>
        <h2 className="text-[20px] font-extrabold text-navy">Invite</h2>
        <p className="text-[13px] text-ink-mid mt-0.5">
          Add one person at a time, paste multiple rows, or upload a CSV.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-navy/15 text-[13px] font-semibold text-navy hover:border-navy/40 transition-colors"
        >
          <Upload size={14} strokeWidth={2} aria-hidden="true" />
          Import CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleCsvFile(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-navy/15 text-[13px] font-semibold text-navy hover:border-navy/40 transition-colors"
        >
          <Download size={14} strokeWidth={2} aria-hidden="true" />
          Download template
        </button>
      </div>

      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-navy/[0.08] bg-white p-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <input
                type="text"
                value={row.firstName}
                onChange={(e) => updateRow(idx, { firstName: e.target.value })}
                placeholder="First"
                className="sm:col-span-2 px-3 py-2 rounded-lg border border-navy/10 text-sm focus:border-amber focus:outline-none"
              />
              <input
                type="text"
                value={row.lastName}
                onChange={(e) => updateRow(idx, { lastName: e.target.value })}
                placeholder="Last"
                className="sm:col-span-2 px-3 py-2 rounded-lg border border-navy/10 text-sm focus:border-amber focus:outline-none"
              />
              <input
                type="email"
                value={row.email}
                onChange={(e) => updateRow(idx, { email: e.target.value })}
                placeholder="email@company.com"
                className="sm:col-span-3 px-3 py-2 rounded-lg border border-navy/10 text-sm focus:border-amber focus:outline-none"
              />
              <input
                type="tel"
                value={row.phone}
                onChange={(e) => updateRow(idx, { phone: e.target.value })}
                placeholder="Phone (optional)"
                className="sm:col-span-2 px-3 py-2 rounded-lg border border-navy/10 text-sm focus:border-amber focus:outline-none"
              />
              <label className="sm:col-span-2 inline-flex items-center gap-2 text-[13px] text-ink-mid px-2">
                <input
                  type="checkbox"
                  checked={row.role === "ADMIN"}
                  onChange={(e) =>
                    updateRow(idx, { role: e.target.checked ? "ADMIN" : "MEMBER" })
                  }
                />
                Admin
              </label>
              <button
                type="button"
                onClick={() => removeRow(idx)}
                aria-label="Remove row"
                className="sm:col-span-1 inline-flex items-center justify-center text-ink-light hover:text-red-600 transition-colors"
              >
                <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addRow}
          className="text-[13px] font-semibold text-amber hover:text-amber-dark transition-colors"
        >
          + Add another row
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="bg-navy text-white px-5 py-2.5 rounded-lg text-[13px] font-bold hover:bg-navy/90 transition-colors disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send invites"}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {summary && (
        <div className="rounded-xl border border-amber/30 bg-amber-tint/40 p-4">
          <p className="text-sm font-semibold text-navy mb-2">Done.</p>
          <ul className="text-[13px] text-ink-mid space-y-1">
            {summary.addedExistingUsers > 0 && (
              <li>
                {summary.addedExistingUsers} existing user
                {summary.addedExistingUsers === 1 ? "" : "s"} auto-joined.
              </li>
            )}
            {summary.createdInvites > 0 && (
              <li>
                {summary.createdInvites} invite
                {summary.createdInvites === 1 ? "" : "s"} sent to new emails.
              </li>
            )}
            {summary.alreadyInOrg > 0 && (
              <li>
                {summary.alreadyInOrg}{" "}
                {summary.alreadyInOrg === 1 ? "person was" : "people were"}{" "}
                already in the org &mdash; skipped.
              </li>
            )}
            {summary.sentEmails > 0 && (
              <li>{summary.sentEmails} notification emails delivered.</li>
            )}
            {summary.errors.length > 0 && (
              <li className="text-red-600">
                Errors on: {summary.errors.join(", ")}
              </li>
            )}
          </ul>
          <button
            type="button"
            onClick={() => router.push("/enterprise/roster")}
            className="mt-3 text-[13px] font-semibold text-amber hover:text-amber-dark transition-colors"
          >
            Back to roster →
          </button>
        </div>
      )}
    </div>
  );
}
