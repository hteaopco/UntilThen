"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Status = "ACTIVE" | "ARCHIVED" | "DELETED";
type SortKey = "firstName" | "lastName" | "department" | "subTeam" | "createdAt";
type SortDir = "asc" | "desc";
type PageSize = 50 | 100 | 250 | 500;

type EmployeeRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  department: string | null;
  subTeam: string | null;
  status: Status;
  inactivatedAt: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<Status, string> = {
  ACTIVE: "Active",
  ARCHIVED: "Archived",
  DELETED: "Deleted",
};

/**
 * Phase 1 read-only Employees table. Sort, search, status filter,
 * pagination. Edit / import / multi-edit live in Phase 2; the
 * picker integration into capsule contributor flow lives in
 * Phase 3. Empty state previews what's coming so admins know
 * the surface exists before there's any data in it.
 */
export function EmployeesClient({ orgId }: { orgId: string }) {
  const [status, setStatus] = useState<Status>("ACTIVE");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [sort, setSort] = useState<SortKey>("lastName");
  const [dir, setDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(50);

  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 200ms debounce on the search input so we don't hammer the
  // API with every keystroke. The page also resets to 1 on a
  // new query — landing on an empty page-7 from a stale query
  // looks broken.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 200);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          status,
          sort,
          dir,
          page: String(page),
          pageSize: String(pageSize),
        });
        if (debouncedQ) params.set("q", debouncedQ);
        const res = await fetch(
          `/api/orgs/${orgId}/employees?${params.toString()}`,
        );
        if (!res.ok) throw new Error("Failed to load employees.");
        const data = (await res.json()) as {
          rows: EmployeeRow[];
          total: number;
        };
        if (cancelled) return;
        setRows(data.rows);
        setTotal(data.total);
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
  }, [orgId, status, debouncedQ, sort, dir, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function changeSort(next: SortKey) {
    if (sort === next) {
      setDir(dir === "asc" ? "desc" : "asc");
    } else {
      setSort(next);
      setDir("asc");
    }
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Status sub-tabs */}
      <div className="flex items-center gap-1 border-b border-navy/[0.08]">
        {(["ACTIVE", "ARCHIVED", "DELETED"] as Status[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`px-3 py-2 text-[13px] font-bold border-b-2 -mb-px transition-colors ${
              status === s
                ? "border-amber text-navy"
                : "border-transparent text-ink-mid hover:text-navy"
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Search + page-size */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px] relative">
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
        <label className="inline-flex items-center gap-2 text-[12px] text-ink-mid">
          Rows per page
          <select
            value={pageSize}
            onChange={(e) => {
              const next = parseInt(e.target.value, 10) as PageSize;
              setPageSize(next);
              setPage(1);
            }}
            className="px-2 py-1.5 rounded-lg border border-navy/15 bg-white text-[12px] font-bold text-navy outline-none focus:border-amber"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
            <option value={500}>500</option>
          </select>
        </label>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-navy/[0.08] bg-white overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left border-b border-navy/[0.06]">
              <Th sortable onClick={() => changeSort("lastName")} active={sort === "lastName"} dir={dir}>
                Name
              </Th>
              <Th>Email</Th>
              <Th sortable onClick={() => changeSort("department")} active={sort === "department"} dir={dir}>
                Department
              </Th>
              <Th sortable onClick={() => changeSort("subTeam")} active={sort === "subTeam"} dir={dir}>
                Sub team
              </Th>
              <Th>Phone</Th>
              <Th sortable onClick={() => changeSort("createdAt")} active={sort === "createdAt"} dir={dir}>
                Added
              </Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-mid">
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-red-600">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <EmptyRow status={status} />
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-navy/[0.04] last:border-0"
                >
                  <Td>
                    <span className="font-bold text-navy">
                      {r.firstName} {r.lastName}
                    </span>
                  </Td>
                  <Td>{r.email}</Td>
                  <Td>{r.department ?? <span className="text-ink-light">—</span>}</Td>
                  <Td>{r.subTeam ?? <span className="text-ink-light">—</span>}</Td>
                  <Td>{r.phone ?? <span className="text-ink-light">—</span>}</Td>
                  <Td>
                    {new Date(r.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pager */}
      {total > 0 && (
        <div className="flex items-center justify-between gap-3 text-[12px] text-ink-mid">
          <span>
            {(page - 1) * pageSize + 1}&ndash;
            {Math.min(page * pageSize, total)} of {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-navy/15 bg-white font-bold text-navy disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-bold text-navy">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-navy/15 bg-white font-bold text-navy disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  sortable,
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  sortable?: boolean;
  onClick?: () => void;
  active?: boolean;
  dir?: SortDir;
}) {
  if (sortable) {
    return (
      <th className="px-4 py-2.5 text-[11px] uppercase tracking-[0.1em] font-bold text-ink-mid">
        <button
          type="button"
          onClick={onClick}
          className={`inline-flex items-center gap-1 hover:text-navy transition-colors ${
            active ? "text-navy" : ""
          }`}
        >
          {children}
          {active ? <span aria-hidden="true">{dir === "asc" ? "↑" : "↓"}</span> : null}
        </button>
      </th>
    );
  }
  return (
    <th className="px-4 py-2.5 text-[11px] uppercase tracking-[0.1em] font-bold text-ink-mid">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-2.5 align-middle">{children}</td>;
}

function EmptyRow({ status }: { status: Status }) {
  const message = useMemo(() => {
    if (status === "ACTIVE") {
      return {
        title: "No employees yet",
        body: "The Employees database is being rolled out in phases. Phase 2 (coming up) will add the CSV import + edit flows.",
      };
    }
    if (status === "ARCHIVED") {
      return {
        title: "Nothing archived",
        body: "Employees you manually archive land here. They can be restored at any time.",
      };
    }
    return {
      title: "Nothing in the deleted bin",
      body: "Employees removed by an overwrite import land here. They can be restored at any time.",
    };
  }, [status]);

  return (
    <tr>
      <td colSpan={6} className="px-4 py-10">
        <div className="text-center max-w-[420px] mx-auto">
          <p className="text-[14px] font-bold text-navy">{message.title}</p>
          <p className="mt-1 text-[13px] text-ink-mid leading-[1.55]">
            {message.body}
          </p>
        </div>
      </td>
    </tr>
  );
}
