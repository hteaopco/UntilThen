#!/usr/bin/env node
/**
 * Restore a Postgres database from a backup stored in R2.
 *
 * Usage:
 *   # List recent backups
 *   npx tsx scripts/restore-db.ts --list
 *
 *   # Restore a specific backup into TARGET_DATABASE_URL
 *   TARGET_DATABASE_URL=postgres://user:pass@host:5432/staging \
 *     npx tsx scripts/restore-db.ts backups/db/2026-04-21-0300.sql.gz
 *
 * Requires:
 *   - psql + gunzip on PATH
 *   - R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY env
 *   - R2_BUCKET_NAME env (defaults to "untilthen-media")
 *   - TARGET_DATABASE_URL env for the --restore path
 *
 * NEVER restore into production without an additional backup of
 * the current prod DB first. The intended target is a staging /
 * preview database. The script will refuse to run against a URL
 * whose hostname matches the one that produced the backup unless
 * --force is passed.
 */
import { spawn } from "node:child_process";
import { Readable } from "node:stream";

import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

function r2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error(
      "R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY must be set.",
    );
    process.exit(1);
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

const BUCKET = process.env.R2_BUCKET_NAME ?? "untilthen-media";

async function listBackups(): Promise<void> {
  const client = r2Client();
  const res = await client.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: "backups/db/",
      MaxKeys: 50,
    }),
  );
  const items = (res.Contents ?? [])
    .sort((a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0));
  if (items.length === 0) {
    console.log("No backups found under backups/db/");
    return;
  }
  console.log(`Found ${items.length} backup(s):\n`);
  for (const item of items) {
    const sizeMb = ((item.Size ?? 0) / (1024 * 1024)).toFixed(2);
    console.log(`  ${item.Key}  (${sizeMb} MB, ${item.LastModified?.toISOString()})`);
  }
}

async function restore(key: string, force: boolean): Promise<void> {
  const targetUrl = process.env.TARGET_DATABASE_URL;
  if (!targetUrl) {
    console.error("TARGET_DATABASE_URL must be set to the DB you want to restore into.");
    process.exit(1);
  }

  const targetHost = new URL(targetUrl).hostname;
  const client = r2Client();

  console.log(`Fetching ${key} from R2...`);
  const obj = await client.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
  );
  if (!obj.Body) {
    console.error("Empty response body from R2.");
    process.exit(1);
  }

  const dumpedHost = obj.Metadata?.["db-host"];
  if (dumpedHost && dumpedHost === targetHost && !force) {
    console.error(
      `\nRefusing to restore: backup originated on ${dumpedHost}\n` +
        `and TARGET_DATABASE_URL resolves to the same host. Pass --force\n` +
        `if you really mean to overwrite that database.`,
    );
    process.exit(2);
  }

  console.log(
    `Restoring into ${targetHost} ` +
      `(dumped from ${dumpedHost ?? "unknown"}, bytes: ${obj.ContentLength ?? "?"})`,
  );

  // Stream R2 -> gunzip -> psql. psql reads SQL from stdin.
  const gunzip = spawn("gunzip", ["-c"], { stdio: ["pipe", "pipe", "inherit"] });
  const psql = spawn(
    "psql",
    ["-v", "ON_ERROR_STOP=1", "--single-transaction", targetUrl],
    { stdio: ["pipe", "inherit", "inherit"] },
  );

  (obj.Body as Readable).pipe(gunzip.stdin);
  gunzip.stdout.pipe(psql.stdin);

  const [gunzipCode, psqlCode] = await Promise.all([
    new Promise<number>((res) => gunzip.on("close", res)),
    new Promise<number>((res) => psql.on("close", res)),
  ]);

  if (gunzipCode !== 0 || psqlCode !== 0) {
    console.error(`\nRestore failed — gunzip=${gunzipCode} psql=${psqlCode}`);
    process.exit(psqlCode || gunzipCode || 1);
  }
  console.log("\nRestore complete.");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--list")) {
    await listBackups();
    return;
  }

  const force = args.includes("--force");
  const key = args.find((a) => !a.startsWith("--"));
  if (!key) {
    console.error(
      "Usage:\n  restore-db --list\n  restore-db <r2-key> [--force]\n",
    );
    process.exit(1);
  }
  await restore(key, force);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
