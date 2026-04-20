# Dashboard2 Redesign — Status & Handoff

Snapshot of where the `/dashboard2` redesign stands so the next session can
pick up without scrollback.

## Architectural decisions (locked in)

- **Path A**: "Milestone capsules" are `Collection` rows on an existing
  `Vault`. No new top-level model. Two tiny additive columns will land in
  Phase 2: `Vault.coverUrl` and `Collection.coverUrl`. No data migration.
- **Build as `/dashboard2`** side-by-side with existing `/dashboard` while we
  iterate. Cutover later is a file rename + delete.
- **Capsule landing page** will mirror at `/account/capsules/[childId]/v2`
  (not built yet).
- **Font**: Alex Brush for the greeting (holds up better than Pinyon at
  mobile sizes).
- **Stock images**: user will furnish after seeing the layout. Phase 1 ships
  with warm-tone gradient placeholders.
- **Cover upload flow** (Phase 2): `react-easy-crop` for pan/zoom/scale at a
  locked 4:3 aspect, then upload to R2 via existing `/api/upload/sign`.
- **"Updates" chip source**: updates from *gift capsules* that need
  approval, and messages left on capsules. (Current placeholder query is
  broader — see "Known gaps".)

## Image spec (for when assets arrive)

| Usage | Aspect | Size | Notes |
|---|---|---|---|
| Vault hero on capsule landing | 4:3 | 1600×1200 | Also cropped to 1:1 for dashboard card |
| Dashboard vault card | 1:1 | 800×800 | Cropped from hero via object-cover |
| Collection / milestone cover | 4:3 | 1200×900 | On capsule landing list |
| Gift Capsule card hero | 4:3 | 1200×900 | Dashboard creating + given rows |
| Letter illustration (footer) | transparent PNG | ~600×400 | Decorative only |

## What's shipped

All pushed to `main`. Live on Railway.

### Commit `29a7b07` — Scaffold `/dashboard2`
- `next/font/google` loading **Alex Brush** with `font-brush` utility.
- New route `/dashboard2/page.tsx` with greeting + tagline + "↔ Compare to
  old dashboard" link back to `/dashboard`.

### Commit `323ec13` — Two missing cron routes
- `src/app/api/cron/capsule-draft-expiry/route.ts` — finds DRAFT capsules
  created 6–7 days ago and sends "expires tomorrow" email. Once per draft.
- `src/app/api/cron/capsule-contributor-reminder/route.ts` — finds ACTIVE
  capsules whose `contributorDeadline` is ~48h out (±12h) and emails
  non-REVOKED invites that haven't submitted. Once per capsule.
- **Railway cron config** (user still needs to create these services):
  - Cron #1: `curl -X POST https://untilthenapp.io/api/cron/capsule-draft-expiry -H "Authorization: Bearer $CRON_SECRET"` · `0 9 * * *`
  - Cron #2: `curl -X POST https://untilthenapp.io/api/cron/capsule-contributor-reminder -H "Authorization: Bearer $CRON_SECRET"` · `0 9 * * *`
  - Both need `CRON_SECRET` set (same value as existing cron services).

### Commit `9dc9109` — Chip cards + mobile tab bar
- `src/components/dashboard2/DashboardGreeting.tsx` — greeting + tagline on
  the left, two chip cards on the right (Updates with badge count, Gift
  Capsules).
- `src/components/dashboard2/MobileTabBar.tsx` — floating pill at the
  bottom on mobile only (hidden at `md+`). Tabs: Vault, Create,
  Contributors, More.
- `src/lib/dashboard-updates.ts` — server helper returning pending approval
  + new-message counts for the badge.

#### Current destinations (placeholders — rewire later)
- Create → `/dashboard/new`
- Contributors → `/account/capsules`
- More → `/account`
- Updates chip → `/dashboard/preview`
- Gift Capsules chip → `/capsules/new`

## Pending feedback from the user (must apply before step 4)

1. **Remove the floating mobile pill tab bar.** The top header already
   carries account access via the avatar; the bottom bar is redundant.
   → Delete `MobileTabBar.tsx` usage from `/dashboard2/page.tsx` (and the
   component file itself).
2. **Pull the "Updates" + "Gift Capsules" chips *out* of the card
   container.** In the mockup they sit as bare chip cards on the page, not
   wrapped in the greeting card. Adjust `DashboardGreeting.tsx` layout.
3. **Mobile tagline wrap.** On mobile, "Every moment you capture becomes
   something unforgettable." should break as two full-length lines (not
   wrap mid-line). Likely needs a `<br className="md:hidden" />` after
   "capture" plus adjusted max-width so the break falls correctly.

## Phase 1 roadmap — remaining steps

- [ ] **Step 3.5 (new)**: Apply the three pending tweaks above.
- [ ] **Step 4**: Dashboard sectioning. Split into three rows:
  1. *Your Time Capsules* — horizontal carousel of vault cards.
  2. *Gift Capsules You're Creating* — list with contributor avatar stack
     and "N new" pill.
  3. *Capsules Given to You* — list of received gift capsules.
  Each section gets a "View all" link. Build a fresh
  `<HorizontalCardRail />` (~40 lines CSS + minimal JS, snap points) since
  `CardSwipePanel` is a different beast.
- [ ] **Step 5**: Vault card redesign — hero cover (gradient placeholder),
  name, stat pills (entries / photos / voice). Stats computed server-side.
- [ ] **Step 6**: Capsule landing page (new route `v2`) — hero + tagline +
  "Create One / Create Multiple" toggle cards. Toggle is UI-only in
  Phase 1; both paths produce a `Collection`.
- [ ] **Step 7**: Capsule landing Collections list — card per Collection
  with cover placeholder, Upcoming/Sealed pill, reveal date + computed
  age, stat icons, inline Edit.
- [ ] **Step 8**: "Add a New Milestone Capsule" CTA + emotional footer
  quote with handwritten-letter illustration slot.
- [ ] **Step 9**: Gift Capsule cards redesign on dashboard (avatar stack,
  "N new" pill, hero cover placeholder).

## Phase 2 — asset + upload flow (after Phase 1 + images)

- [ ] Prisma migration: add `Vault.coverUrl` + `Collection.coverUrl`.
- [ ] Reusable `<CoverUploader />` with `react-easy-crop` (pan + zoom,
  locked 4:3). Uploads to R2 via existing `/api/upload/sign`.
- [ ] Swap gradient placeholders for `coverUrl` where present.
- [ ] Optional backfill script to assign stock images to seed
  vaults/collections for demo.

## Phase 3 — only if Path B is ever needed (NOT planned)

Schema for a standalone `MilestoneCapsule` model. Skip unless milestones
ever need distinct billing/sharing/reveal semantics.

## Open product questions (were parked, still parked)

- (a) Drag-and-drop reordering of Collections on the landing page?
- (b) "View combined preview" button — slideshow through all Collections?
  Needs a spec.
- (c) Desktop version of redesigned dashboard — same layout scaled, or
  deliberately different?

## Known gaps / tech debt

- `dashboard-updates.ts` badge count is currently a broad count of pending
  approvals + recent contributions; per the user it should scope strictly
  to gift-capsule approvals + messages on capsules.
- Placeholder destinations for the chip + tab bar links (listed above) all
  need real targets eventually.
- `HorizontalCardRail` component doesn't exist yet — will be introduced in
  Step 4.

## Files touched so far

```
src/app/dashboard2/page.tsx                               (new)
src/components/dashboard2/DashboardGreeting.tsx           (new)
src/components/dashboard2/MobileTabBar.tsx                (new, to be removed)
src/lib/dashboard-updates.ts                              (new)
src/app/api/cron/capsule-draft-expiry/route.ts            (new)
src/app/api/cron/capsule-contributor-reminder/route.ts    (new)
src/app/layout.tsx (or font config)                       (modified — Alex Brush)
tailwind.config.ts                                        (modified — font-brush utility)
```

## Git note

Per `CLAUDE.md`, work lands directly on `main` so Railway auto-deploys. The
current session was started on branch `claude/review-page-redesign-vzTTH`
at the user's instruction ("Don't push anything to main until i tell
you…"). When the user gives the go-ahead, either merge/rebase this branch
into `main` or cherry-pick the commits over.
