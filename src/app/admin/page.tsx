import Link from "next/link";

import { DeleteEntryButton } from "@/app/admin/DeleteEntryButton";
import { SignOutButton } from "@/app/admin/SignOutButton";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type WaitlistRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  dateOfBirth: Date | null;
  numChildren: number;
  hearAboutUs: string | null;
  createdAt: Date;
};

async function loadEntries(): Promise<
  | { ok: true; entries: WaitlistRow[] }
  | { ok: false; error: string; hint?: string }
> {
  if (!process.env.DATABASE_URL) {
    return {
      ok: false,
      error: "DATABASE_URL is not set.",
      hint: "Add Postgres in Railway and expose DATABASE_URL.",
    };
  }
  try {
    const { prisma } = await import("@/lib/prisma");
    const entries = await prisma.waitlist.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { ok: true, entries };
  } catch (err) {
    const message = (err as Error).message;
    return {
      ok: false,
      error: message,
      hint: message.toLowerCase().includes("does not exist")
        ? "Run `prisma migrate deploy` so the Waitlist table exists."
        : undefined,
    };
  }
}

function pct(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

// Render the signup datetime in Central Time. Automatically picks CST
// or CDT based on the calendar date (handled by Intl with the
// America/Chicago zone).
function formatDateCST(d: Date): string {
  return d.toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeCST(d: Date): string {
  // Compute the short zone name (CST / CDT) for this specific date so the
  // label is correct year-round.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    timeZoneName: "short",
  }).formatToParts(d);
  const zone =
    parts.find((p) => p.type === "timeZoneName")?.value ?? "CT";
  const time = d.toLocaleTimeString("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${time} ${zone}`;
}

export default async function AdminPage() {
  const data = await loadEntries();

  if (!data.ok) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="flex items-center justify-between mb-10">
            <h1 className="text-2xl font-extrabold text-navy tracking-[-0.5px]">
              untilThen Admin
            </h1>
            <SignOutButton />
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-bold text-red-700 mb-1">
              Database not reachable
            </p>
            <p className="text-sm text-red-700/90">{data.error}</p>
            {data.hint && (
              <p className="mt-2 text-xs text-red-700/80 italic">{data.hint}</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  const { entries } = data;
  const total = entries.length;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const todayCount = entries.filter((e) => e.createdAt >= today).length;
  const weekCount = entries.filter((e) => e.createdAt >= sevenDaysAgo).length;
  const phoneCount = entries.filter((e) => Boolean(e.phone)).length;

  const sources = entries.reduce<Record<string, number>>((acc, e) => {
    const key = e.hearAboutUs ?? "Not specified";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const sortedSources = Object.entries(sources).sort((a, b) => b[1] - a[1]);

  const childrenBuckets = [1, 2, 3, 4].map((n) => ({
    n,
    count: entries.filter((e) => e.numChildren === n).length,
    label: n === 4 ? "4+ children" : `${n} child${n > 1 ? "ren" : ""}`,
  }));

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
          <h1 className="text-2xl font-extrabold text-navy tracking-[-0.5px]">
            untilThen Admin
          </h1>
          <div className="flex items-center gap-4">
            <Link
              href="/api/admin/export"
              prefetch={false}
              className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-navy-mid transition-colors"
            >
              Export CSV
            </Link>
            <SignOutButton />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <Stat label="Total signups" value={total} />
          <Stat label="Today" value={todayCount} />
          <Stat label="This week" value={weekCount} />
          <Stat
            label="Phone opt-ins"
            value={total > 0 ? pct(phoneCount, total) : "—"}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-5 mb-10">
          <Card title="By referral source">
            {sortedSources.length === 0 && (
              <p className="text-sm text-ink-light">No signups yet.</p>
            )}
            {sortedSources.map(([k, v]) => (
              <Row key={k} label={k} value={`${v} · ${pct(v, total)}`} />
            ))}
          </Card>

          <Card title="By number of children">
            {childrenBuckets.map(({ n, count, label }) => (
              <Row
                key={n}
                label={label}
                value={`${count} · ${pct(count, total)}`}
              />
            ))}
          </Card>
        </div>

        <Card title="Recent signups">
          {entries.length === 0 ? (
            <p className="text-sm text-ink-light">No signups yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy/10 text-left text-[11px] uppercase tracking-[0.08em] text-ink-mid">
                    <th className="py-2 pr-4 font-bold">Name</th>
                    <th className="py-2 pr-4 font-bold">Email</th>
                    <th className="py-2 pr-4 font-bold">Children</th>
                    <th className="py-2 pr-4 font-bold">Source</th>
                    <th className="py-2 pr-4 font-bold">Date</th>
                    <th className="py-2 pr-4 font-bold">Time</th>
                    <th className="py-2 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(0, 50).map((e) => (
                    <tr key={e.id} className="border-b border-navy/[0.06]">
                      <td className="py-2.5 pr-4 text-navy whitespace-nowrap">
                        {e.firstName} {e.lastName}
                      </td>
                      <td className="py-2.5 pr-4 text-ink-mid">{e.email}</td>
                      <td className="py-2.5 pr-4 text-ink-mid">
                        {e.numChildren === 4 ? "4+" : e.numChildren}
                      </td>
                      <td className="py-2.5 pr-4 text-ink-mid">
                        {e.hearAboutUs ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-ink-mid whitespace-nowrap">
                        {formatDateCST(e.createdAt)}
                      </td>
                      <td className="py-2.5 pr-4 text-ink-mid whitespace-nowrap">
                        {formatTimeCST(e.createdAt)}
                      </td>
                      <td className="py-2.5 text-right">
                        <DeleteEntryButton
                          id={e.id}
                          name={`${e.firstName} ${e.lastName}`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-navy/10 p-5">
      <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-2">
        {label}
      </div>
      <div className="text-3xl font-extrabold text-navy tracking-[-0.5px]">
        {value}
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-navy/10 p-5">
      <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-4">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-navy/[0.04] last:border-b-0">
      <span className="text-ink-mid">{label}</span>
      <span className="text-navy font-bold tabular-nums">{value}</span>
    </div>
  );
}
