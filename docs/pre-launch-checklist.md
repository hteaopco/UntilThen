# untilThen — Pre-Launch Checklist
*Updated April 21, 2026*
**Reference commit: `b93eb40`**

---

## 🔴 Blockers

- [ ] **Square payment integration** — $9.99 Gift Capsule activation currently uses placeholder receipt, anyone can activate for free
- [ ] **PIN vault lock** — re-enable or remove. Schema ready (`pinHash` live), just needs lock screen wired back into `dashboard/layout.tsx` (one-line re-add)
- [~] **Backup + restore verification** — code shipped (`/api/cron/db-backup`, `scripts/restore-db.ts`, `docs/backup-restore.md`). Railway native PG backups enabled, Railway cron service scheduled, R2 `backup-expiry` lifecycle rule live. **Only remaining step**: run the end-to-end restore drill into staging after tomorrow's 07:00 UTC cron produces the first backup
- [~] **Rate limiting audit** — audit complete. Patched `/api/account/contributors/[id]/resend` (was 100/min → now email bucket 10/10min) and `/api/invites/[token]` GET (was 100/min → now public bucket 20/min). No other real gaps found; password reset is handled by Clerk's hosted UI, not custom API
- [x] **Email deliverability** — Resend + `hello@untilthenapp.io` verified. DKIM / SPF / DMARC live in Cloudflare. Test emails land in Gmail/Outlook inboxes with SPF + DKIM PASS aligned to `untilthenapp.io`. DMARC ramp to `p=quarantine` scheduled for **~May 5, 2026** (2 weeks out); wire up Postmark DMARC ingestor at the same time. See `docs/email-dns-setup.md`.

---

## ✅ Resolved This Session (April 19)

- [x] Prisma Accelerate removed — direct Postgres at runtime
- [x] All 9 schema fields remapped: `pinHash`, `trusteePhone`, `Vault.deliveryTime`, `Vault.timezone`, `CapsuleTone` enum (REMEMBRANCE → THINKING_OF_YOU), `MemoryCapsule.tone`, `MemoryCapsule.deliveryTime`, `MemoryCapsule.timezone`, `MemoryCapsule.recipientCompletedAt`
- [x] CapsuleTone enum migrated in DB (REMEMBRANCE → THINKING_OF_YOU)
- [x] Backend handlers wired for tone, trusteePhone, deliveryTime, timezone in capsules, children, and reveal cron
- [x] trusteePhone added to ChildEditForm UI
- [x] Onboarding writes back via proper `$transaction`
- [x] Build pipeline hardened — explicit `engineType = "library"`, env-var assertion in nixpacks
- [x] VaultDeliverySettings component — time picker + 25-zone IANA timezone select, PATCHes existing endpoint
- [x] ChildDangerZone extracted from ChildEditForm
- [x] `/account/capsules/[childId]` page composed correctly: Capsule info + Trustee → Reveal delivery → Danger zone

---

## ✅ Resolved This Session (April 20–21) — New Dashboard & Vault Flow

### Dashboard & nav
- [x] **New `/dashboard`** — Alex Brush greeting, Updates + Gift Capsules chips, three sections (Your Time Capsules carousel, Gift Capsules You're Creating with inline expand/collapse, Capsules Given to You)
- [x] Vault cards shrunk 30% (182px mobile / 168px desktop) with real letter/photo/voice counts
- [x] Shared `TopNav` (back + home buttons, logo, avatar, hairline) applied to `/dashboard`, `/vault/[childId]`, `/vault/[childId]/diary`, `/vault/[childId]/new`, `/vault/[childId]/collection/[id]`, `/dashboard/updates`, `/capsules/[id]`
- [x] Mobile logo visibility fixed (was `hidden sm:`)
- [x] "Hi, {Name} ♡" + "Welcome to your Vault! Every moment captured becomes timeless." greeting copy
- [x] Updates chip routes to the new dedicated `/dashboard/updates` inbox

### Vault landing (`/vault/[childId]`)
- [x] Compact mobile hero: 120px cover + right-aligned Alex Brush title + "Create New Collection" pill
- [x] Desktop hero: side-by-side with description + Create pill
- [x] Collections list — Main Capsule Diary synthetic card pinned first, real collections below
- [x] Create New Collection modal — name, cover (inline `react-easy-crop`), description, reveal date (clamped ≤ vault date)
- [x] Each collection card shows stats + amber "+" action (Edit pencil removed as redundant)
- [x] Sibling-card thumbnails now sign their `coverUrl` on SSR (was hardcoded `null`)

### Collection landing (shared view)
- [x] Single `CollectionLandingView` powers both Main Diary and every real collection — one file to edit
- [x] Right-column layout: cover image (with pencil overlay on real collections) + Edit Details pill directly below
- [x] `EditCollectionDetailsModal` updates name + description + reveal date AND includes inline cover cropping
- [x] `CoverUploader` generalized to accept `target: "vault" | "collection"` + `targetId`
- [x] Delete collection flow — subtle grey text at bottom → `DeleteCollectionModal` with two radio options (move memories to another collection / Main Diary, or delete them too)
- [x] Floating 105×105 `+` FAB bottom-right of every collection page
- [x] Empty-state copy differentiates diary vs real collection

### Memory editor (`/vault/[childId]/new`)
- [x] Clone of the gift-capsule contributor chrome — "Write something meaningful." card, Tiptap with scroll rail, media attachments
- [x] Collection picker dropdown (Main Diary by default; any real collection on the vault)
- [x] "Reveals on {date}" line under picker reflects collection's reveal date (or vault's if Main Diary)
- [x] Media attachment buttons now equal-width (2x2 mobile / 4-col desktop grid); size caption set to `whitespace-nowrap`

### Updates inbox (`/dashboard/updates`)
- [x] Lists every `PENDING_REVIEW` contribution on capsules the viewer organizes
- [x] Bulk actions: Select-all checkbox + Approve/Deny pills in sticky top bar
- [x] Per-row checkbox + icon-only approve/deny
- [x] Row order: capsule pill → reveal date → **From {Author}** (bold) → body preview with "Show more" expand → hairline → media (or italic "No media"; photos/voice/video play via shared `MediaDisplay`)
- [x] Server signs all media keys on render

### Cover upload infra
- [x] `Vault.coverUrl` migration shipped
- [x] `Collection.coverUrl` migration shipped
- [x] `MediaTarget` extended with `"vault"` and `"collection"`
- [x] `/api/upload/sign` authorizes both new targets
- [x] `/api/account/vaults/[id]/cover` + `/api/account/collections/[id]/cover` PATCH/DELETE endpoints
- [x] `CoverUploader` modal with `react-easy-crop` (4:3 crop, pan + zoom, slider control)
- [x] `router.refresh()` on save so UI updates without a reload
- [x] R2 bucket stays private — short-lived signed GET URLs at render time

### Gift capsule touches
- [x] Contributor form's name input is placeholder-only ("From Jett")
- [x] "Jack and Courtney's capsule is live" header no longer overflows on mobile
- [x] Capsule overview (`/capsules/[id]`) uses `TopNav` instead of custom "Back to Dashboard" bar
- [x] Gift capsule section on dashboard: inline **View all (N)** expand/collapse, no more navigation away

### Legacy purge
- [x] Deleted `/dashboard/new` editor + `/dashboard/entry/` edit+preview routes
- [x] Removed orphaned components: `ApprovalQueue`, `CollectionsSection`, legacy `CreateCollectionModal`, `CreationPicker`, `DashboardGrid`, `DeleteEntryButton`, `EntryList`, `GiftCapsuleSection`, `MemoryStarter`, `NewVaultButton`, `TimeCapsuleCarousel`, `VaultHero` (~2,700 lines net)
- [x] Removed redundant dashed "Add a new memory" CTA on vault landing
- [x] Collection route moved to canonical `/vault/{childId}/collection/{collectionId}`; old `/dashboard/collection/{id}` is a redirect

### Crons + deploy
- [x] Draft-expiry + contributor-reminder endpoints shipped; Railway cron services created
- [x] Deploy warmup — start command backgrounds Next, polls `/api/health`, curl-primes `/`, `/sign-in`, `/dashboard` before handing over (resolves stale-on-first-request issue)
- [x] Product decision: Main Capsule Diary is **not** user-customizable. Edit pills hidden on diary

### Tests
- [x] `tests/capsule-landing-data.test.ts` — 6 cases for `ageOnDate` (happy path, missing inputs, month-before and same-month-earlier-day subtraction, reveal-before-DOB fallback). All passing

### Content
- [x] Blog post #2 shipped — `content/posts/what-would-you-say.mdx`

---

## 🟡 Before Soft Launch

- [ ] Wire PostHog API into admin dashboard for traffic analytics
- [ ] Polaroid photo stack component for vault dashboard cards (awaiting visual approval)
- [ ] Terms of Service + Privacy Policy legal review (minors' data, long-term storage, data export on request)
- [ ] Cookie/consent banner if EU traffic is expected
- [ ] Refund policy for $9.99 Gift Capsules (documented and linked from checkout)
- [ ] Account recovery flows — forgot password, locked out, lost email access
- [ ] Media moderation strategy — what blocks a contributor uploading abusive content into a child's capsule?
- [ ] Cron health monitoring — alert if cron fails to fire
- [ ] Admin access audit log
- [ ] Decedent / next-of-kin answer in ToS
- [ ] Sentry end-to-end check — trigger test error in prod, confirm readable stack trace

---

## 🟠 Capsule Dashboard QA

- [ ] Audit capsule detail page layout on mobile
- [ ] Verify activation card shows correctly in DRAFT and ACTIVE states
- [ ] Confirm post-activation copy is correct
- [ ] Verify "Preview their moment" link is visible and functional in both states
- [ ] Test adding contributor to already-active capsule — invite email fires immediately
- [x] Dashboard capsule list collapses to 3 with inline "View all (N)" / "Show less" toggle
- [ ] Verify gift capsule pricing card renders correctly
- [ ] Test swipe between pricing cards on mobile

---

## 🟠 Letter Editor Uniformity

- [ ] Verify all 4 editor surfaces use the same design
- [ ] Confirm toolbar is consistent (B I U | quote | list ordered-list)
- [ ] Confirm scroll indicator appears on all editors
- [ ] Confirm "Write as much as you'd like." hint on all editors
- [ ] Confirm Expand/Collapse button works on capsule contributor editor
- [ ] Confirm tone-specific instruction banner appears with correct copy
- [x] Media buttons render as equal-width row (2×2 mobile / 4-col desktop) on capsule contributor editor AND the new vault memory editor
- [ ] Confirm "Dear [name]," placeholder is correct across all editors
- [ ] Test editor on mobile — toolbar doesn't overlap, min-height 180px

---

## 🟠 Reveal Visual QA

- [ ] Verify all 4 reveal surfaces use the same components
- [ ] Confirm tone prop wired through to SequentialRevealScreen on all surfaces
- [ ] Test FirstScreen — sealed vault icon, occasion icon, hero line, CTA button
- [ ] Test SequentialRevealScreen — unlock phase, typewriter, card navigation, closing line
- [ ] Confirm confetti fires for CELEBRATION and LOVE tones only
- [ ] Confirm fireworks fire for CELEBRATION tone only
- [ ] Verify organiser preview shows full flow + ALL contributions
- [ ] Verify "Replay preview" button on close screen
- [ ] Test reveal on mobile — dark backgrounds, readable text, tappable cards
- [ ] Verify all 6 tone copy variants render correctly
- [ ] Check /admin/tones page shows all tone copy

---

## ✅ End-to-End Live Tests

- [ ] Create new account → onboarding (child vault path)
- [ ] Create new account → onboarding (gift capsule path)
- [ ] Write text entry → verify saves and appears
- [ ] Write text entry with photo → verify upload and display
- [ ] Record voice note → verify upload and playback
- [ ] Create Gift Capsule → all 5 steps → verify DRAFT
- [ ] Add contributors to DRAFT → verify list
- [ ] Activate capsule → verify ACTIVE + invite emails
- [ ] Open contributor invite link → full flow end to end
- [ ] Verify contributor message appears in organiser view
- [ ] Add contributor to ACTIVE capsule → invite fires immediately
- [ ] Preview capsule as organiser → full reveal flow
- [ ] Test reveal as recipient via access token URL
- [ ] Test /admin dashboard — counts, pipeline, review queue
- [ ] Test /admin/emails — fire test email for all 21 templates
- [ ] Test /admin/tones — all 6 tones correct
- [ ] Test /admin/moderation — approve/reject works
- [ ] Test account deletion — cascade + Clerk deleted
- [ ] Test iPhone Safari — no overflow, no broken layouts (new vault/collection flow is user's focus today)
- [ ] Test Android Chrome — same
- [ ] Test desktop 1440px+ — pricing, dashboard, landing page
- [ ] **New:** Cover photo upload end-to-end (vault + collection) — pick → crop → zoom → save → image renders on card + landing
- [ ] **New:** Collection create flow — name, cover, description, reveal date, clamped ≤ vault date
- [ ] **New:** Collection edit flow (Edit Details pill) — metadata + cover in one modal
- [ ] **New:** Delete collection with "move memories to" and "delete memories" variants both honored
- [ ] **New:** Updates inbox — select all, bulk approve/deny, per-row actions, "Show more" body expand, media playback

---

## 🟢 Nice to Have (Post-Launch)

### Infrastructure
- [x] Railway auto-restart fix — deploy warmup curl lands before Railway flips traffic to the new container, so first request doesn't pay cold-start cost on Clerk JWKS + Prisma + Next JIT

### Marketing / Content
- [ ] ElevenLabs voice snippet demo — 3–4 short emotional snippets (10–15 words each) rotating on landing page. Child, spouse, just because. Cache audio files, essentially free to generate. "Great game today kiddo, you really nailed those free throws."
- [ ] "How to use untilThen" marketing video — short walkthrough for landing page. Show create → write → invite → reveal flow. Keep under 60 seconds.

### Other
- [ ] Subscription gating for 4th+ vault ($1.99/mo) — needs Square
- [ ] Prisma upgrade 5.22 → 7.x
- [ ] Test suite expansion — add E2E with Playwright (started with `ageOnDate` unit tests)
- [ ] Route-group error boundaries
- [ ] Transfer request flow (trustee) — lost in revert, needs rebuild
- [ ] Polaroid photo stack on vault cards (if visual approved)

---

## 🟠 UI Gaps (open items from April 20 audit)

### Tabled (product still deciding)
- [ ] **Entry detail view** — can see entry rows but can't open a single memory. No `/vault/[id]/entry/[entryId]` page yet *(tabled pending product decision)*
- [ ] **Entry editing** — once sealed, no way to edit. Needs decision: allow edits pre-reveal or lock permanently? *(tabled with entry detail)*
- [ ] **Entry reading experience** — what does reading a sealed letter look like before reveal day? List view enough or does each entry need its own page? *(tabled with entry detail)*

### Still Open
- [ ] **"View combined preview"** — still links to old generic `/dashboard/preview`. Wire vault-scoped or remove
- [ ] **Mobile test pass** — Create Collection modal, cover cropper, Updates inbox. *Cover cropper confirmed working; the other two still pending verification on device*
- [ ] `/dashboard/preview` "Back to" links — dark preview surface doesn't use TopNav. Leave or unify

### Resolved
- [x] Collection deletion UI (subtle text → move-entries / delete-all modal)
- [x] Main Diary customization — **decision: not editable** (Main Diary is the main capsule). Pills hidden on diary
- [x] Legacy `/dashboard/new` editor deleted
- [x] Redundant "Add a new memory" dashed CTA removed from vault landing
- [x] Route rename `/dashboard/collection/[id]` → `/vault/[childId]/collection/[collectionId]` with legacy redirect
- [x] Redundant Edit pencil removed from collection cards on vault landing
- [x] Railway deploy warmup fix shipped
- [x] Cron services created for draft-expiry + contributor-reminder
- [x] Cover image rendering fixed on collection cards (signed `coverUrl` at render)
- [x] Volleyball-style collection thumbnails now show uploaded photos

### Infrastructure (Carry-forward)
- [ ] Extend test coverage to the vault/collection surfaces (started with `ageOnDate`; 6 unit tests shipping)
