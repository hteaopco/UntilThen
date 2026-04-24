import { spawn } from "node:child_process";
import { PassThrough } from "node:stream";
import { createGzip } from "node:zlib";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { NextResponse } from "next/server";

import { cronRoute } from "@/lib/cron-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hard overall deadline. Railway's edge proxy times out eventually;
// if pg_dump hangs we want a clean error response well before that,
// not a 502 from a killed handler.
const OVERALL_TIMEOUT_MS = 10 * 60 * 1000;

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

/**
 * Stream pg_dump → gzip → multipart upload to R2 without ever
 * materialising the full dump in memory. Previous implementation
 * collected chunks into a Buffer and called Buffer.concat at the
 * end, which OOM'd the web container mid-cron and returned 502
 * instead of a clean 500.
 */
async function streamDumpToR2(params: {
  databaseUrl: string;
  bucket: string;
  key: string;
  now: Date;
}): Promise<{ bytes: number }> {
  const { databaseUrl, bucket, key, now } = params;

  const pg = spawn(
    "pg_dump",
    ["--no-owner", "--no-privileges", "--clean", "--if-exists", databaseUrl],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let pgStderr = "";
  pg.stderr.on("data", (d: Buffer) => {
    pgStderr += d.toString();
    // Cap stderr capture so a chatty warning storm doesn't balloon
    // memory. 8KB is plenty for any real error trace.
    if (pgStderr.length > 8192) pgStderr = pgStderr.slice(-8192);
  });

  const gzip = createGzip({ level: 6 });
  const body = new PassThrough();

  // Byte counter — observational; we don't cap. If the dump is
  // huge that's a separate problem to deal with, but we no longer
  // fail the upload just because it crossed an arbitrary ceiling.
  let uploadedBytes = 0;
  body.on("data", (d: Buffer) => {
    uploadedBytes += d.length;
  });

  // Wire the pipeline. Errors on any stage need to propagate to
  // the upload's body so lib-storage aborts the multipart cleanly.
  pg.stdout.on("error", (err) => body.destroy(err));
  gzip.on("error", (err) => body.destroy(err));
  pg.stdout.pipe(gzip).pipe(body);

  pg.on("error", (err) => {
    body.destroy(
      new Error(
        `pg_dump spawn error: ${err.message}. PATH=${process.env.PATH}`,
      ),
    );
  });
  pg.on("close", (code) => {
    if (code !== 0) {
      body.destroy(
        new Error(`pg_dump exited ${code}: ${pgStderr.slice(0, 2000)}`),
      );
    }
    // On code === 0, gzip + body finish naturally when pg.stdout closes.
  });

  const upload = new Upload({
    client: r2Client(),
    params: {
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "application/gzip",
      ContentEncoding: "gzip",
      Metadata: {
        "dumped-at": now.toISOString(),
        "db-host": new URL(databaseUrl).hostname,
      },
    },
    queueSize: 2,
    partSize: 16 * 1024 * 1024,
  });

  upload.on("httpUploadProgress", (p) => {
    if (p.loaded) {
      console.log(
        `[cron/db-backup] upload progress: ${p.loaded} bytes, part ${p.part ?? "?"}`,
      );
    }
  });

  await Promise.race([
    upload.done(),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("db-backup overall timeout")),
        OVERALL_TIMEOUT_MS,
      ),
    ),
  ]);

  return { bytes: uploadedBytes };
}

/**
 * Nightly DB backup. pg_dump against DATABASE_URL, gzipped and
 * streamed to R2 at backups/db/YYYY-MM-DD-HHmm.sql.gz.
 *
 * Second layer on top of Railway's native Postgres backups —
 * owning a copy outside Railway's infrastructure protects against
 * a Railway-wide incident or accidental account lock-out.
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

  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const key = `backups/db/${y}-${m}-${d}-${hh}${mm}.sql.gz`;

  console.log(`[cron/db-backup] starting → ${bucket}/${key}`);
  const startedAt = Date.now();

  try {
    const { bytes } = await streamDumpToR2({ databaseUrl, bucket, key, now });
    const durationMs = Date.now() - startedAt;
    console.log(
      `[cron/db-backup] uploaded ${key} — ${bytes} bytes in ${durationMs}ms`,
    );
    return NextResponse.json({ success: true, key, bytes, durationMs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/db-backup] failed:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
});
