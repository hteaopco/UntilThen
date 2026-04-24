import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireAuth(req: NextRequest): NextResponse | null {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function dsnSummary(): {
  hasDsn: boolean;
  dsnSource: "SENTRY_DSN" | "NEXT_PUBLIC_SENTRY_DSN" | null;
  dsnHost: string | null;
} {
  const raw =
    process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || null;
  const source = process.env.SENTRY_DSN
    ? "SENTRY_DSN"
    : process.env.NEXT_PUBLIC_SENTRY_DSN
      ? "NEXT_PUBLIC_SENTRY_DSN"
      : null;
  let dsnHost: string | null = null;
  try {
    if (raw) dsnHost = new URL(raw).host;
  } catch {
    /* malformed — leave null */
  }
  return { hasDsn: Boolean(raw), dsnSource: source, dsnHost };
}

/**
 * Diagnostic GET — returns Sentry init state so the admin UI can
 * show "DSN present" vs "DSN missing" before the test even fires.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const err = requireAuth(req);
  if (err) return err;
  return NextResponse.json(dsnSummary());
}

/**
 * Deliberately throws a scoped test exception so the admin can
 * verify the Sentry pipeline is working end-to-end. Returns the
 * captured Sentry event id + the full DSN summary in the 500
 * response body so we can diagnose without bouncing to Sentry.
 *
 * Also emits a verbose console log with the outcome so runtime
 * logs show whether the flush succeeded.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  await logAdminAction(req, "system.sentry-test");

  const summary = dsnSummary();
  console.log("[sentry-test] DSN summary:", summary);

  const err = new Error(
    `Deliberate Sentry test error at ${new Date().toISOString()}`,
  );
  const eventId = Sentry.captureException(err, {
    tags: { test: "live", area: "admin.sentry-test" },
  });
  console.log("[sentry-test] captureException returned:", eventId);

  let flushed = false;
  let flushError: string | null = null;
  try {
    // 15s is generous — a cold first-request TLS/DNS handshake
    // to Sentry's ingest can exceed the default 2s, and we'd
    // rather wait than falsely report "flush failed" on the
    // first-of-day test fire.
    flushed = await Sentry.flush(15_000);
    console.log("[sentry-test] flush ok:", flushed);
  } catch (flushErr) {
    flushError = (flushErr as Error)?.message ?? String(flushErr);
    console.error("[sentry-test] flush failed:", flushErr);
  }

  return NextResponse.json(
    {
      error: "Deliberate test error fired.",
      eventId: eventId ?? null,
      thrownAt: new Date().toISOString(),
      sentry: {
        ...summary,
        flushed,
        flushError,
      },
    },
    { status: 500 },
  );
}
