import { spawn } from "node:child_process";
import { createGzip } from "node:zlib";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse, type NextRequest } from "next/server";

import { cronRoute } from "@/lib/cron-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Safety ceiling — if a compressed dump ever blows past this, we
// fail loud instead of silently truncating. At that point switch
// to @aws-sdk/lib-storage multipart uploads.
const MAX_DUMP_BYTES = 500 * 1024 * 1024;

function r2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID!;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

function dumpToBuffer(databaseUrl: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // --no-owner / --no-privileges keep the dump portable across
    // Postgres instances (restore target may not share role names).
    // --clean drops objects first; we include it so restore into a
    // non-empty staging DB replaces cleanly.
    const pg = spawn(
      "pg_dump",
      ["--no-owner", "--no-privileges", "--clean", "--if-exists", databaseUrl],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    const gzip = createGzip({ level: 6 });
    const chunks: Buffer[] = [];
    let bytes = 0;
    let stderr = "";

    pg.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    pg.on("error", reject);
    pg.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `pg_dump exited ${code}: ${stderr.slice(0, 500)}`,
          ),
        );
      }
    });

    gzip.on("data", (d: Buffer) => {
      bytes += d.length;
      if (bytes > MAX_DUMP_BYTES) {
        pg.kill("SIGTERM");
        gzip.destroy();
        reject(
          new Error(
            `Dump exceeded ${MAX_DUMP_BYTES} bytes — switch to streaming multipart upload.`,
          ),
        );
        return;
      }
      chunks.push(d);
    });
    gzip.on("end", () => resolve(Buffer.concat(chunks)));
    gzip.on("error", reject);

    pg.stdout.pipe(gzip);
  });
}

/**
 * Nightly DB backup. Runs pg_dump against DATABASE_URL, gzips the
 * output, and uploads to R2 under backups/db/YYYY-MM-DD-HHmm.sql.gz.
 *
 * This is a SECOND layer on top of Railway's native Postgres
 * backups — owning a copy outside Railway's infrastructure protects
 * against a Railway-wide incident or accidental account lock-out.
 *
 * Auth: Bearer CRON_SECRET. Railway cron service POSTs here nightly.
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

  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const key = `backups/db/${y}-${m}-${d}-${hh}${mm}.sql.gz`;

  const startedAt = Date.now();
  try {
    const body = await dumpToBuffer(databaseUrl);

    await r2Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: "application/gzip",
        ContentEncoding: "gzip",
        Metadata: {
          "dumped-at": now.toISOString(),
          "db-host": new URL(databaseUrl).hostname,
        },
      }),
    );

    const durationMs = Date.now() - startedAt;
    console.log(
      `[cron/db-backup] uploaded ${key} — ${body.length} bytes in ${durationMs}ms`,
    );

    return NextResponse.json({
      success: true,
      key,
      bytes: body.length,
      durationMs,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/db-backup] failed:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
});
