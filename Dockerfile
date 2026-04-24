# Multi-stage build for Railway. Replaces the Nixpacks builder —
# Nixpacks' BuildKit cache-mount behavior made it impossible to prune
# dev deps out of the runtime layer. With an explicit Dockerfile we
# fully control what lands in the runtime image: builder installs,
# generates, builds, AND prunes; runtime just copies the final tree.

# ── BUILDER ───────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# openssl for Prisma's engine binary on Debian.
# ca-certificates for HTTPS (npm registry, Sentry source-map upload).
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files AND prisma/ before npm ci so the postinstall
# hook (`rm -rf node_modules/.prisma && prisma generate`) can find
# the schema. Schema + migrations change rarely so cache invalidation
# is acceptable.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# Source tree
COPY . .

# Regenerate Prisma client with a clean env so any PRISMA_* var in
# the build environment can't force --no-engine mode (which would
# break `npx prisma migrate deploy` at runtime).
RUN set -e \
 && unset PRISMA_GENERATE_DATAPROXY PRISMA_GENERATE_NO_ENGINE PRISMA_CLIENT_DATA_PROXY_CLIENT_VERSION PRISMA_ACCELERATE_URL \
 && rm -rf node_modules/.prisma \
 && npx prisma generate \
 && if ! grep -q '"copyEngine": true' node_modules/.prisma/client/index.js; then \
      echo "ERROR: Prisma client generated with --no-engine"; exit 1; \
    fi

RUN npm run build

# Prune dev deps from node_modules BEFORE the runtime stage copies
# it. Since the builder stage is discarded at image export, and only
# files we explicitly COPY into runtime are kept, the builder's
# earlier "full" node_modules never touches the final image.
RUN npm prune --omit=dev --no-audit --no-fund


# ── RUNTIME ───────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# System packages:
#   openssl         - Prisma engine binary
#   ca-certificates - HTTPS trust store
#   curl            - some Railway / runtime tooling expects it;
#                     also handy for diagnostic shells
#   pg_dump 18      - /api/cron/db-backup (Railway PG is v18)
# gnupg + lsb-release are only needed to add the PGDG apt repo;
# purge them afterwards to avoid bloat.
RUN apt-get update && apt-get install -y --no-install-recommends \
      openssl ca-certificates curl gnupg lsb-release \
 && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
      | gpg --dearmor -o /etc/apt/trusted.gpg.d/pgdg.gpg \
 && echo "deb [signed-by=/etc/apt/trusted.gpg.d/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends postgresql-client-18 \
 && apt-get purge -y --auto-remove gnupg lsb-release \
 && rm -rf /var/lib/apt/lists/* \
 && pg_dump --version

# Bring over the built app from builder. node_modules is already
# pruned (builder ran `npm prune --omit=dev`) and has the Prisma
# engine binaries downloaded by @prisma/engines' postinstall.
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./

EXPOSE 8080

# NODE_OPTIONS bumps the HTTP parser's max header size to 64KB so the
# Clerk frontend-API proxy rewrites (/clerk_*) don't crash Node when
# Clerk's combined session + JWT cookies exceed the default 16KB.
#
# `timeout 45 prisma migrate deploy` — wait up to 45s for an advisory
# lock held by a shutting-down old container, then fall through so
# Next can start regardless (pending migrations get applied on the
# next deploy).
CMD ["bash", "-c", "set -o pipefail; exec 2>&1; printf '[start %s] stage=container-up port=%s\\n' \"$(date -u +%FT%TZ)\" \"${PORT:-3000}\"; printf '[start %s] stage=migrate-begin\\n' \"$(date -u +%FT%TZ)\"; timeout 45 npx prisma migrate deploy; mig=$?; printf '[start %s] stage=migrate-end exit=%s\\n' \"$(date -u +%FT%TZ)\" \"$mig\"; export NODE_OPTIONS='--max-http-header-size=65536'; printf '[start %s] stage=next-start port=%s node_options=%s\\n' \"$(date -u +%FT%TZ)\" \"${PORT:-3000}\" \"$NODE_OPTIONS\"; exec npx next start -H 0.0.0.0 -p \"${PORT:-3000}\""]
