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

export async function GET(req: NextRequest): Promise<NextResponse> {
  const err = requireAuth(req);
  if (err) return err;
  return NextResponse.json(dsnSummary());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  await logAdminAction(req, "system.sentry-test");

  const err = new Error(
    `Deliberate Sentry test error at ${new Date().toISOString()}`,
  );

  const eventId = Sentry.captureException(err, {
    tags: { test: "live", area: "admin.sentry-test" },
  });

  const flushed = await Sentry.flush(15_000);

  return NextResponse.json(
    {
      error: "Deliberate test error fired.",
      eventId: eventId ?? null,
      thrownAt: new Date().toISOString(),
      sentry: { ...dsnSummary(), flushed },
    },
    { status: 500 },
  );
}
