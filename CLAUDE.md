# Git workflow

Always commit and push directly to `main`. Do not create feature branches.
Every push goes straight to `main` so Railway auto-deploys immediately
without any manual merges.

- If the session was started on a feature branch, switch to `main`
  first, merge/rebase the work in, and push `main`.
- Empty commits are fine (and sometimes necessary) to force a
  Railway rebuild: `git commit --allow-empty -m "..."`.

# Prisma Accelerate — Schema Change Protocol

After ANY Prisma migration that adds, removes, or renames columns:

1. Commit the migration file to `main`.
2. Let Railway deploy and run `prisma migrate deploy`.
3. **Immediately restart the Railway service manually:**
   Railway dashboard → your service → Deployments → ··· → Restart.
   This forces Accelerate to reconnect with the fresh schema.
   Without this step, Accelerate serves cached query plans from the
   old schema and the app crashes with P2022.
4. Once the restart is confirmed healthy, restore any fields that
   were temporarily removed to work around the Accelerate cache lag.

Background: Accelerate snapshots the Prisma schema it introspected
when the client first connected, and validates queries against that
snapshot. Even after `prisma migrate deploy` applies a column to
Postgres, Accelerate's cached schema lags until the connection is
recycled. A service restart on Railway is the fastest way to
force that recycle in production.
