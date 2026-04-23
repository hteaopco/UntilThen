import { AdminHeader } from "@/app/admin/AdminHeader";
import {
  eventCount,
  posthogConfigured,
  revealFunnel,
  topEvents,
  topPages,
  trendDailyActiveUsers,
  trendNewUsers,
} from "@/lib/posthog-analytics";

export const metadata = {
  title: "Analytics — untilThen Admin",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminAnalyticsPage() {
  if (!posthogConfigured()) {
    return (
      <Shell>
        <div className="rounded-xl border border-amber/30 bg-amber-tint/50 px-5 py-6">
          <p className="text-sm font-bold text-navy mb-1">
            PostHog is not configured.
          </p>
          <p className="text-[13px] text-ink-mid leading-[1.55]">
            Set <code className="font-mono">POSTHOG_PERSONAL_API_KEY</code>,{" "}
            <code className="font-mono">POSTHOG_PROJECT_ID</code>, and{" "}
            <code className="font-mono">POSTHOG_API_HOST</code> on the web
            service in Railway to enable this tab.
          </p>
        </div>
      </Shell>
    );
  }

  // Fan out every query in parallel. Each returns null on
  // failure so one flaky query doesn't take down the page.
  const [
    newUsers30,
    dau7,
    events7,
    pages7,
    funnel30,
    capsulesCreated30,
    contributionsSubmitted30,
    subscribeClicked30,
  ] = await Promise.all([
    trendNewUsers(30),
    trendDailyActiveUsers(7),
    topEvents(7, 10),
    topPages(7, 10),
    revealFunnel(30),
    eventCount("capsule_created", 30),
    eventCount("capsule_contribution_submitted", 30),
    eventCount("subscribe_clicked", 30),
  ]);

  return (
    <Shell>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KpiCard
          label="Capsules created"
          sub="Last 30 days"
          value={capsulesCreated30}
        />
        <KpiCard
          label="Contributions"
          sub="Last 30 days"
          value={contributionsSubmitted30}
        />
        <KpiCard
          label="Subscribe clicks"
          sub="Last 30 days"
          value={subscribeClicked30}
        />
        <KpiCard
          label="New users (30d total)"
          sub="Unique distinct_ids"
          value={sumTrend(newUsers30)}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card title="New users — last 30 days">
          <TrendBar
            points={newUsers30}
            emptyMessage="No new users yet."
            width={48}
          />
        </Card>
        <Card title="Daily active users — last 7 days">
          <TrendBar
            points={dau7}
            emptyMessage="No activity yet."
            width={48}
          />
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card title="Reveal funnel — last 30 days">
          {funnel30 ? (
            <FunnelView steps={funnel30} />
          ) : (
            <Unavailable />
          )}
        </Card>
        <Card title="Top events — last 7 days">
          {events7 && events7.length > 0 ? (
            <ul className="space-y-1.5">
              {events7.map((e) => (
                <li
                  key={e.event}
                  className="flex items-center justify-between gap-2 text-[13px]"
                >
                  <span className="font-mono text-navy truncate">
                    {e.event}
                  </span>
                  <span className="font-bold text-navy tabular-nums">
                    {e.count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Unavailable />
          )}
        </Card>
      </div>

      <Card title="Top pages — last 7 days">
        {pages7 && pages7.length > 0 ? (
          <ul className="space-y-1.5">
            {pages7.map((p) => (
              <li
                key={p.path}
                className="flex items-center justify-between gap-2 text-[13px]"
              >
                <span className="font-mono text-navy truncate">
                  {p.path}
                </span>
                <span className="font-bold text-navy tabular-nums">
                  {p.views.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Unavailable />
        )}
      </Card>

      <p className="text-[11px] text-ink-light mt-6">
        Data cached for 60s per query. All numbers come from PostHog via its
        HogQL query API; failures render &ldquo;unavailable&rdquo; per card
        rather than breaking the page.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <AdminHeader />
        {children}
      </div>
    </main>
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
    <div className="rounded-xl border border-navy/10 p-5">
      <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-4">
        {title}
      </div>
      {children}
    </div>
  );
}

function KpiCard({
  label,
  sub,
  value,
}: {
  label: string;
  sub: string;
  value: number | null;
}) {
  return (
    <div className="rounded-xl border border-navy/10 p-4">
      <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-1">
        {label}
      </div>
      <div className="text-2xl font-extrabold text-navy tabular-nums">
        {value === null ? "—" : value.toLocaleString()}
      </div>
      <div className="text-[11px] text-ink-light mt-1">{sub}</div>
    </div>
  );
}

function TrendBar({
  points,
  emptyMessage,
  width,
}: {
  points: { day: string; count: number }[] | null;
  emptyMessage: string;
  width: number;
}) {
  if (!points) return <Unavailable />;
  if (points.length === 0)
    return <p className="text-[13px] text-ink-light">{emptyMessage}</p>;
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <div>
      <div className="flex items-end gap-1 h-24 mb-3" aria-hidden="true">
        {points.map((p) => {
          const h = Math.round((p.count / max) * 96) + 2;
          return (
            <div
              key={p.day}
              className="flex-1 bg-amber/60 rounded-sm"
              style={{ height: `${h}px`, minWidth: "3px" }}
              title={`${p.day}: ${p.count}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-ink-light font-mono">
        <span>{points[0]?.day.slice(5)}</span>
        <span className="text-ink-mid font-semibold">
          total{" "}
          {points.reduce((s, p) => s + p.count, 0).toLocaleString()}
        </span>
        <span>{points[points.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}

function FunnelView({
  steps,
}: {
  steps: { label: string; event: string; users: number }[];
}) {
  const top = steps[0]?.users ?? 0;
  if (top === 0) {
    return (
      <p className="text-[13px] text-ink-light">
        No reveal activity in the last 30 days.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {steps.map((step, i) => {
        const pct = top > 0 ? step.users / top : 0;
        const dropFromTop = top > 0 ? 1 - pct : 0;
        return (
          <li key={step.event}>
            <div className="flex items-center justify-between text-[13px] mb-1">
              <span className="font-semibold text-navy">{step.label}</span>
              <span className="tabular-nums text-ink-mid">
                {step.users.toLocaleString()}
                {i > 0 ? (
                  <span className="text-ink-light ml-2 text-[11px]">
                    {(pct * 100).toFixed(0)}% of opened
                  </span>
                ) : null}
              </span>
            </div>
            <div className="h-2 bg-navy/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber"
                style={{ width: `${Math.max(pct * 100, 2)}%` }}
              />
            </div>
            {i === steps.length - 1 && top > 0 ? (
              <p className="text-[11px] text-ink-light mt-2">
                Drop-off from open → completed:{" "}
                {(dropFromTop * 100).toFixed(0)}%
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Unavailable() {
  return (
    <p className="text-[13px] text-ink-light">
      Data unavailable. Check PostHog configuration or Sentry for{" "}
      <code className="font-mono">posthog.query</code> errors.
    </p>
  );
}

function sumTrend(points: { day: string; count: number }[] | null): number | null {
  if (!points) return null;
  return points.reduce((s, p) => s + p.count, 0);
}
