import { NextResponse } from "next/server";

import { cronRoute } from "@/lib/cron-run";
import { backupKeyForNow, streamDumpToR2 } from "@/lib/db-backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Nightly DB backup. Streams pg_dump → gzip → R2 multipart upload.
 * Second layer on top of Railway's native Postgres backups so we
 * own a copy outside Railway's infrastructure.
 *
 * Auth: Bearer CRON_SECRET.
 */
export const POST = cronRoute("db-backup", async (): Promise<NextResponse> => {
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
  const key = backupKeyForNow();

  console.log(`[cron/db-backup] starting → ${bucket}/${key}`);

  try {
    const result = await streamDumpToR2({ databaseUrl, bucket, key });
    console.log(
      `[cron/db-backup] uploaded ${result.key} — ${result.bytes} bytes in ${result.durationMs}ms`,
    );
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/db-backup] failed:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
});
