# Multi-stage build for Railway. Replaces the Nixpacks builder — Nixpacks'
# BuildKit cache-mount behavior made it impossible to prune dev deps out
# of the runtime layer without fighting EBUSY on node_modules/.cache. With
# an explicit Dockerfile we fully control what lands in the runtime image:
# builder stage installs everything + builds, runtime stage starts from a
# fresh slim base and copies only what it needs.

# ── BUILDER ───────────────────────────────────────────────────────────
# All deps installed (dev + prod), prisma generate, next build.
# This stage is discarded at the end; only its outputs are copied into
# the runtime stage below.
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# openssl is required by Prisma's engine binary on Debian-based nodes.
# ca-certificates keeps HTTPS working for the Sentry source-map upload.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy only package.json + package-lock.json first so the install layer
# caches — invalidates only when dependencies change, not on every edit.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Now copy the rest of the source tree and build.
COPY . .

# Generate Prisma client. Unset any PRISMA_* env that could force
# --no-engine and break `npx prisma migrate deploy` at runtime.
RUN set -e \
 && unset PRISMA_GENERATE_DATAPROXY PRISMA_GENERATE_NO_ENGINE PRISMA_CLIENT_DATA_PROXY_CLIENT_VERSION PRISMA_ACCELERATE_URL \
 && rm -rf node_modules/.prisma \
 && npx prisma generate \
 && if ! grep -q '"copyEngine": true' node_modules/.prisma/client/index.js; then \
      echo "ERROR: Prisma client generated with --no-engine"; exit 1; \
    fi

RUN npm run build


# ── RUNTIME ───────────────────────────────────────────────────────────
# Fresh slim base. Installs only prod deps + pg_dump 18, then copies
# build output from the builder. No dev deps, no build tools, no cache.
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# System packages:
#   openssl         - Prisma engine
#   ca-certificates - HTTPS
#   pg_dump 18      - /api/cron/db-backup (Railway PG is v18, older
#                     clients refuse to dump it)
# gnupg/curl/lsb-release are needed transiently for the PGDG repo
# setup; we purge them before the layer is finalised to keep the
# runtime image smaller.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates curl gnupg lsb-release \
 && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
      | gpg --dearmor -o /etc/apt/trusted.gpg.d/pgdg.gpg \
 && echo "deb [signed-by=/etc/apt/trusted.gpg.d/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends postgresql-client-18 \
 && apt-get purge -y --auto-remove curl gnupg lsb-release \
 && rm -rf /var/lib/apt/lists/* \
 && pg_dump --version

# Prod deps only. --ignore-scripts skips the postinstall prisma generate —
# we copy the already-generated client from the builder stage below,
# avoiding a second prisma generate run (and its disk usage).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

# Bring over what's actually needed at runtime from the builder:
#   .next                - compiled server + client bundles + server chunks
#   public               - static assets
#   prisma               - schema.prisma + migrations/ for migrate deploy
#   node_modules/.prisma - generated Prisma client. We skipped postinstall
#                          in the runtime npm ci (--ignore-scripts), so
#                          without this COPY the client is absent.
# The prisma CLI itself doesn't need copying: it's a runtime dependency
# (moved from devDeps to deps in package.json), so `npm ci --omit=dev`
# above installs it and creates the .bin/prisma symlink naturally.
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Next reads next.config.ts at server startup (rewrites, headers,
# runtime flags). The sentry.*.config.ts files are dynamic-imported
# from src/instrumentation.ts which gets compiled into .next by the
# Sentry webpack plugin, so they are NOT needed at runtime.
COPY --from=builder /app/next.config.ts ./

EXPOSE 8080

# NODE_OPTIONS bumps the HTTP parser's max header size to 64KB so the
# Clerk frontend-API proxy rewrites (/clerk_*) don't crash Node when
# Clerk's combined session + JWT cookies exceed the default 16KB.
#
# `timeout 45 prisma migrate deploy` — wait up to 45s for an advisory
# lock held by a shutting-down old container, then fall through so Next
# can start regardless (pending migrations get applied on the next deploy).
CMD ["bash", "-c", "set -o pipefail; exec 2>&1; printf '[start %s] stage=container-up port=%s\\n' \"$(date -u +%FT%TZ)\" \"${PORT:-3000}\"; printf '[start %s] stage=migrate-begin\\n' \"$(date -u +%FT%TZ)\"; timeout 45 npx prisma migrate deploy; mig=$?; printf '[start %s] stage=migrate-end exit=%s\\n' \"$(date -u +%FT%TZ)\" \"$mig\"; export NODE_OPTIONS='--max-http-header-size=65536'; printf '[start %s] stage=next-start port=%s node_options=%s\\n' \"$(date -u +%FT%TZ)\" \"${PORT:-3000}\" \"$NODE_OPTIONS\"; exec npx next start -H 0.0.0.0 -p \"${PORT:-3000}\""]
