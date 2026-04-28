# CLAUDE.md

## Project

untilThen is a time-capsule platform with two products: **Time Capsules**
(parents write letters, photos, voice notes for their child, sealed until a
milestone like the 18th birthday — $4.99/mo subscription) and **Gift Capsules**
(occasion gifts where contributors crowd-write a sealed surprise that opens on
reveal day — $9.99 one-time, or free for enterprise org members). Live at
[untilthenapp.io](https://untilthenapp.io).

## Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind 3
- **Auth:** Clerk (`@clerk/nextjs`)
- **DB:** PostgreSQL on Railway, Prisma 5.22 (direct connection, no Accelerate)
- **Media:** Cloudflare R2 via `@aws-sdk/client-s3`, signed URLs
- **Email:** Resend (`@/lib/emails.ts` + `@/lib/capsule-emails.ts`)
- **Payments:** Square SDK
- **SMS:** Twilio (A2P 10DLC, campaign pending)
- **Rate-limit:** Upstash Redis
- **Analytics:** PostHog server + browser
- **Errors:** Sentry (`@sentry/nextjs`)
- **Deploy:** Railway (auto-deploys on every push to `main`)

## Commands

- Build: `npm run build`
- Dev: `npm run dev`
- Test single file: `npm test -- path/to/file`
- Lint + fix: `npm run lint:fix`
- Type check: `npx tsc --noEmit`

## Architecture

- `src/app/` — Next.js App Router pages + API routes
  - `api/` — server endpoints (capsules, reveal, orgs, webhooks, cron)
  - `dashboard/`, `vault/`, `account/` — Time Capsule (Vault) surfaces
  - `capsules/`, `reveal/` — Gift Capsule organiser + recipient surfaces
  - `enterprise/` — org admin dashboard, roster, stat board
  - `weddings/`, `wedding/` — wedding capsule landing + guest contribution
  - `admin/` — internal staff console
- `src/components/` — React components, grouped by surface
- `src/lib/` — shared helpers (prisma client, capsules, orgs, emails, square, r2, paywall, sms)
- `prisma/schema.prisma` — single source of truth for the data model
- `docs/` — long-form notes (glossary, handover-notes, roadmap, etc.)

## Rules

- **IMPORTANT: run `npx tsc --noEmit` after every code change before pushing.** Railway runs the same check; catching errors locally saves the round-trip.
- **Commit + push directly to `main`.** No feature branches. Every push auto-deploys via Railway. If you started on a branch, switch to `main`, merge, then push.
- **Email template sync:** when you change copy in `src/lib/capsule-emails.ts`, `src/lib/emails.ts`, or inline in API routes, also update `src/app/admin/emails/EmailTestClient.tsx` (TEMPLATES array) AND `src/app/api/admin/test-emails/route.ts`. Three places, every time.
- **Enterprise gift capsules auto-activate at creation.** `organizationId !== null` capsules skip the paywall and stamp `status: ACTIVE` + `isPaid: true` in `POST /api/capsules`. Don't reintroduce the deleted `sendCapsuleActivated` email; the dashboard already shows live state. Treat `isDraft` as the cold path for org-attributed capsules.
- **Auth bounce-back uses `?redirect_url=`.** `/sign-up`, `/sign-in`, `/onboarding` all honour relative `redirect_url` query params. Prefer this over localStorage stashes when a flow needs to send a user through auth and back.
- **Use the canonical names in user-facing copy** (see Nomenclature). Code uses legacy Prisma names; copy must not.
- Make minimal changes. Don't refactor unrelated code.
- When unsure between two approaches, present both and let the user pick.

## Workflow

- Run `npm install` at session start; `npx tsc --noEmit` before every push.
- Read `docs/handover-notes.md` when working in unfamiliar territory — it captures the architectural decisions that don't fit in this file.
- Keep commits focused. One logical change per commit; descriptive messages explaining the *why*.
- Empty commits are fine to force a Railway rebuild: `git commit --allow-empty -m "..."`.

## Nomenclature

Canonical glossary lives at `docs/glossary.md`. Read it before writing
user-facing copy. The short version:

- **Vault** — top-level container. One per user.
- **Time Capsule** — long-form sealed container inside the Vault. Many per Vault. May be for a child, but doesn't have to be.
- **Collection** — optional grouping inside a Time Capsule.
- **Entry** / **Memory** — single letter / photo / voice / video.
- **Gift Capsule** — separate product. Standalone occasion gift, not part of the Vault.

Do **not** say "child's vault", "the child's memory capsule", or "vault for [name]"
in user-facing copy. Say "Time Capsule".

Code lags copy by design: Prisma `Vault` model === a single Time Capsule,
Prisma `Child` model === the Time Capsule's subject, Prisma `MemoryCapsule`
model === Gift Capsule. The code rename is a future Pass 2; until then, copy
and code nomenclature diverge and that's expected.

## Out of scope

- `prisma/migrations/` — never hand-edit applied migrations. Generate new ones via `prisma migrate dev` / `prisma migrate deploy`.
- `node_modules/`, `.next/` — generated. Don't commit or hand-edit.
- Railway environment variables — managed through the Railway dashboard, not the repo. Don't paste secrets into code.
- Cron Railway services — provisioned in Railway, not in the repo.
- Square Subscription Plan IDs — hardcoded in `src/lib/square.ts`; treat as immutable unless you're explicitly changing the pricing model.
