import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";

import { registerStatus } from "../../../../instrumentation";
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

/**
 * Deliberately fires a test exception. We've been chasing a
 * scope-boundary issue where Sentry.captureException returns
 * an event id in the handler context but the transport never
 * flushes because the handler's isolation scope doesn't carry
 * the client bound at instrumentation.ts register() time.
 *
 * Strategy here: try capture THREE ways and log all three
 * outcomes so we can tell which path actually reaches Sentry
 * from Railway's runtime logs. Whichever produces a Sentry
 * event we saw in the dashboard is the one we'll standardize
 * on for the real production captures.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  await logAdminAction(req, "system.sentry-test");

  const summary = dsnSummary();
  const err = new Error(
    `Deliberate Sentry test error at ${new Date().toISOString()}`,
  );

  // Dump every client reference we can reach so we can tell
  // from runtime logs which (if any) was bound.
  const clientDirect = Sentry.getClient();
  const clientCurrentScope = Sentry.getCurrentScope().getClient();
  const clientIsolationScope = Sentry.getIsolationScope().getClient();
  console.log("[sentry-test] client refs:", {
    direct: clientDirect?.getDsn()?.host ?? null,
    currentScope: clientCurrentScope?.getDsn()?.host ?? null,
    isolationScope: clientIsolationScope?.getDsn()?.host ?? null,
  });

  // ── Path A: plain captureException (current behaviour) ──
  const idA = Sentry.captureException(err, {
    tags: { test: "live", area: "admin.sentry-test", path: "A-plain" },
  });
  console.log("[sentry-test] A/plain eventId:", idA);

  // ── Path B: inside an explicit withScope ──
  let idB: string | undefined;
  Sentry.withScope((scope) => {
    scope.setTag("test", "live");
    scope.setTag("area", "admin.sentry-test");
    scope.setTag("path", "B-withScope");
    idB = Sentry.captureException(err);
  });
  console.log("[sentry-test] B/withScope eventId:", idB);

  // ── Path C: directly on the isolation-scope client ──
  let idC: string | null = null;
  try {
    const c = clientIsolationScope ?? clientCurrentScope ?? clientDirect;
    if (c) {
      idC = c.captureException(err, {
        captureContext: {
          tags: {
            test: "live",
            area: "admin.sentry-test",
            path: "C-clientDirect",
          },
        },
      }) ?? null;
    }
  } catch (captureErr) {
    console.error("[sentry-test] C/clientDirect threw:", captureErr);
  }
  console.log("[sentry-test] C/clientDirect eventId:", idC);

  // Flush from every angle — both the top-level Sentry.flush()
  // and the isolation-scope client's flush() if available.
  let flushed = false;
  let flushError: string | null = null;
  let clientFlushed: boolean | null = null;
  try {
    flushed = await Sentry.flush(15_000);
    console.log("[sentry-test] Sentry.flush ok:", flushed);
    const c = clientIsolationScope ?? clientCurrentScope ?? clientDirect;
    if (c) {
      clientFlushed = await c.flush(15_000);
      console.log("[sentry-test] client.flush ok:", clientFlushed);
    }
  } catch (flushErr) {
    flushError = (flushErr as Error)?.message ?? String(flushErr);
    console.error("[sentry-test] flush failed:", flushErr);
  }

  return NextResponse.json(
    {
      error: "Deliberate test error fired — 3 paths logged.",
      eventIds: { A: idA ?? null, B: idB ?? null, C: idC },
      thrownAt: new Date().toISOString(),
      sentry: {
        ...summary,
        flushed,
        clientFlushed,
        flushError,
        clients: {
          direct: Boolean(clientDirect),
          currentScope: Boolean(clientCurrentScope),
          isolationScope: Boolean(clientIsolationScope),
        },
        register: registerStatus,
      },
    },
    { status: 500 },
  );
}
