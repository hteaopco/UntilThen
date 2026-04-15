"use client";

import {
  BookOpen,
  Check,
  ChevronDown,
  Eye,
  Heart,
  Mail,
  User,
  UserMinus,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { InviteModal } from "@/components/dashboard/InviteModal";
import { formatShort } from "@/lib/dateFormatters";

type Role = "FAMILY" | "FRIEND" | "TEACHER" | "OTHER";
type Status = "PENDING" | "ACTIVE" | "REVOKED";

export type ManagerVaultOption = {
  vaultId: string;
  childFirstName: string;
};

export type ManagerContributor = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  status: Status;
  requiresApproval: boolean;
  createdAt: string;
  acceptedAt: string | null;
  entryCount: number;
  inviteToken: string;
};

const ROLE_LABEL: Record<Role, string> = {
  FAMILY: "Family",
  FRIEND: "Friend",
  TEACHER: "Teacher",
  OTHER: "Other",
};

const ROLE_ICON: Record<Role, LucideIcon> = {
  FAMILY: Heart,
  FRIEND: Users,
  TEACHER: BookOpen,
  OTHER: User,
};

export function ContributorsManager({
  vaults,
  activeVaultId,
  contributors,
}: {
  vaults: ManagerVaultOption[];
  activeVaultId: string | null;
  contributors: ManagerContributor[];
}) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<ManagerContributor | null>(null);

  const active = contributors.filter((c) => c.status === "ACTIVE");
  const pending = contributors.filter((c) => c.status === "PENDING");
  const revoked = contributors.filter((c) => c.status === "REVOKED");

  async function revoke(c: ManagerContributor) {
    if (
      !window.confirm(
        `Remove ${c.name ?? c.email}? Their entries will stay in the vault.`,
      )
    )
      return;
    setBusy(c.id);
    try {
      const res = await fetch(`/api/account/contributors/${c.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Couldn't revoke.");
      router.refresh();
    } catch (err) {
      window.alert((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function resend(c: ManagerContributor) {
    setBusy(c.id);
    try {
      const res = await fetch(
        `/api/account/contributors/${c.id}/resend`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Couldn't resend invite.");
      window.alert(`Invitation resent to ${c.email}.`);
    } catch (err) {
      window.alert((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function removeFromList(c: ManagerContributor) {
    if (!window.confirm(`Remove ${c.name ?? c.email} from the list?`)) return;
    setBusy(c.id);
    try {
      const res = await fetch(`/api/account/contributors/${c.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Couldn't remove.");
      router.refresh();
    } catch (err) {
      window.alert((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="space-y-8">
        <section>
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
            Contributors
          </p>
          <h2 className="text-2xl font-extrabold text-navy tracking-[-0.3px] mb-4">
            People writing alongside you
          </h2>

          {vaults.length === 0 ? (
            <p className="text-sm text-ink-mid">
              No vaults yet. Create a child vault first.
            </p>
          ) : vaults.length > 1 ? (
            <label className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] font-bold text-ink-mid">
              Managing contributors for:
              <span className="relative">
                <select
                  defaultValue={activeVaultId ?? ""}
                  onChange={(e) => {
                    const v = new URLSearchParams();
                    v.set("vault", e.target.value);
                    router.push(`/account/contributors?${v.toString()}`);
                  }}
                  className="appearance-none bg-white border border-navy/15 rounded-md pl-3 pr-8 py-1.5 text-sm font-semibold text-navy normal-case tracking-normal focus:outline-none focus:border-amber"
                >
                  {vaults.map((v) => (
                    <option key={v.vaultId} value={v.vaultId}>
                      {v.childFirstName}&rsquo;s vault
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  strokeWidth={1.75}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-light pointer-events-none"
                  aria-hidden="true"
                />
              </span>
            </label>
          ) : null}
        </section>

        <Group title={`Active · ${active.length}`} empty="No active contributors yet.">
          {active.map((c) => (
            <ContributorRow
              key={c.id}
              contributor={c}
              busy={busy === c.id}
              onRevoke={() => revoke(c)}
              onEdit={() => setEditing(c)}
            />
          ))}
        </Group>

        <Group title={`Pending · ${pending.length}`} empty="No pending invites.">
          {pending.map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-gold/25 bg-gold-tint px-5 py-4 flex items-start gap-3 flex-wrap"
            >
              <div
                aria-hidden="true"
                className="shrink-0 w-9 h-9 rounded-full bg-white text-gold flex items-center justify-center"
              >
                <Mail size={16} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-navy">{c.email}</span>
                  <RoleBadge role={c.role} />
                </div>
                <div className="text-xs text-ink-light mt-1">
                  Invited {formatShort(c.createdAt)} · Not yet accepted
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => resend(c)}
                  disabled={busy === c.id}
                  className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] font-bold text-amber hover:text-amber-dark disabled:opacity-50"
                >
                  <Mail size={14} strokeWidth={1.5} aria-hidden="true" />
                  Resend
                </button>
                <button
                  type="button"
                  onClick={() => removeFromList(c)}
                  disabled={busy === c.id}
                  className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] font-bold text-ink-light hover:text-red-600 disabled:opacity-50"
                >
                  <X size={14} strokeWidth={1.75} aria-hidden="true" />
                  Cancel
                </button>
              </div>
            </li>
          ))}
        </Group>

        {revoked.length > 0 && (
          <Group title={`Revoked · ${revoked.length}`}>
            {revoked.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-navy/[0.08] bg-warm-surface px-5 py-4 flex items-center gap-3"
              >
                <div
                  aria-hidden="true"
                  className="shrink-0 w-9 h-9 rounded-full bg-white text-ink-light flex items-center justify-center"
                >
                  <User size={16} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink-mid">
                    {c.name ?? c.email}
                  </div>
                  <div className="text-xs text-ink-light mt-0.5">
                    {c.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromList(c)}
                  disabled={busy === c.id}
                  className="text-[11px] uppercase tracking-[0.08em] font-bold text-ink-light hover:text-red-600 disabled:opacity-50"
                >
                  Remove from list
                </button>
              </li>
            ))}
          </Group>
        )}

        {activeVaultId && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
            >
              <UserPlus size={16} strokeWidth={1.5} aria-hidden="true" />
              Invite a contributor
            </button>
          </div>
        )}
      </div>

      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
      {editing && (
        <EditContributorModal
          contributor={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function Group({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: string;
  children: React.ReactNode;
}) {
  const rows = Array.isArray(children) ? children : [children];
  const hasRows = rows.some(Boolean);
  return (
    <section>
      <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-3">
        {title}
      </div>
      {hasRows ? (
        <ul className="space-y-2">{children}</ul>
      ) : empty ? (
        <p className="text-sm text-ink-light italic">{empty}</p>
      ) : null}
    </section>
  );
}

function ContributorRow({
  contributor,
  busy,
  onRevoke,
  onEdit,
}: {
  contributor: ManagerContributor;
  busy: boolean;
  onRevoke: () => void;
  onEdit: () => void;
}) {
  return (
    <li className="rounded-xl border border-navy/[0.08] bg-white px-5 py-4 flex items-start gap-3 flex-wrap">
      <div
        aria-hidden="true"
        className="shrink-0 w-9 h-9 rounded-full bg-amber-tint text-amber flex items-center justify-center"
      >
        <User size={16} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-navy">
            {contributor.name ?? contributor.email}
          </span>
          <RoleBadge role={contributor.role} />
          {contributor.requiresApproval ? (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] font-bold text-amber bg-amber-tint px-2 py-0.5 rounded">
              <Eye size={11} strokeWidth={1.75} aria-hidden="true" />
              Review
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] font-bold text-sage bg-sage-tint px-2 py-0.5 rounded">
              <Check size={11} strokeWidth={2} aria-hidden="true" />
              Auto
            </span>
          )}
        </div>
        <div className="text-xs text-ink-light mt-1">
          {contributor.email} · {contributor.entryCount.toLocaleString()}{" "}
          {contributor.entryCount === 1 ? "memory" : "memories"}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          disabled={busy}
          className="text-[11px] uppercase tracking-[0.08em] font-bold text-amber hover:text-amber-dark disabled:opacity-50"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onRevoke}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] font-bold text-ink-light hover:text-red-600 disabled:opacity-50"
        >
          <UserMinus size={14} strokeWidth={1.5} aria-hidden="true" />
          Revoke
        </button>
      </div>
    </li>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const Icon = ROLE_ICON[role];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] font-bold text-ink-light">
      <Icon size={12} strokeWidth={1.75} aria-hidden="true" />
      {ROLE_LABEL[role]}
    </span>
  );
}

function EditContributorModal({
  contributor,
  onClose,
  onSaved,
}: {
  contributor: ManagerContributor;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(contributor.name ?? "");
  const [role, setRole] = useState<Role>(contributor.role);
  const [requiresApproval, setRequiresApproval] = useState(
    contributor.requiresApproval,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/account/contributors/${contributor.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim() || null,
            role,
            requiresApproval,
          }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't save.");
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
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[480px]"
      >
        <div className="px-6 py-5 border-b border-navy/[0.08] flex items-center justify-between">
          <h3 className="text-xl font-extrabold text-navy tracking-[-0.3px]">
            Edit contributor
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-mid hover:text-navy"
            aria-label="Close"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <label className="block">
            <span className="block text-[11px] font-bold tracking-[0.1em] uppercase text-ink-mid mb-2">
              Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={contributor.email}
              className="account-input"
            />
          </label>

          <div>
            <div className="block text-[11px] font-bold tracking-[0.1em] uppercase text-ink-mid mb-2">
              Role
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-navy">
              {(["FAMILY", "FRIEND", "TEACHER", "OTHER"] as Role[]).map((r) => (
                <label key={r} className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="accent-amber"
                  />
                  {ROLE_LABEL[r]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <div className="block text-[11px] font-bold tracking-[0.1em] uppercase text-ink-mid mb-2">
              Review entries before publishing?
            </div>
            <div className="space-y-2 text-sm">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="review"
                  checked={!requiresApproval}
                  onChange={() => setRequiresApproval(false)}
                  className="mt-1 accent-amber"
                />
                <span>
                  <span className="font-medium text-navy">Auto-approve</span>
                  <span className="ml-1 text-ink-light">
                    — entries go straight to the vault
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="review"
                  checked={requiresApproval}
                  onChange={() => setRequiresApproval(true)}
                  className="mt-1 accent-amber"
                />
                <span>
                  <span className="font-medium text-navy">Review first</span>
                  <span className="ml-1 text-ink-light">
                    — I&rsquo;ll approve each entry
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
        <div className="px-6 py-4 border-t border-navy/[0.08] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-ink-mid hover:text-navy px-3 py-2"
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
