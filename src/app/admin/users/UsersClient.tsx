"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

export type ChildRow = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null; // ISO
  vault: { id: string; revealDate: string | null } | null;
};

export type UserRow = {
  id: string;
  clerkId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  createdAt: string; // ISO
  children: ChildRow[];
};

type SortKey = "name" | "joined";
type SortDir = "asc" | "desc";

function formatDateCST(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isoToDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.split("T")[0] ?? "";
}

export function UsersClient({
  initialUsers,
}: {
  initialUsers: UserRow[];
}) {
  const router = useRouter();
  const [users] = useState<UserRow[]>(initialUsers);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? users.filter((u) => {
          const parent = `${u.firstName} ${u.lastName}`.toLowerCase();
          const email = (u.email ?? "").toLowerCase();
          const phone = (u.phone ?? "").toLowerCase();
          const children = u.children
            .map((c) => `${c.firstName} ${c.lastName}`.toLowerCase())
            .join(" ");
          return (
            parent.includes(q) ||
            email.includes(q) ||
            phone.includes(q) ||
            children.includes(q)
          );
        })
      : users;

    const sorted = [...filtered].sort((a, b) => {
      let diff = 0;
      if (sortKey === "name") {
        diff = `${a.firstName} ${a.lastName}`.localeCompare(
          `${b.firstName} ${b.lastName}`,
        );
      } else {
        diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDir === "asc" ? diff : -diff;
    });

    return sorted;
  }, [users, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  async function handleDelete(u: UserRow) {
    const name = `${u.firstName} ${u.lastName}`;
    if (
      !window.confirm(
        `Delete ${name} and their vault(s)?\n\nThis removes their Clerk account, DB record, children, vaults, and entries. Can't be undone.`,
      )
    ) {
      return;
    }
    setDeletingId(u.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Delete failed");
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, phone, or child…"
            className="w-full px-4 py-2.5 pl-10 text-sm border border-navy/15 rounded-lg text-navy bg-white placeholder-ink-light focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
          />
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 20 20"
            fill="none"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-light"
          >
            <circle
              cx="8.5"
              cy="8.5"
              r="5.5"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <path
              d="M13 13L17 17"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="text-xs text-ink-mid">
          {rows.length} {rows.length === 1 ? "user" : "users"}
          {query && ` matching "${query}"`}
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="rounded-lg border border-navy/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-left text-[11px] uppercase tracking-[0.08em] text-ink-mid bg-[#fafbfc]">
                <SortTh
                  label="Name"
                  active={sortKey === "name"}
                  dir={sortDir}
                  onClick={() => toggleSort("name")}
                />
                <th className="py-3 px-4 font-bold">Email</th>
                <th className="py-3 px-4 font-bold">Child(ren)</th>
                <th className="py-3 px-4 font-bold">Reveal</th>
                <SortTh
                  label="Joined"
                  active={sortKey === "joined"}
                  dir={sortDir}
                  onClick={() => toggleSort("joined")}
                />
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm text-ink-light"
                  >
                    {users.length === 0
                      ? "No users yet."
                      : "No users match your search."}
                  </td>
                </tr>
              ) : (
                rows.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-navy/[0.06] last:border-b-0"
                  >
                    <td className="py-3 px-4 text-navy whitespace-nowrap font-medium">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="py-3 px-4 text-ink-mid">
                      {u.email ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-ink-mid">
                      {u.children.length === 0
                        ? "—"
                        : u.children
                            .map((c) => `${c.firstName} ${c.lastName}`)
                            .join(", ")}
                    </td>
                    <td className="py-3 px-4 text-ink-mid whitespace-nowrap">
                      {u.children[0]?.vault?.revealDate
                        ? formatDateCST(u.children[0].vault.revealDate)
                        : "Not set"}
                    </td>
                    <td className="py-3 px-4 text-ink-mid whitespace-nowrap">
                      {formatDateCST(u.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditing(u)}
                        className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-mid hover:text-navy transition-colors mr-4"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
                        disabled={deletingId === u.id}
                        className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-light hover:text-red-600 transition-colors disabled:opacity-50"
                      >
                        {deletingId === u.id ? "…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function SortTh({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th className="py-3 px-4 font-bold">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] font-bold text-ink-mid hover:text-navy transition-colors"
      >
        {label}
        <span aria-hidden="true" className="text-[9px]">
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const firstChild = user.children[0] ?? null;
  const [childFirstName, setChildFirstName] = useState(
    firstChild?.firstName ?? "",
  );
  const [childLastName, setChildLastName] = useState(
    firstChild?.lastName ?? "",
  );
  const [childDob, setChildDob] = useState(
    isoToDateInputValue(firstChild?.dateOfBirth ?? null),
  );
  const [revealDate, setRevealDate] = useState(
    isoToDateInputValue(firstChild?.vault?.revealDate ?? null),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          child: firstChild
            ? {
                id: firstChild.id,
                firstName: childFirstName.trim(),
                lastName: childLastName.trim(),
                dateOfBirth: childDob || null,
                revealDate: revealDate || null,
              }
            : null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Save failed");
      }
      onSaved();
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
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[480px] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-navy/[0.08]">
          <h2 className="text-lg font-bold text-navy">Edit user</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-mid hover:text-navy transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.12em] font-bold text-amber mb-3">
              Parent
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <LabeledInput
                label="First name"
                value={firstName}
                onChange={setFirstName}
                autoComplete="given-name"
              />
              <LabeledInput
                label="Last name"
                value={lastName}
                onChange={setLastName}
                autoComplete="family-name"
              />
            </div>
            {user.email && (
              <p className="mt-3 text-xs text-ink-light">
                Email{" "}
                <span className="font-medium text-ink-mid">{user.email}</span>{" "}
                (managed in Clerk)
              </p>
            )}
          </div>

          {firstChild ? (
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.12em] font-bold text-amber mb-3">
                Child
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <LabeledInput
                  label="First name"
                  value={childFirstName}
                  onChange={setChildFirstName}
                />
                <LabeledInput
                  label="Last name"
                  value={childLastName}
                  onChange={setChildLastName}
                />
              </div>
              <LabeledInput
                label="Birthdate"
                type="date"
                value={childDob}
                onChange={setChildDob}
              />
              <div className="mt-3">
                <LabeledInput
                  label="Vault reveal date"
                  type="date"
                  value={revealDate}
                  onChange={setRevealDate}
                  hint="Leave blank if not set yet."
                />
              </div>
              {user.children.length > 1 && (
                <p className="mt-3 text-xs italic text-ink-light">
                  This user has {user.children.length} children. Editing the
                  first; others can be edited later.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-light italic">
              No children on this account yet.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-navy/[0.08] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-ink-mid hover:text-navy transition-colors px-3 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.08em] font-bold text-ink-mid mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full px-3 py-2.5 text-sm text-navy bg-white border border-navy/15 rounded-lg outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
      />
      {hint && <p className="mt-1 text-xs italic text-ink-light">{hint}</p>}
    </div>
  );
}
