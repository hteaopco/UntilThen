# Backup & Restore — untilThen

untilThen's promise is "for life." Data loss is a broken promise, so we
run a layered backup strategy:

1. **Railway native Postgres backups** — point-in-time recovery
   managed by Railway. First line of defense.
2. **Nightly pg_dump to R2** — owned by us, sits outside Railway so
   a Railway-wide incident (or an accidental account lockout)
   doesn't take the product off the map.
3. **R2 object versioning** — protects uploaded media from
   accidental deletes / overwrites.

---

## 1. Railway native backups

Needs to be enabled once in the Railway dashboard.

**Steps (user):**

1. Railway dashboard → Postgres service → **Backups** tab
2. Toggle **Automated backups** ON
3. Retention: 30 days (or the max available on the current plan)
4. Save

To restore: Railway dashboard → Backups → pick a point → restore.
Railway spins up a new Postgres, gives you a new `DATABASE_URL`.

---

## 2. Nightly pg_dump → R2

Implemented in `src/app/api/cron/db-backup/route.ts`. The endpoint
runs `pg_dump --no-owner --no-privileges --clean --if-exists`,
gzips the output, and uploads to R2 under
`backups/db/YYYY-MM-DD-HHmm.sql.gz` (UTC).

### Set up the Railway cron service

1. Railway dashboard → **+ New** → **Cron Job**
2. Schedule: `0 7 * * *` (03:00 ET / 07:00 UTC — quiet traffic hour)
3. Command:
   ```sh
   curl -fsS -X POST \
     -H "Authorization: Bearer $CRON_SECRET" \
     "$APP_URL/api/cron/db-backup"
   ```
4. Env vars on the cron service: `APP_URL` (e.g. `https://untilthenapp.io`),
   `CRON_SECRET` (match the value already set on the main service).

### Retention

Lifecycle rule in R2 keeps the bucket from growing forever:

1. Cloudflare dashboard → R2 → `untilthen-media` → **Settings** →
   **Object lifecycle rules** → **Add rule**
2. Prefix: `backups/db/`
3. Action: **Expire objects after 30 days**
4. Save

### Manual backup

Trigger on demand from anywhere with `CRON_SECRET`:

```sh
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://untilthenapp.io/api/cron/db-backup
```

Response includes the R2 key, byte count, and duration.

---

## 3. R2 media versioning

Media (letters, photos, voice, video) lives in the `untilthen-media`
R2 bucket. A one-time toggle makes sure deleted/overwritten objects
are recoverable.

**Steps (user):**

1. Cloudflare dashboard → R2 → `untilthen-media` → **Settings**
2. **Object versioning** → Enable
3. Add a lifecycle rule:
   - Prefix: `` (blank = entire bucket)
   - Action: **Delete non-current versions after 30 days**
4. Save

Current object keys stay stable. Previous versions are reachable via
the Cloudflare dashboard or the S3 `ListObjectVersions` API.

---

## Restore runbook

All restores go into a **staging** database first. Never into prod.
If a prod restore is actually needed, take a fresh dump of the
broken prod DB first so forensic analysis is still possible.

### 1. List available backups

```sh
npx tsx scripts/restore-db.ts --list
```

### 2. Provision a staging Postgres

In Railway: create a new Postgres service (or use a preview env).
Copy its `DATABASE_URL`.

### 3. Restore

```sh
TARGET_DATABASE_URL="postgres://user:pass@staging-host:5432/railway" \
  npx tsx scripts/restore-db.ts backups/db/2026-04-21-0300.sql.gz
```

The script refuses to run when `TARGET_DATABASE_URL` resolves to the
same host the dump came from. Pass `--force` to override (you almost
certainly don't want to).

### 4. Verify

Connect to staging and spot-check:

```sh
psql "$TARGET_DATABASE_URL" -c "\dt"
psql "$TARGET_DATABASE_URL" -c "SELECT COUNT(*) FROM \"User\";"
psql "$TARGET_DATABASE_URL" -c "SELECT COUNT(*) FROM \"Entry\";"
psql "$TARGET_DATABASE_URL" -c "SELECT COUNT(*) FROM \"MemoryCapsule\";"
```

### 5. Swap DATABASE_URL (only if restoring to prod)

Update the main Railway service env → redeploy → smoke-test.

---

## Pre-launch drill

Before removing the blocker from `pre-launch-checklist.md`:

- [ ] Trigger `/api/cron/db-backup` manually; confirm the R2 key
      exists and the file is valid gzipped SQL
- [ ] Provision a staging Postgres
- [ ] Run `scripts/restore-db.ts` against staging
- [ ] Verify row counts match prod within the time window
- [ ] Pick one real capsule, query it in staging, confirm
      contributions + media keys are intact
- [ ] Confirm the Railway cron service is scheduled and has
      completed at least one successful run

---

## Known limitations

- The backup endpoint buffers the compressed dump in memory before
  uploading. If the DB grows past ~500 MB compressed, switch to
  `@aws-sdk/lib-storage`'s `Upload` class for streaming multipart.
  The route already refuses to silently truncate past that ceiling.
- `pg_dump` captures DB state only. Media in R2 is backed up by R2
  versioning, not bundled into the SQL dump. Full disaster recovery
  restores both.
