import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/sentry-test
 *
 * Deliberately throws a scoped test exception so the admin can
 * verify the Sentry pipeline is working end-to-end. Returns the
 * captured Sentry event id in the 500 response body so the UI
 * can show it — the admin can then search Sentry for that exact
 * event to confirm it landed.
 *
 * Tag `test:live` on the captured event so production alerting
 * can be configured to ignore these deliberate throws.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await logAdminAction(req, "system.sentry-test");

  const err = new Error(
    `Deliberate Sentry test error at ${new Date().toISOString()}`,
  );
  const eventId = Sentry.captureException(err, {
    tags: { test: "live", area: "admin.sentry-test" },
  });
  // Make sure the event is pushed to Sentry before the function
  // returns (otherwise the serverless teardown could drop it).
  await Sentry.flush(4000).catch(() => undefined);

  return NextResponse.json(
    {
      error: "Deliberate test error fired.",
      eventId: eventId ?? null,
      thrownAt: new Date().toISOString(),
    },
    { status: 500 },
  );
}
