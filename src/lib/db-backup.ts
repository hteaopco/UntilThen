import { spawn } from "node:child_process";
import { PassThrough } from "node:stream";
import { createGzip } from "node:zlib";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

// Hard overall deadline. Railway's edge proxy eventually times out;
// if pg_dump hangs we want a clean error well before that, not a 502.
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

export function backupKeyForNow(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  return `backups/db/${y}-${m}-${d}-${hh}${mm}.sql.gz`;
}

export type BackupResult = { bytes: number; durationMs: number; key: string };

/**
 * Stream pg_dump → gzip → multipart upload to R2. Never materialises
 * the full dump in memory. Peak memory is O(partSize × queueSize),
 * so ~32MB regardless of DB size.
 */
export async function streamDumpToR2(opts: {
  databaseUrl: string;
  bucket: string;
  key: string;
  now?: Date;
}): Promise<BackupResult> {
  const { databaseUrl, bucket, key } = opts;
  const now = opts.now ?? new Date();
  const startedAt = Date.now();

  const pg = spawn(
    "pg_dump",
    ["--no-owner", "--no-privileges", "--clean", "--if-exists", databaseUrl],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  let pgStderr = "";
  pg.stderr.on("data", (d: Buffer) => {
    pgStderr += d.toString();
    if (pgStderr.length > 8192) pgStderr = pgStderr.slice(-8192);
  });

  const gzip = createGzip({ level: 6 });
  const body = new PassThrough();

  let uploadedBytes = 0;
  body.on("data", (d: Buffer) => {
    uploadedBytes += d.length;
  });

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
        `[db-backup] upload progress: ${p.loaded} bytes, part ${p.part ?? "?"}`,
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

  return {
    bytes: uploadedBytes,
    durationMs: Date.now() - startedAt,
    key,
  };
}
