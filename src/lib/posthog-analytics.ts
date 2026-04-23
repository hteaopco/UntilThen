// PostHog analytics reader.
//
// Wraps PostHog's HogQL query API so the /admin/analytics page
// can pull trends + funnels + top-events without the admin
// needing to bounce out to PostHog's dashboard.
//
// Credentials live in Railway env:
//   POSTHOG_PERSONAL_API_KEY  (created at PostHog → Settings →
//     Personal API keys, minimal scope `query:read`)
//   POSTHOG_PROJECT_ID        (numeric, from PostHog project settings)
//   POSTHOG_API_HOST          (e.g. https://us.posthog.com)
//
// Fail-safe contract: every function returns either a parsed
// result or null. A misconfigured / unreachable PostHog never
// throws — the admin page just renders "unavailable" for that
// card.

import * as Sentry from "@sentry/nextjs";

const REQUEST_TIMEOUT_MS = 12_000;
const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  expires: number;
  data: unknown;
}
const queryCache = new Map<string, CacheEntry>();

// Last error per query string — exposed so the admin UI can
// show what went wrong on a failed card instead of a generic
// "unavailable". Only the message (not stack / key) is retained.
const lastErrors = new Map<string, string>();

export function lastQueryError(query: string): string | null {
  return lastErrors.get(query) ?? null;
}

export function posthogConfigured(): boolean {
  return Boolean(
    process.env.POSTHOG_PERSONAL_API_KEY &&
      process.env.POSTHOG_PROJECT_ID &&
      process.env.POSTHOG_API_HOST,
  );
}

interface HogQLResult {
  columns: string[];
  results: unknown[][];
}

/**
 * Run a HogQL query against PostHog's query endpoint.
 * Returns null on any failure (misconfigured / HTTP error /
 * timeout / parse error). Every failure is captured to Sentry
 * with `area: "posthog.query"` so the admin can investigate.
 *
 * Results are cached in-memory for 60s keyed by the query
 * string, so a page with 5 cards doesn't thundering-herd the
 * PostHog API when the admin refreshes.
 */
export async function hogQuery(query: string): Promise<HogQLResult | null> {
  if (!posthogConfigured()) return null;

  const cached = queryCache.get(query);
  if (cached && cached.expires > Date.now()) {
    return cached.data as HogQLResult;
  }

  const host = process.env.POSTHOG_API_HOST!.replace(/\/$/, "");
  const projectId = process.env.POSTHOG_PROJECT_ID!;
  const url = `${host}/api/projects/${projectId}/query/`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: { kind: "HogQLQuery", query },
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      // PostHog returns JSON with { detail } or { error } on 4xx.
      const bodyText = await res.text().catch(() => "");
      throw new Error(
        `PostHog ${res.status}: ${bodyText.slice(0, 400) || res.statusText}`,
      );
    }
    const payload = (await res.json()) as {
      columns?: string[];
      results?: unknown[][];
    };
    if (!Array.isArray(payload.results) || !Array.isArray(payload.columns)) {
      throw new Error("PostHog query: unexpected response shape");
    }
    const parsed: HogQLResult = {
      columns: payload.columns,
      results: payload.results,
    };
    queryCache.set(query, {
      data: parsed,
      expires: Date.now() + CACHE_TTL_MS,
    });
    lastErrors.delete(query);
    return parsed;
  } catch (err) {
    const msg =
      (err as Error)?.message?.slice(0, 400) ?? String(err).slice(0, 400);
    lastErrors.set(query, msg);
    Sentry.captureException(err, {
      tags: { area: "posthog.query" },
      extra: { query: query.slice(0, 240) },
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ── High-level reporting helpers ─────────────────────────────

export interface TrendPoint {
  day: string;
  count: number;
}

/**
 * Daily new users (first event seen) over the last N days.
 *
 * Uses toStartOfDay() on the aggregate — PostHog's HogQL rewrites
 * `toDate()` to `toDateOrNull()` for safety, which fails on
 * DateTime64 inputs (it requires a String). toStartOfDay() returns
 * a DateTime truncated to midnight and skips that rewrite.
 */
export async function trendNewUsers(days = 30): Promise<TrendPoint[] | null> {
  const result = await hogQuery(buildTrendNewUsersQuery(days));
  return rowsToTrend(result);
}

/** Raw error text for the trendNewUsers query (for admin UI). */
export function trendNewUsersError(days = 30): string | null {
  return lastQueryError(buildTrendNewUsersQuery(days));
}

function buildTrendNewUsersQuery(days: number): string {
  return `
    SELECT toStartOfDay(min_ts) as day, count() as new_users
    FROM (
      SELECT distinct_id, min(timestamp) as min_ts
      FROM events
      GROUP BY distinct_id
    ) _
    WHERE min_ts > now() - INTERVAL ${days} DAY
    GROUP BY day
    ORDER BY day
  `;
}

/** Daily active users over the last N days. */
export async function trendDailyActiveUsers(
  days = 7,
): Promise<TrendPoint[] | null> {
  const result = await hogQuery(`
    SELECT toDate(timestamp) as day, count(DISTINCT distinct_id) as dau
    FROM events
    WHERE timestamp > now() - interval ${days} day
    GROUP BY day
    ORDER BY day
  `);
  return rowsToTrend(result);
}

export interface EventCount {
  event: string;
  count: number;
}

/** Top events in the last N days. */
export async function topEvents(
  days = 7,
  limit = 10,
): Promise<EventCount[] | null> {
  const result = await hogQuery(`
    SELECT event, count() as count
    FROM events
    WHERE timestamp > now() - interval ${days} day
    GROUP BY event
    ORDER BY count DESC
    LIMIT ${limit}
  `);
  if (!result) return null;
  return result.results
    .filter((row) => typeof row[0] === "string" && typeof row[1] === "number")
    .map((row) => ({ event: String(row[0]), count: Number(row[1]) }));
}

export interface PageView {
  path: string;
  views: number;
}

/** Top page views in the last N days. Strips origin for readability. */
export async function topPages(
  days = 7,
  limit = 10,
): Promise<PageView[] | null> {
  const result = await hogQuery(`
    SELECT properties.$pathname as path, count() as views
    FROM events
    WHERE event = '$pageview'
      AND timestamp > now() - interval ${days} day
      AND properties.$pathname IS NOT NULL
    GROUP BY path
    ORDER BY views DESC
    LIMIT ${limit}
  `);
  if (!result) return null;
  return result.results
    .filter((row) => typeof row[0] === "string" && typeof row[1] === "number")
    .map((row) => ({ path: String(row[0]), views: Number(row[1]) }));
}

export interface FunnelStep {
  label: string;
  event: string;
  users: number;
}

/**
 * Reveal funnel — unique users per step over the last N days.
 * Event names mirror the reveal analytics taxonomy
 * (RevealAnalyticsProvider).
 */
export async function revealFunnel(days = 30): Promise<FunnelStep[] | null> {
  const result = await hogQuery(`
    SELECT
      uniqIf(distinct_id, event = 'reveal_opened') as opened,
      uniqIf(distinct_id, event = 'reveal_entry_viewed') as entry,
      uniqIf(distinct_id, event = 'reveal_gallery_viewed') as gallery,
      uniqIf(distinct_id, event = 'reveal_completed') as completed
    FROM events
    WHERE timestamp > now() - interval ${days} day
  `);
  if (!result || result.results.length === 0) return null;
  const row = result.results[0];
  if (!Array.isArray(row) || row.length < 4) return null;
  return [
    { label: "Opened reveal", event: "reveal_opened", users: Number(row[0]) },
    {
      label: "Entered reveal",
      event: "reveal_entry_viewed",
      users: Number(row[1]),
    },
    {
      label: "Reached gallery",
      event: "reveal_gallery_viewed",
      users: Number(row[2]),
    },
    { label: "Completed", event: "reveal_completed", users: Number(row[3]) },
  ];
}

/**
 * Total count of a specific event over the last N days. Returns
 * null on error so callers can render "unavailable" without
 * zeroing out real numbers.
 */
export async function eventCount(
  eventName: string,
  days = 7,
): Promise<number | null> {
  const safe = eventName.replace(/'/g, "");
  const result = await hogQuery(`
    SELECT count() as count
    FROM events
    WHERE event = '${safe}' AND timestamp > now() - interval ${days} day
  `);
  if (!result || result.results.length === 0) return null;
  const raw = result.results[0][0];
  return typeof raw === "number" ? raw : null;
}

// ── internal helpers ─────────────────────────────────────────

function rowsToTrend(result: HogQLResult | null): TrendPoint[] | null {
  if (!result) return null;
  return result.results
    .filter(
      (row) =>
        (typeof row[0] === "string" || row[0] instanceof Date) &&
        typeof row[1] === "number",
    )
    .map((row) => ({
      day: row[0] instanceof Date ? row[0].toISOString().slice(0, 10) : String(row[0]),
      count: Number(row[1]),
    }));
}
