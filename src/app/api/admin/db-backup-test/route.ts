import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { backupKeyForNow, streamDumpToR2 } from "@/lib/db-backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireAuth(req: NextRequest): NextResponse | null {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  await logAdminAction(req, "system.db-backup-test");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json(
      { error: "DATABASE_URL is not set." },
      { status: 500 },
    );
  }
  if (
    !process.env.R2_ACCOUNT_ID ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY
  ) {
    return NextResponse.json(
      { error: "R2 is not configured." },
      { status: 500 },
    );
  }

  const bucket = process.env.R2_BUCKET_NAME ?? "untilthen-media";
  // Manual test runs land under a `manual/` prefix so the nightly
  // retention window on `backups/db/` doesn't accidentally evict
  // them and vice-versa.
  const autoKey = backupKeyForNow();
  const key = autoKey.replace("backups/db/", "backups/db/manual/");

  console.log(`[admin/db-backup-test] starting → ${bucket}/${key}`);

  try {
    const result = await streamDumpToR2({ databaseUrl, bucket, key });
    console.log(
      `[admin/db-backup-test] uploaded ${result.key} — ${result.bytes} bytes in ${result.durationMs}ms`,
    );
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/db-backup-test] failed:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
