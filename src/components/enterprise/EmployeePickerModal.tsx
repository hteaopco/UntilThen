"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type PickedEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  department: string | null;
  subTeam: string | null;
};

type SortKey = "firstName" | "lastName" | "department" | "subTeam";
type GroupKey = "none" | "department" | "subTeam";
type Mode = "single" | "multi";

/**
 * Read-only employee picker. Shared by:
 *
 *   - capsule contributor add flow (multi-select; appends each
 *     picked employee as a fresh row in the invite form)
 *   - capsule recipient field (single-select; fills firstName +
 *     lastName + email on selection)
 *
 * Hits /api/orgs/[id]/employees with status=ACTIVE — archived /
 * deleted employees never appear here. The endpoint's auth was
 * loosened to MEMBER+ specifically so this picker works for
 * every org member, not just admins.
 *
 * The page-management table at /enterprise/roster (Employees
 * tab) is the editable surface; this picker is intentionally
 * featureless beyond sort / search / group.
 */
export function EmployeePickerModal({
  orgId,
  mode,
  title,
  onClose,
  onConfirm,
}: {
  orgId: string;
  mode: Mode;
  title?: string;
  onClose: () => void;
  /** Called with the picked rows when the user hits Confirm.
   *  In single mode this is always a one-element array. */
  onConfirm: (picks: PickedEmployee[]) => void;
}) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sort, setSort] = useState<SortKey>("lastName");
  const [groupBy, setGroupBy] = useState<GroupKey>("none");
  const [rows, setRows] = useState<PickedEmployee[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [subTeams, setSubTeams] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q), 200);
    return () => window.clearTimeout(t);
  }, [q]);

  // Single fetch on open + on filter changes. The picker pulls
  // up to 1000 ACTIVE employees in one go — page-size 500 is the
  // server's max but the org's expected size for v1 is low
  // enough that pagination noise here would just hurt UX. If
  // an org grows past that we'll add pagination back.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          status: "ACTIVE",
          sort,
          dir: "asc",
          page: "1",
          pageSize: "500",
        });
        if (debouncedQ) params.set("q", debouncedQ);
        const res = await fetch(
          `/api/orgs/${orgId}/employees?${params.toString()}`,
        );
        if (!res.ok) throw new Error("Failed to load employees.");
        const data = (await res.json()) as {
          rows: PickedEmployee[];
          departments: string[];
          subTeams: string[];
        };
        if (cancelled) return;
        setRows(data.rows);
        setDepartments(data.departments);
        setSubTeams(data.subTeams);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orgId, debouncedQ, sort]);

  function pick(id: string) {
    if (mode === "single") {
      setSelected(new Set([id]));
    } else {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelected(next);
    }
  }

  function confirm() {
    const picks = rows.filter((r) => selected.has(r.id));
    onConfirm(picks);
  }

  // Group rows by the chosen key. For "none" the group is a
  // single bucket and rendered as a flat list.
  const grouped = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "All", rows }];
    }
    const buckets = new Map<string, PickedEmployee[]>();
    for (const r of rows) {
      const key =
        (groupBy === "department" ? r.department : r.subTeam) ?? "—";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(r);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, rows]) => ({ key, rows }));
  }, [rows, groupBy]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[680px] max-h-[88vh] flex flex-col"
      >
        <div className="px-6 pt-6 pb-3 flex items-center justify-between">
          <h2 className="text-[18px] font-extrabold text-navy tracking-[-0.2px]">
            {title ?? (mode === "single" ? "Pick recipient" : "Add contributors")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-mid hover:text-navy"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 pb-3 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px] relative">
            <Search
              size={14}
              strokeWidth={2}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light"
              aria-hidden="true"
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or email"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-navy/15 bg-white text-[13px] text-navy placeholder-ink-light/60 outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
            />
          </div>
          <Select
            label="Sort"
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            options={[
              { value: "firstName", label: "First name" },
              { value: "lastName", label: "Last name" },
              { value: "department", label: "Department" },
              { value: "subTeam", label: "Sub team" },
            ]}
          />
          <Select
            label="Group"
            value={groupBy}
            onChange={(v) => setGroupBy(v as GroupKey)}
            options={[
              { value: "none", label: "None" },
              {
                value: "department",
                label: "Department",
                disabled: departments.length === 0,
              },
              {
                value: "subTeam",
                label: "Sub team",
                disabled: subTeams.length === 0,
              },
            ]}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6">
          {loading ? (
            <p className="py-10 text-center text-[13px] text-ink-mid">
              Loading…
            </p>
          ) : error ? (
            <p className="py-10 text-center text-[13px] text-red-600">
              {error}
            </p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-ink-mid">
              {q
                ? "No matches."
                : "No employees in the database yet. Admins can import a roster from /enterprise/roster."}
            </p>
          ) : (
            grouped.map((g) => (
              <div key={g.key} className="mb-4 last:mb-0">
                {groupBy !== "none" && (
                  <p className="text-[10px] uppercase tracking-[0.14em] font-bold text-amber mt-3 mb-1.5 sticky top-0 bg-white py-1">
                    {g.key} <span className="text-ink-light">({g.rows.length})</span>
                  </p>
                )}
                <ul className="border border-navy/[0.08] rounded-lg divide-y divide-navy/[0.04] overflow-hidden">
                  {g.rows.map((r) => {
                    const isPicked = selected.has(r.id);
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => pick(r.id)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-cream transition-colors ${
                            isPicked ? "bg-amber-tint/40" : ""
                          }`}
                        >
                          {mode === "multi" ? (
                            <input
                              type="checkbox"
                              checked={isPicked}
                              onChange={() => pick(r.id)}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Select ${r.firstName} ${r.lastName}`}
                            />
                          ) : (
                            <span
                              className={`inline-block w-3 h-3 rounded-full border ${
                                isPicked
                                  ? "bg-amber border-amber"
                                  : "border-navy/30"
                              }`}
                              aria-hidden="true"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-bold text-navy truncate">
                              {r.firstName} {r.lastName}
                            </div>
                            <div className="text-[11px] text-ink-mid truncate">
                              {r.email}
                              {r.department || r.subTeam ? (
                                <span className="ml-2">
                                  · {r.department}
                                  {r.subTeam ? ` / ${r.subTeam}` : ""}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-navy/[0.06] flex items-center justify-between gap-3">
          <span className="text-[12px] text-ink-mid">
            {selected.size} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-navy/15 text-ink-mid hover:text-navy hover:border-navy/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={selected.size === 0}
              className="px-4 py-2 rounded-lg text-[13px] font-bold bg-amber text-white hover:bg-amber-dark transition-colors disabled:opacity-60"
            >
              {mode === "single"
                ? "Use as recipient"
                : selected.size === 1
                  ? "Add 1 contributor"
                  : `Add ${selected.size} contributors`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Select<V extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: V;
  onChange: (v: V) => void;
  options: { value: V; label: string; disabled?: boolean }[];
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-[12px] text-ink-mid">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as V)}
        className="px-2 py-1.5 rounded-lg border border-navy/15 bg-white text-[12px] font-bold text-navy outline-none focus:border-amber"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
