"use client";

import { Filter, Search, X } from "lucide-react";
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
  // Map of id → full employee data so confirm() works even when
  // the user selected across multiple searches / sort changes and
  // the current `rows` no longer contains all selected employees.
  const [selectedMap, setSelectedMap] = useState<Map<string, PickedEmployee>>(new Map());
  // Department / sub-team filter pills. Empty sets = no filter on
  // that dimension. Multi-select within each dimension; the two
  // dimensions intersect when both are populated, so "Yukon" +
  // "Sales" surfaces only the Yukon-Sales subset (and not the
  // entire Yukon department or the entire Sales sub-team).
  const [deptFilter, setDeptFilter] = useState<Set<string>>(new Set());
  const [subTeamFilter, setSubTeamFilter] = useState<Set<string>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  function pick(employee: PickedEmployee) {
    if (mode === "single") {
      setSelectedMap(new Map([[employee.id, employee]]));
    } else {
      setSelectedMap((prev) => {
        const next = new Map(prev);
        if (next.has(employee.id)) next.delete(employee.id);
        else next.set(employee.id, employee);
        return next;
      });
    }
  }

  function confirm() {
    onConfirm(Array.from(selectedMap.values()));
  }

  function toggleDept(name: string) {
    setDeptFilter((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleSubTeam(name: string) {
    setSubTeamFilter((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function clearFilters() {
    setDeptFilter(new Set());
    setSubTeamFilter(new Set());
  }

  // Apply pill filters. Empty set on a dimension = no filter on
  // that dimension. When both dimensions are populated they
  // intersect (AND), not union — that matches "I want Yukon AND
  // Sales people" rather than "I want everyone in Yukon OR Sales".
  const filteredRows = useMemo(() => {
    if (deptFilter.size === 0 && subTeamFilter.size === 0) return rows;
    return rows.filter((r) => {
      const deptOk =
        deptFilter.size === 0 || (r.department && deptFilter.has(r.department));
      const subOk =
        subTeamFilter.size === 0 ||
        (r.subTeam && subTeamFilter.has(r.subTeam));
      return deptOk && subOk;
    });
  }, [rows, deptFilter, subTeamFilter]);

  function checkAllVisible() {
    if (mode === "single") return;
    const allChecked = filteredRows.every((r) => selectedMap.has(r.id));
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (allChecked) {
        for (const r of filteredRows) next.delete(r.id);
      } else {
        for (const r of filteredRows) next.set(r.id, r);
      }
      return next;
    });
  }

  const allVisibleChecked =
    filteredRows.length > 0 &&
    filteredRows.every((r) => selectedMap.has(r.id));

  const filterCount = deptFilter.size + subTeamFilter.size;
  const selectedSize = selectedMap.size;

  // Group rows by the chosen key. For "none" the group is a
  // single bucket and rendered as a flat list.
  const grouped = useMemo(() => {
    if (groupBy === "none") {
      return [{ key: "All", rows: filteredRows }];
    }
    const buckets = new Map<string, PickedEmployee[]>();
    for (const r of filteredRows) {
      const key =
        (groupBy === "department" ? r.department : r.subTeam) ?? "—";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(r);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, rows]) => ({ key, rows }));
  }, [filteredRows, groupBy]);

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
          {(departments.length > 0 || subTeams.length > 0) && (
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${
                filterCount > 0
                  ? "bg-amber text-white border border-amber"
                  : "bg-white text-navy border border-navy/15 hover:border-navy/30"
              }`}
              aria-expanded={filtersOpen}
            >
              <Filter size={12} strokeWidth={2.25} aria-hidden="true" />
              Filter
              {filterCount > 0 && (
                <span className="ml-0.5">· {filterCount}</span>
              )}
            </button>
          )}
        </div>

        {filtersOpen && (departments.length > 0 || subTeams.length > 0) && (
          <div className="px-6 pb-3 space-y-2.5">
            {departments.length > 0 && (
              <FilterPillRow
                label="Departments"
                values={departments}
                selected={deptFilter}
                onToggle={toggleDept}
              />
            )}
            {subTeams.length > 0 && (
              <FilterPillRow
                label="Sub teams"
                values={subTeams}
                selected={subTeamFilter}
                onToggle={toggleSubTeam}
              />
            )}
            {filterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] font-bold text-amber-dark hover:text-amber underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {mode === "multi" && filteredRows.length > 0 && (
          <div className="px-6 pb-2 flex items-center justify-between">
            <span className="text-[11px] text-ink-light">
              Showing {filteredRows.length}
              {filteredRows.length !== rows.length ? ` of ${rows.length}` : ""}
            </span>
            <button
              type="button"
              onClick={checkAllVisible}
              className="text-[11px] font-bold text-amber-dark hover:text-amber underline"
            >
              {allVisibleChecked ? "Uncheck all" : "Check all"}
            </button>
          </div>
        )}

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
          ) : filteredRows.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-ink-mid">
              {q
                ? "No matches."
                : filterCount > 0
                  ? "No employees match those filters."
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
                    const isPicked = selectedMap.has(r.id);
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => pick(r)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-cream transition-colors ${
                            isPicked ? "bg-amber-tint/40" : ""
                          }`}
                        >
                          {mode === "multi" ? (
                            <input
                              type="checkbox"
                              checked={isPicked}
                              onChange={() => pick(r)}
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
            {selectedSize} selected
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
              disabled={selectedSize === 0}
              className="px-4 py-2 rounded-lg text-[13px] font-bold bg-amber text-white hover:bg-amber-dark transition-colors disabled:opacity-60"
            >
              {mode === "single"
                ? "Use as recipient"
                : selectedSize === 1
                  ? "Add 1 contributor"
                  : `Add ${selectedSize} contributors`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterPillRow({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-1.5">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => {
          const active = selected.has(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => onToggle(v)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                active
                  ? "bg-navy text-white border-navy"
                  : "bg-white text-navy border-navy/15 hover:border-navy/30"
              }`}
            >
              {v}
            </button>
          );
        })}
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
