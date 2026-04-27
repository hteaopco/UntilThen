"use client";

import { Search, UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Role = "OWNER" | "ADMIN" | "MEMBER";

type MemberRow = {
  memberId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: Role;
  joinedAt: string;
  capsuleCount: number;
};

type InviteRow = {
  inviteId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: "ADMIN" | "MEMBER";
  invitedAt: string;
};

type SortKey = "name" | "role" | "joinedAt" | "capsules";

export function RosterClient({
  orgId,
  viewerRole,
}: {
  orgId: string;
  viewerRole: Role;
}) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${orgId}/members`);
      if (!res.ok) throw new Error("Failed to load roster.");
      const data = (await res.json()) as {
        members: MemberRow[];
        pendingInvites: InviteRow[];
      };
      setMembers(data.members);
      setInvites(data.pendingInvites);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [orgId]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = members;
    if (q) {
      rows = members.filter((m) => {
        return (
          m.firstName.toLowerCase().includes(q) ||
          m.lastName.toLowerCase().includes(q) ||
          (m.email ?? "").toLowerCase().includes(q) ||
          (m.phone ?? "").toLowerCase().includes(q)
        );
      });
    }
    const dir = sortDir === "asc" ? 1 : -1;
    const ROLE_RANK: Record<Role, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
    return [...rows].sort((a: MemberRow, b: MemberRow) => {
      switch (sortKey) {
        case "name":
          return (
            (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName) *
            dir
          );
        case "role":
          return (ROLE_RANK[a.role] - ROLE_RANK[b.role]) * dir;
        case "joinedAt":
          return (
            (new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()) *
            dir
          );
        case "capsules":
          return (a.capsuleCount - b.capsuleCount) * dir;
        default:
          return 0;
      }
    });
  }, [members, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function changeRole(userId: string, role: "ADMIN" | "MEMBER") {
    const res = await fetch(`/api/orgs/${orgId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      window.alert(data.error ?? "Couldn't update role.");
      return;
    }
    await load();
  }

  async function removeMember(userId: string, name: string) {
    if (
      !window.confirm(
        `Remove ${name} from the org? Their personal capsules stay on their account; capsules they made under the company stay attributed to the org until you transfer them.`,
      )
    )
      return;
    const res = await fetch(`/api/orgs/${orgId}/members/${userId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      window.alert(data.error ?? "Couldn't remove member.");
      return;
    }
    await load();
  }

  async function cancelInvite(inviteId: string, email: string) {
    if (
      !window.confirm(
        `Cancel the invite to ${email}? The magic-link they were emailed stops working immediately. Re-invite them later if you change your mind.`,
      )
    )
      return;
    const res = await fetch(`/api/orgs/${orgId}/invites/${inviteId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      window.alert(data.error ?? "Couldn't cancel invite.");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[20px] font-extrabold text-navy">Roster</h2>
          <p className="text-[13px] text-ink-mid mt-0.5">
            {members.length} {members.length === 1 ? "member" : "members"}
            {invites.length > 0 && (
              <>
                {" "}
                · {invites.length} pending invite
                {invites.length === 1 ? "" : "s"}
              </>
            )}
          </p>
        </div>
        <Link
          href="/enterprise/roster/invite"
          className="inline-flex items-center gap-1.5 bg-navy text-white px-4 py-2 rounded-lg text-[13px] font-bold hover:bg-navy/90 transition-colors"
        >
          <UserPlus size={14} strokeWidth={2} aria-hidden="true" />
          Invite
        </Link>
      </div>

      <div className="relative">
        <Search
          size={14}
          strokeWidth={2}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, or phone…"
          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-navy/15 text-sm bg-white focus:border-amber focus:outline-none focus:ring-2 focus:ring-amber/20"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-ink-light">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-navy/[0.08] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-navy/[0.03]">
              <tr>
                <Th onSort={() => toggleSort("name")} active={sortKey === "name"} dir={sortDir}>
                  Name
                </Th>
                <Th>Email / phone</Th>
                <Th onSort={() => toggleSort("role")} active={sortKey === "role"} dir={sortDir}>
                  Role
                </Th>
                <Th onSort={() => toggleSort("capsules")} active={sortKey === "capsules"} dir={sortDir}>
                  Capsules
                </Th>
                <Th onSort={() => toggleSort("joinedAt")} active={sortKey === "joinedAt"} dir={sortDir}>
                  Joined
                </Th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => (
                <tr key={m.memberId} className="border-t border-navy/[0.06]">
                  <td className="px-3 py-2.5 font-semibold text-navy">
                    {m.firstName} {m.lastName}
                  </td>
                  <td className="px-3 py-2.5 text-ink-mid">
                    <div className="text-[12.5px] truncate max-w-[200px]">
                      {m.email ?? "—"}
                    </div>
                    {m.phone && (
                      <div className="text-[11px] text-ink-light truncate max-w-[200px]">
                        {m.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <RolePill role={m.role} />
                  </td>
                  <td className="px-3 py-2.5 text-ink-mid">{m.capsuleCount}</td>
                  <td className="px-3 py-2.5 text-ink-light text-[12px]">
                    {new Date(m.joinedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {m.role !== "OWNER" && (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            changeRole(
                              m.userId,
                              m.role === "ADMIN" ? "MEMBER" : "ADMIN",
                            )
                          }
                          className="text-[11px] font-semibold text-amber hover:text-amber-dark transition-colors"
                        >
                          {m.role === "ADMIN" ? "Demote" : "Promote"}
                        </button>
                        <span className="text-ink-light">·</span>
                        <button
                          type="button"
                          onClick={() =>
                            removeMember(
                              m.userId,
                              `${m.firstName} ${m.lastName}`.trim(),
                            )
                          }
                          className="text-[11px] font-semibold text-red-600 hover:text-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {invites.map((i) => (
                <tr key={i.inviteId} className="border-t border-navy/[0.06] bg-amber-tint/10">
                  <td className="px-3 py-2.5 font-semibold text-navy">
                    {[i.firstName, i.lastName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-ink-mid">
                    <div className="text-[12.5px] truncate max-w-[200px]">
                      {i.email}
                    </div>
                    {i.phone && (
                      <div className="text-[11px] text-ink-light truncate max-w-[200px]">
                        {i.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.1em] font-bold text-ink-mid bg-[#f1f5f9] border border-navy/[0.08]">
                      Invited
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-ink-light">—</td>
                  <td className="px-3 py-2.5 text-ink-light text-[12px]">
                    Sent{" "}
                    {new Date(i.invitedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => cancelInvite(i.inviteId, i.email)}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
              {filteredMembers.length === 0 && invites.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-ink-light italic">
                    No members yet. Invite someone to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {viewerRole === "OWNER" && (
        <p className="text-[12px] text-ink-light italic">
          OWNER only: when you remove a member, you can transfer their org
          capsules from the member detail page (coming soon — for now their
          capsules stay attributed to the org and the OWNER inherits view
          access).
        </p>
      )}
    </div>
  );
}

function Th({
  children,
  onSort,
  active,
  dir,
}: {
  children: React.ReactNode;
  onSort?: () => void;
  active?: boolean;
  dir?: "asc" | "desc";
}) {
  if (!onSort) {
    return (
      <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.12em] font-bold text-ink-light">
        {children}
      </th>
    );
  }
  return (
    <th className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.12em] font-bold text-ink-light">
      <button
        type="button"
        onClick={onSort}
        className={`inline-flex items-center gap-1 hover:text-navy transition-colors ${
          active ? "text-navy" : ""
        }`}
      >
        {children}
        {active && (
          <span aria-hidden="true">{dir === "asc" ? "↑" : "↓"}</span>
        )}
      </button>
    </th>
  );
}

function RolePill({ role }: { role: Role }) {
  // OWNER + ADMIN both read as amber — they're the two
  // privileged roles, and the surrounding UI doesn't need a
  // colour distinction (the label itself already says which).
  // MEMBER stays neutral grey.
  const cls =
    role === "OWNER" || role === "ADMIN"
      ? "text-amber-dark bg-amber-tint border-amber/30"
      : "text-ink-mid bg-[#f1f5f9] border-navy/[0.08]";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.1em] font-bold border ${cls}`}
    >
      {role.toLowerCase()}
    </span>
  );
}
