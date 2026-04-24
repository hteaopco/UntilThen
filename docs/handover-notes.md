# untilThen — Handover Notes
*Updated April 23, 2026 · Reference commit `56460e1` on `main`*

These notes catch a new session up fast. Pair with:
- `CLAUDE.md` — repo-level instructions (commit-to-main workflow, email sync rule)
- `docs/pre-launch-checklist.md` — what's done vs. open. Also viewable at **`/admin/checklist`** in the running app
- `docs/backup-restore.md` — DB backup/restore runbook
- `docs/email-dns-setup.md` — deliverability / DMARC status

## Where the last session left off

Billing + reveal polish session. Shipped full Square subscription lifecycle (subscribe / addon / remove / cancel / resume / switch / cancel-switch / update-card) with all the gotchas resolved — see "Square billing architecture" below. Shipped confirmation modals so state-changing clicks preview the cost before firing. Global top-bar navigation spinner on every in-app link click. Fixed iOS Safari audio (Web Audio API routing for ducking/fades) and an iPhone hydration bug on the Edit memory button.

End-of-session cleanup pass ran an audit subagent + image-usage grep:
- Codebase verdict was clean (no orphaned files, no dead routes, no unused exports, no unused deps).
- Deleted `/api/account/billing` placeholder route (hardcoded $3.99 values, uncalled).
- Deleted 20 unused images from `public/` — dir dropped 30M → 16M.
- Fixed one `react-hooks/exhaustive-deps` warning in `RevealSongsManager.tsx`.
- Refreshed a stale "Square SDK is a TODO" comment in `CapsuleOverview.tsx`.
- New `/admin/checklist` tab renders `docs/pre-launch-checklist.md` with proper GFM task-list checkboxes.

Remaining large files (not split — would be a deliberate refactor, not drive-by cleanup):
- `src/app/capsules/[id]/CapsuleOverview.tsx` — 1628 lines
- `src/components/account/BillingClient.tsx` — 1052 lines

---

## Stack at a glance

- **Framework:** Next.js 15.5 App Router (React 19, server components + client islands)
- **DB:** Prisma 5.22 → PostgreSQL on Railway (direct connection, not Accelerate)
- **Auth:** Clerk (`@clerk/nextjs` 5.7). Clerk hosted sign-in/up; `auth()` server-side
- **Payments:** Square Node SDK v44 in Production mode. Subscriptions + one-time charges
- **Storage:** Cloudflare R2 via S3-compatible AWS SDK. Bucket is private; short-lived signed GETs at render
- **Email:** Resend from `hello@untilthenapp.io` (DKIM/SPF/DMARC live, DMARC ramp May 5)
- **Analytics:** PostHog (client) + posthog-node for server events
- **Error monitoring:** Sentry Nextjs integration wired; live test still pending
- **Deploy:** Railway. Pushes to `main` auto-deploy. Nixpacks build with `postgresql_17` so `pg_dump` is available for the DB-backup cron

## Repo conventions

- **Always commit + push to `main`.** CLAUDE.md says no feature branches; Railway auto-deploys from `main`. If a session starts on a branch, rebase to `main` then push.
- **Empty commits fine** — sometimes needed to force Railway rebuilds: `git commit --allow-empty -m "..."`.
- **No Prisma upgrade** past 5.22 without an audit; 7.x is a major version jump.
- **Email templates sync rule:** any copy change in `src/lib/capsule-emails.ts`, `src/lib/emails.ts`, or inline email sends MUST be mirrored in:
  - `src/app/admin/emails/EmailTestClient.tsx` (TEMPLATES array)
  - `src/app/api/admin/test-emails/route.ts` (test-fire endpoint)
  Otherwise the admin UI and test emails drift from production.

## Square billing architecture

All subscription state lives in `Subscription` (one-per-user, linked via `userId`). Square ids tracked in three buckets:

| Field | Role |
|---|---|
| `squareSubId` | The active base subscription in Square |
| `addonSquareSubIds[]` | Separate addon subs (monthly plans only; annual uses merged template) |
| `pendingSquareSubId` | Queued sub for a scheduled plan switch |

### Endpoint map
| Route | What it does |
|---|---|
| `POST /api/payments/subscribe` | Create base sub + save card on file |
| `POST /api/payments/addon-capsule` | Monthly: prorated charge + separate sub. Annual: update base `priceOverrideMoney` |
| `POST /api/payments/remove-addon` | Cancel addon sub (monthly) or decrement base override (annual) |
| `POST /api/payments/cancel-subscription` | Cancel base + every addon + pending switch sub |
| `POST /api/payments/resume-subscription` | Fresh base (+ addons) starting at old `currentPeriodEnd` |
| `POST /api/payments/switch-plan` | Monthly → Annual (only direction supported) |
| `POST /api/payments/cancel-plan-switch` | Undo a scheduled monthly → annual before effective date |
| `POST /api/payments/update-card` | Atomic card swap across every linked sub with rollback |

### Square gotchas (learned the hard way)
1. **Order templates are one-active-sub only.** Reusing a stock template for multiple addon subs fails with `"The Order template must only be used in one subscription."` → every addon sub mints a fresh DRAFT template via `createAddonOrderTemplate` in `src/lib/square.ts`.
2. **`priceOverrideMoney` and `orderTemplateId` are mutually exclusive.** Annual-with-addons bakes the merged total into a custom template via `createSubscriptionOrderTemplate`.
3. **Idempotency keys cap at 45 chars.** All stable keys routed through `retryOnIdempotencyReuse` in `src/lib/square-idempotency.ts`. Retry appends a short timestamp suffix and clamps.
4. **Square has no "undo cancel" endpoint** for subscriptions, but there IS a `deleteAction` endpoint that removes scheduled actions (what `cancel-plan-switch` uses to re-enable a monthly cancel-at-period-end).
5. **Plan variations use RELATIVE pricing without a linked price source.** Every `subscriptions.create` needs `phases[].orderTemplateId` to carry the dollar amount.
6. **Annual addon pricing is merged, not prorated.** Square can't prorate annual subs, so addons stay free until annual renewal and then bill at $35.99 + $6 × addonCount. Product decision, documented in `src/app/api/payments/addon-capsule/route.ts`.

### Vault locks
- `Vault.isLocked` with a 90-day manual-toggle throttle per `lastLockToggleAt`.
- `reconcileVaultLocks(userId)` in `src/lib/vault-locks.ts` — called from every subscription state change to auto-lock any vaults above the paid slot count.

## Reveal experience

Route: `/reveal/[token]` → `RevealExperience` (the single client component that drives every preview surface too). Phase machine:

`Gate → Entry → Stories → Transition → Gallery`

### Key files
- `src/app/reveal/[token]/RevealExperience.tsx` — phase machine, music, analytics context
- `src/app/reveal/[token]/GalleryScreen.tsx` — post-reveal grid/list + filters + replay (635 lines, biggest reveal file)
- `src/app/reveal/[token]/StoryCards.tsx` — story card chrome (progress bar, mute, close)
- `src/app/reveal/[token]/{Photo,Letter,Voice}Card.tsx` — one per contribution type
- `src/app/reveal/[token]/GalleryCardView.tsx` — full-screen modal for tapping a gallery card
- `src/app/vault/[childId]/reveal/curator/CuratorClient.tsx` — Build-mode curator (user picks 5 highlight slides)

### iOS gotchas
- iOS Safari ignores `audioEl.volume` writes. Music MUST route through Web Audio API (`AudioContext` + `GainNode`) for ducking + fades to actually work. See `musicGainRef` in `RevealExperience.tsx`.
- Voice autoplay on first highlight slide needs `preload="auto"` + immediate `play()` + a `canplaythrough` retry listener. iOS blocks autoplay unless the gesture chain is intact.
- Some `<Link>` clicks don't fire on iPhone (hydration edge case). The Edit memory button was rebuilt as a client component using `router.push` (`src/app/vault/[childId]/entry/[entryId]/EntryDetailActions.tsx`).

### Reveal modes
- `Vault.revealMode`: `RANDOM` (default — first 5 entries chronologically) or `BUILD` (curator picks exactly 5 in `curatedSlides`).
- Admin uploads reveal music via `/admin/reveal-music`, stored in the `RevealSong` model. Users pick one per vault via `Vault.revealSongId`.

## Helpers worth knowing

- `src/lib/square.ts` — all Square constants, plan IDs, order-template IDs, `createAddonOrderTemplate` + `createSubscriptionOrderTemplate`
- `src/lib/square-idempotency.ts` — `retryOnIdempotencyReuse` + `freshKey` helpers
- `src/lib/addon-backfill.ts` — lazy backfill of `addonSquareSubIds[]` from Square API for legacy rows
- `src/lib/vault-locks.ts` — `reconcileVaultLocks` auto-lock helper
- `src/lib/proration.ts` — `calculateProration`, `nextFirstOfMonth`, `oneYearLater`, cent constants
- `src/lib/r2.ts` — signed PUT + GET, includes `PHOTOS_PER_YEAR_LIMIT`
- `src/lib/posthog-server.ts` — `captureServerEvent(userId, event, props)` (silent no-op if no env)
- `src/lib/capsule-emails.ts` + `src/lib/emails.ts` — every transactional email template (remember the sync rule)

## Where to find things

- **Dashboard:** `/dashboard` (`src/app/dashboard/page.tsx`)
- **Vault landing:** `/vault/[childId]` — Main Diary + collections. Entry detail at `/vault/[childId]/entry/[entryId]`
- **Gift capsules:** `/capsules/[id]` (overview), `/capsules/new` (5-step creation), `/contribute/capsule/[token]` (contributor)
- **Account:** `/account` (profile), `/account/billing` (subscription), `/account/capsules` (per-vault settings), `/account/notifications`
- **Admin:** `/admin/*` — gated by `ADMIN_PASSWORD` cookie. Tabs: Dashboard, Users, Moderation, Emails, Previews, Tones, QA, **Checklist** (renders `docs/pre-launch-checklist.md`), Settings (reset-subscription tool, order-template setup, reveal-music upload)

## Open blockers + watch items

Condensed from `docs/pre-launch-checklist.md` (also viewable at `/admin/checklist`).

**Still blocking launch:**
- PIN vault lock — re-enable or remove (one-line re-add in `dashboard/layout.tsx`)
- Backup restore drill into staging (after first cron produces a backup)

**Billing regression list (must exercise on prod):**
- Annual addon on an already-existing annual sub — `addon-capsule` uses `subscriptions.update` with `priceOverrideMoney`. If Square enforces the same "override vs template" rule on update that it does on create, this will break; we'd need to swap for a template replacement flow. **UNTESTED.**
- Full lifecycle: subscribe → addon → remove → update-card → switch → cancel-switch → cancel → resume

**Before soft launch:**
- ToS + Privacy Policy legal review (minors' data, long-term storage)
- Account recovery flows (forgot password, locked out, lost email)
- Media moderation strategy for contributor uploads
- Cron health monitoring (alert if fires fail)
- Sentry live test — trigger a real error in prod, verify the trace
- Reveal theme picker — currently a "Coming soon" placeholder

**Explicitly cut (don't re-add):**
- Polaroid photo stack on vault dashboard cards
- Cookie/consent banner
- Refund policy (all sales final, documented at checkout + ToS)
- Annual → Monthly downgrade path (annual runs its full term; switch at renewal)

**Hands-on QA:**
- Build-mode reveal end-to-end on iPhone
- Full reveal flow on iOS Safari + Android Chrome + desktop 1440+
- Mobile test pass on Create Collection modal + Updates inbox done this session

## Environment variables (high-signal set)

- `DATABASE_URL` — Postgres
- `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_*`
- `SQUARE_ACCESS_TOKEN`, `SQUARE_APPLICATION_ID`, `SQUARE_LOCATION_ID`, `NEXT_PUBLIC_SQUARE_*`
- `SQUARE_ORDER_TEMPLATE_{MONTHLY,ANNUAL}_BASE` — stock templates. ADDON templates are runtime-minted, no env needed
- `SQUARE_WEBHOOK_SIGNATURE_KEY`, `SQUARE_WEBHOOK_URL`
- `R2_*` — account id, bucket, access key, secret, public URL
- `RESEND_API_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY`, `POSTHOG_PROJECT_API_KEY`
- `NEXT_PUBLIC_SENTRY_DSN`
- `ADMIN_PASSWORD`
- `NEXT_PUBLIC_REVEAL_MUSIC_URL` — fallback if no per-vault song picked
- `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL`
- `NODE_OPTIONS=--max-http-header-size=65536` — set in `railway.json` + `nixpacks.toml`, do not remove (fixes Clerk JWKS HPE_HEADER_OVERFLOW)

## Running locally

```bash
npm install
npx prisma generate
npm run dev  # http://localhost:3000
```

Tests: `npm run test` (Vitest, minimal coverage — `tests/capsule-landing-data.test.ts` is the only real suite today).

E2E smoke tests: `npm run test:e2e` (Playwright, `./e2e/`). Covers unauthenticated public surfaces: landing / sign-in / help-recovery / invalid-reveal-token / ToS. First-time setup on a new machine needs `npx playwright install --with-deps chromium`. Boots the dev server automatically; point `PLAYWRIGHT_BASE_URL=https://untilthenapp.io` to run against prod without spinning one up. Not wired to CI yet — run locally before risky pushes.

Lint: `npm run lint`. Type-check: `npx tsc --noEmit`.

## Conventions picked up over the last few sessions

- Prefer shared helpers over inline duplication (e.g. `retryOnIdempotencyReuse` not per-file try/catch).
- Short idempotency key stems — `{prefix}-{userId}` or `{prefix}-{userId}-{index}`. Leave headroom for the helper's retry suffix under the 45-char Square cap.
- BillingErrorModal pattern: centered floating dialog with ESC + backdrop dismiss. Use for every billing-flow error instead of inline red text.
- Confirmation modals for anything that charges a card or cancels scheduled billing (upgrade, cancel-switch, delete).
- Every billing state-change endpoint calls `reconcileVaultLocks` so over-quota vaults can't linger unlocked.
- All Square SDK calls that could idempotency-conflict go through `retryOnIdempotencyReuse`.

## If something breaks in production

1. Check Railway deploy logs first — every endpoint logs `[namespace/route]` errors with Square error codes.
2. Square webhook endpoint is `/api/webhooks/square`. Most promotion logic (pending → current on sub.updated ACTIVE) fires from here.
3. `subscription a… not found locally yet — skipping` logs mean the webhook fired before the DB write completed. Usually self-heals on the next event.
4. If a user's billing gets stuck, `/admin/settings → Reset subscription` is the clean-slate hammer.
