import Link from "next/link";

import { AdminHeader } from "@/app/admin/AdminHeader";

export const metadata = {
  title: "Audit — untilThen Admin",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 50;

interface SearchParams {
  action?: string;
  targetType?: string;
  targetId?: string;
  since?: string;
  page?: string;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!process.env.DATABASE_URL) {
    return (
      <Shell>
        <p className="text-sm text-red-600">DATABASE_URL is not set.</p>
      </Shell>
    );
  }

  const params = await searchParams;
  const { prisma } = await import("@/lib/prisma");

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const actionFilter = params.action?.trim() || undefined;
  const targetTypeFilter = params.targetType?.trim() || undefined;
  const targetIdFilter = params.targetId?.trim() || undefined;
  const sinceFilter = parseSinceDays(params.since);

  const where = {
    ...(actionFilter ? { action: actionFilter } : {}),
    ...(targetTypeFilter ? { targetType: targetTypeFilter } : {}),
    ...(targetIdFilter ? { targetId: targetIdFilter } : {}),
    ...(sinceFilter
      ? { createdAt: { gte: new Date(Date.now() - sinceFilter * 86400000) } }
      : {}),
  };

  const [total, rows, distinctActions] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.adminAuditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Shell>
      <form
        method="get"
        className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6 items-end"
      >
        <Field label="Action">
          <select
            name="action"
            defaultValue={actionFilter ?? ""}
            className="w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-[13px] text-navy"
          >
            <option value="">All actions</option>
            {distinctActions.map((a) => (
              <option key={a.action} value={a.action}>
                {a.action}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Target type">
          <input
            type="text"
            name="targetType"
            defaultValue={targetTypeFilter ?? ""}
            placeholder="User, CapsuleContribution…"
            className="w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-[13px] text-navy placeholder:text-ink-light"
          />
        </Field>
        <Field label="Target id">
          <input
            type="text"
            name="targetId"
            defaultValue={targetIdFilter ?? ""}
            placeholder="cmo…"
            className="w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-[13px] text-navy placeholder:text-ink-light"
          />
        </Field>
        <Field label="Since">
          <select
            name="since"
            defaultValue={params.since ?? ""}
            className="w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-[13px] text-navy"
          >
            <option value="">All time</option>
            <option value="1">Past day</option>
            <option value="7">Past week</option>
            <option value="30">Past 30 days</option>
            <option value="90">Past 90 days</option>
            <option value="365">Past year</option>
          </select>
        </Field>
        <div className="sm:col-span-4 flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-navy text-white text-[13px] font-bold hover:bg-navy/90"
          >
            Apply filters
          </button>
          <Link
            href="/admin/audit"
            className="text-[13px] text-ink-mid hover:text-navy"
          >
            Reset
          </Link>
          <span className="text-[12px] text-ink-light ml-auto">
            {total.toLocaleString()} row{total === 1 ? "" : "s"}
            {totalPages > 1
              ? ` · page ${page} of ${totalPages}`
              : ""}
          </span>
        </div>
      </form>

      <div className="overflow-x-auto border border-navy/10 rounded-md">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-navy/[0.03]">
              <Th>When</Th>
              <Th>Action</Th>
              <Th>Target</Th>
              <Th>IP</Th>
              <Th>Metadata</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-ink-light"
                >
                  No entries match those filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-navy/[0.06]">
                  <Td className="whitespace-nowrap font-mono text-[12px] text-ink-mid">
                    {formatTimestamp(r.createdAt)}
                  </Td>
                  <Td className="font-mono text-[12.5px] text-navy">
                    {r.action}
                  </Td>
                  <Td className="font-mono text-[12px] text-ink-mid">
                    {r.targetType ? (
                      <>
                        {r.targetType}
                        {r.targetId ? (
                          <>
                            <span className="text-ink-light">:</span>
                            <span>{r.targetId}</span>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-ink-light">—</span>
                    )}
                  </Td>
                  <Td className="font-mono text-[12px] text-ink-mid">
                    {r.ipAddress ?? <span className="text-ink-light">—</span>}
                  </Td>
                  <Td className="font-mono text-[11.5px] text-ink-mid max-w-[380px]">
                    {r.metadata ? (
                      <code className="whitespace-pre-wrap break-all">
                        {JSON.stringify(r.metadata)}
                      </code>
                    ) : (
                      <span className="text-ink-light">—</span>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center gap-2 mt-4">
          <PageLink params={params} page={Math.max(1, page - 1)} disabled={page === 1}>
            ← Previous
          </PageLink>
          <PageLink
            params={params}
            page={Math.min(totalPages, page + 1)}
            disabled={page === totalPages}
          >
            Next →
          </PageLink>
        </div>
      ) : null}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <AdminHeader />
        <div>{children}</div>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.1em] font-bold text-ink-mid mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-3 py-2 text-[11px] uppercase tracking-[0.08em] font-bold text-navy border-b border-navy/10">
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-3 py-2 align-top ${className}`}>{children}</td>
  );
}

function PageLink({
  params,
  page,
  disabled,
  children,
}: {
  params: SearchParams;
  page: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  const qs = new URLSearchParams();
  if (params.action) qs.set("action", params.action);
  if (params.targetType) qs.set("targetType", params.targetType);
  if (params.targetId) qs.set("targetId", params.targetId);
  if (params.since) qs.set("since", params.since);
  qs.set("page", String(page));
  const href = `/admin/audit?${qs.toString()}`;
  if (disabled) {
    return (
      <span className="px-3 py-1.5 text-[13px] text-ink-light border border-navy/10 rounded-md">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="px-3 py-1.5 text-[13px] text-navy border border-navy/20 rounded-md hover:bg-navy/[0.04]"
    >
      {children}
    </Link>
  );
}

function parseSinceDays(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatTimestamp(d: Date): string {
  // YYYY-MM-DD HH:MM:SS UTC — uniform, sortable, no locale drift.
  return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
}
