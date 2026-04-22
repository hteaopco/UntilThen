# untilThen — Pre-Launch Checklist
*Updated April 22, 2026*
**Reference commit: `5097178`**

---

## 🔴 Blockers

- [ ] **Square payment integration** — $9.99 Gift Capsule activation currently uses placeholder receipt, anyone can activate for free
- [ ] **PIN vault lock** — re-enable or remove. Schema ready (`pinHash` live), just needs lock screen wired back into `dashboard/layout.tsx` (one-line re-add)
- [~] **Backup + restore verification** — code shipped (`/api/cron/db-backup`, `scripts/restore-db.ts`, `docs/backup-restore.md`). Railway native PG backups enabled, Railway cron service scheduled, R2 `backup-expiry` lifecycle rule live. **Only remaining step**: run the end-to-end restore drill into staging after the first cron produces a backup
- [x] **Rate limiting audit** — complete. Patched `/api/account/contributors/[id]/resend` (was 100/min → now email bucket 10/10min) and `/api/invites/[token]` GET (was 100/min → now public bucket 20/min). No other real gaps; password reset is handled by Clerk's hosted UI, not a custom API
- [x] **Email deliverability** — Resend + `hello@untilthenapp.io` verified. DKIM / SPF / DMARC live in Cloudflare. Test emails land in Gmail/Outlook inboxes with SPF + DKIM PASS aligned to `untilthenapp.io`. DMARC ramp to `p=quarantine` scheduled for **~May 5, 2026**; wire up Postmark DMARC ingestor at the same time. See `docs/email-dns-setup.md`
- [x] **Container manual-restart bug** — root cause was `HPE_HEADER_OVERFLOW` on Node's HTTP parser when Clerk's frontend-API proxy response headers exceeded the default 16KB ceiling. Fixed via `NODE_OPTIONS=--max-http-header-size=65536` in both `railway.json` start command and `nixpacks.toml`. No more crash loop on deploy.

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

## ✅ Resolved This Session (April 22) — Reveal Rebuild, Music, Avatars, Stability

### Recipient reveal — full rebuild at `/reveal/[token]`
- [x] Route + API shipped: public `/reveal/[token]`, token-only lookup against `MemoryCapsule.accessToken`, pre-signed media URLs
- [x] Phase machine: **Gate → Entry → Stories → Transition → Gallery**; all phases migrate cleanly between each other
- [x] **Gate phase** — universal "Tap to begin" pulsing-dot screen before entry. Unlocks iOS autoplay + starts music in a single gesture
- [x] **Entry screen** — staggered 2000ms fade-in (heart → headline → rule → date), Begin button slides up at 1400ms and lands at 2000ms
- [x] **Story Cards** — always-first-5 chronological contributions, progress bar, tap-left back / tap-right forward, ✕ close to gallery, mute toggle
- [x] **PhotoCard** — full-bleed media, bottom gradient + caption + amber sender attribution, amber-initial fallback on load failure
- [x] **LetterCard** — preview state with 5-line clamp + "Tap to read more" + brush signature; expanded state with ✕ / Aa / ⋯ chrome, 15→17→20px font cycle
- [x] **VoiceCard** — amber avatar, decorative waveform, play/pause control, timestamps, no autoplay (iOS-safe)
- [x] **TransitionScreen** — "That's the highlight reel" bridge; skipped entirely when contributions ≤ 5
- [x] **GalleryScreen** — Alex Brush header, search across people/words/dates/collections, primary type pills (Letters / Audio / Photos / Videos — all four always visible), filter section (From + Collection) hidden when irrelevant, grid/list view toggle, uniform 240px card heights
- [x] **GalleryListView** — new table-style alternative to the grid. Type badge + title + from + date; same card modal on tap
- [x] **GalleryCardView** — full-screen modal opened by tapping any gallery card; reuses the three card components minus the StoryCards chrome
- [x] **Replay** — "Relive the opening ↺" link in the gallery; session-only (doesn't reset `recipientCompletedAt`); restarts music on tap
- [x] **`recipientCompletedAt`** server-stamped the first time the recipient reaches the gallery; returning visits drop directly into the gallery
- [x] **Error states** — invalid token (graceful screen + logo), sealed before reveal date (soft "opens on …" screen), empty capsule (gallery empty-state)
- [x] **Variant awareness** — gallery adapts to `capsule` vs `vault` surface (vault drops "people who love you" subhead + hides From row since vaults are usually single-author)
- [x] **Vault subhead uses names** — "1 memory from Dad" instead of "1 memory from 1"; scales to "Dad, Mom, and Grandma Rose" or "Dad, Mom, and 2 others"

### Preview migration — every surface now renders through `RevealExperience`
- [x] `/capsules/[id]/preview` — rebuilt with `PreviewClient` wrapper + This-capsule / Full-demo toggle. Auto-defaults to demo when capsule has zero contributions so organisers don't land on empty gallery
- [x] `/vault/[childId]/preview` — new scoped route replacing legacy `/dashboard/preview`. Loads entries + collections + signed media, passes through same RevealExperience with `variant="vault"`
- [x] `/contribute/capsule/[token]` — contributor's "Preview what they'll see" button now runs the full Entry → Story flow with their single contribution
- [x] `/admin/previews` — "Recipient Reveal — Mock Capsule" card fires seeded 9-contribution demo via `MockRevealPreview`; also lists recent real capsules with "Open reveal" links to `/reveal/{accessToken}`
- [x] Email URLs migrated from `/capsule/[id]/open?t={token}` → `/reveal/{accessToken}` in `sendCapsuleRevealDay` and `sendCapsuleNewLink`
- [x] Legacy `/capsule/[id]/open/` directory + `/dashboard/preview/` + `/api/capsules/open/[id]` all deleted (net -800 lines)
- [x] `FirstScreen`, `SequentialRevealScreen`, `ListScreen`, `ExpiredLinkScreen`, `CapsuleRevealClient`, `PreviewExperience` all deleted

### Reveal music + choreography
- [x] Background music via `NEXT_PUBLIC_REVEAL_MUSIC_URL` env var — loops at volume 0.25 through the guided flow. User-supplied MP3 at `/public/reveal-music.mp3`
- [x] **Ducking** — voice cards + unmuted videos step music to 0.15 during playback; refcount'd so overlaps don't un-duck early
- [x] **Stepped fade-out** entering gallery — 0.20 / 0.15 / 0.10 / 0.05 / 0.00 on a 400ms cadence, total 2000ms, then pause + tear down
- [x] **Replay re-spins-up** music from the Replay tap (user gesture, autoplay-safe)
- [x] Shared mute toggle — single switch kills both music + voice. Lives in StoryCards chrome + Gallery header

### Reveal analytics (PostHog)
- [x] Event taxonomy shipped via `RevealAnalyticsProvider`:
  - `reveal_opened` / `reveal_sealed_viewed` / `reveal_completed`
  - `reveal_entry_viewed` / `reveal_begin_clicked`
  - `reveal_story_viewed` (per-card index + type + author)
  - `reveal_letter_expanded` / `reveal_voice_played`
  - `reveal_stories_closed` (with index) / `reveal_stories_completed`
  - `reveal_transition_viewed` / `reveal_transition_continued`
  - `reveal_gallery_viewed` / `reveal_gallery_card_opened` (grid|list)
  - `reveal_gallery_searched` (debounced) / `reveal_gallery_filtered` / `reveal_gallery_view_toggled`
  - `reveal_gallery_filters_cleared` / `reveal_replay_clicked`
- [x] capsuleId auto-injected on every event via context; silent no-op when PostHog isn't loaded (admin mock doesn't pollute the funnel)

### User avatars
- [x] `User.avatarUrl` column added (migration `20260422_add_user_avatar_url`)
- [x] `"userAvatar"` added to `MediaTarget` with `users/{id}/` prefix
- [x] `/api/account/avatar` PATCH + DELETE endpoints — locks writes to caller's own prefix
- [x] `AvatarUploader` modal — 1:1 circular crop with `react-easy-crop`, 512×512 JPEG output
- [x] Account profile page (`/account`) — avatar + pencil edit badge in the header
- [x] Top-nav `Avatar` component — photo replaces JD initials across every authenticated surface
- [x] `ContributorAvatar` shared component — used in Updates inbox row + capsule pending/live contributions. Photo for signed-in contributors, amber initials fallback otherwise
- [x] Batched signed-URL resolution on both surfaces to avoid N+1

### Auth + onboarding
- [x] Sign-in redirect fixed — was forcing `/onboarding`, now goes straight to `/dashboard`. Eliminates the "form flashes then refresh fixes it" bug

### Container stability
- [x] `NODE_OPTIONS=--max-http-header-size=65536` added to both `railway.json` + `nixpacks.toml` start commands. Fixes the `HPE_HEADER_OVERFLOW` crash loop on Clerk frontend-API proxy responses

### Backup infra
- [x] `pg_dump` cron at `/api/cron/db-backup` — streams gzipped dump to R2 under `backups/db/YYYY-MM-DD-HHmm.sql.gz`
- [x] `scripts/restore-db.ts` — restore CLI with same-host guardrail; `--list` flag to browse backups
- [x] `docs/backup-restore.md` — full runbook + drill checklist
- [x] `postgresql_17` added to `nixpacks.toml` so `pg_dump` is available on Railway

### Admin surfaces
- [x] `DELETE /api/admin/users/[id]` — cascade extended to `NotificationPreferences`, `Collection`, `Contributor`, `MemoryCapsule` (was failing FK violations on stale user rows). Error log now surfaces Prisma code + meta
- [x] `/admin/qa` — reveal links point at `/reveal/{accessToken}` (was old format + duplicate Preview Reveal button removed)
- [x] `/admin/previews` — legacy `reveal-first/sequence/list` preview cards removed; replaced with real-capsule list + mock reveal

### Gift-capsule polish
- [x] Gift Capsule chip + on dashboard greeting
- [x] Organiser preview "View combined preview" on vault rewired to `/vault/[childId]/preview` (was pointing at deleted `/dashboard/preview`)
- [x] Container no longer needs manual restart between deploys — HPE_HEADER_OVERFLOW fix above

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

The full recipient reveal is on the new flow — `/reveal/[token]`,
organiser preview, vault preview, contributor preview, and admin
mock all run through `RevealExperience`. Legacy FirstScreen /
SequentialRevealScreen / PreviewExperience deleted. Remaining work
is hands-on device QA.

### Gate + Entry
- [ ] **Gate screen** — "Tap to begin" pulses amber dot, cream
  bokeh background, tap unlocks music + advances to Entry
- [ ] **Entry fade choreography** — heart → headline → rule →
  date stagger in over ~1500ms, Begin button slides up at 1400ms
  and lands at 2000ms. No hard flashes.
- [ ] **Music** — starts at volume 0.25 on gate tap, plays
  through Entry / Stories / Transition without restarting at
  phase boundaries

### Stories
- [ ] **Progress bar** fills as cards advance; tap-right advances,
  tap-left goes back, middle dead zone
- [ ] **✕ close** exits to gallery; **mute toggle** silences
  music + voice together (shared state)
- [ ] **PhotoCard** — full-bleed media, bottom gradient + caption
  readable, sender attribution amber, amber-initial fallback
  renders on load failure
- [ ] **LetterCard preview** — 5-line clamp + fade, brush sig,
  "Tap to read more" reveals expanded view
- [ ] **LetterCard expanded** — ✕ collapses back to preview
  (doesn't exit reveal), Aa cycles 15→17→20px, body scrolls, ✕
  accessible above preview top bar during organiser/vault preview
- [ ] **VoiceCard** — play button works, timestamps update,
  pause/resume cleanly, **music ducks to 0.15** while voice
  plays, restores to 0.25 on pause/end

### Transition + Gallery
- [ ] **TransitionScreen** — "{N} more memories · {X} contributors"
  copy correct, ghost CTA advances to gallery; entire screen
  skipped when contributions ≤ 5
- [ ] **Music fade-out** into gallery — 0.20 / 0.15 / 0.10 / 0.05
  / 0.00 stepped over 2000ms, element tears down after
- [ ] **GalleryScreen** — Alex Brush header, subhead variant-aware
  (vault: "N memories from Dad"; capsule: "N memories from Y
  people who love you")
- [ ] **Search bar** — filters across author, title, body, date,
  collection; clears cleanly
- [ ] **Primary type pills** — all four (Letters, Audio, Photos,
  Videos) always visible; "All" chip doesn't jam against left
  edge during horizontal scroll
- [ ] **Filter section** — "From" row only on gift capsules with
  > 1 contributor; "Collection" row only on vaults with collections
- [ ] **Clear all** link appears when any filter is active
- [ ] **Grid ⇄ List toggle** — grid shows uniform 240px tiles;
  list shows type badge + title + from + date rows
- [ ] **GalleryCard tap** → full-screen card view, ✕ + Esc close,
  ✕ accessible above preview top bar

### Edge cases
- [ ] **Sealed before reveal date** — soft "opens on …" screen
- [ ] **Invalid token** — `/reveal/garbage` shows graceful error
  + logo
- [ ] **Empty capsule** — gallery empty-state
- [ ] **Replay** — "Relive the opening" restarts music + runs
  through full flow, fades out again into gallery
- [ ] **Returning visitor** — `recipientCompletedAt` set; lands
  directly in gallery, no music auto-start

### Preview surfaces
- [ ] **Organiser preview** (`/capsules/[id]/preview`) — This-
  capsule / Full-demo toggle works, Back link returns to capsule
- [ ] **Vault preview** (`/vault/[childId]/preview`) — variant
  clearly different (no People filter, named subhead)
- [ ] **Contributor preview** (inside contribute flow) — shows
  their single message through full Entry → Story sequence
- [ ] **Admin mock** (`/admin/previews` → Mock Capsule card) —
  9-contribution seeded demo with stock Unsplash photos + W3C
  audio sample

### Platform
- [ ] **iOS Safari** — gate satisfies autoplay, music actually
  plays, no overflow, safe-area insets respected
- [ ] **Android Chrome** — same
- [ ] **Desktop 1440+** — centered layout reads right; music still
  autoplays after gate tap
- [ ] **Tone** — the new flow doesn't branch on tone (no
  confetti/fireworks variants). Re-decide whether to port or
  leave minimalist

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

### Resolved April 22
- [x] **Entry detail view** — `/vault/[childId]/entry/[entryId]` shipped. Tap any entry row in the Main Diary or a collection → lands on a read-only detail page with title, body (serif), media inline, created date, and a "Sealed until …" or "Revealed …" line. The page is always reachable (pre- and post-reveal); reveal-date only gates the Edit button.
- [x] **Entry editing pre-reveal** — allow edits any time before the entry's effective reveal date (`collection.revealDate` when in a collection, otherwise `vault.revealDate`). From the detail view, tap "Edit memory" → opens the same MemoryEditorForm with title, body, media, and collection all pre-loaded. Server-side PATCH refuses content edits after reveal.
- [x] **Entry reading experience** — solved by the detail view above. Pre-reveal readers see a "Sealed until {date}" chip; post-reveal readers see "Revealed {date}" and no Edit button.

### Still Open
- [ ] **Mobile test pass** — Create Collection modal + Updates inbox still need on-device verification. *(Cover cropper + reveal experience both verified on iPhone during this session)*

### Resolved
- [x] Collection deletion UI (subtle text → move-entries / delete-all modal)
- [x] Main Diary customization — **decision: not editable** (Main Diary is the main capsule). Pills hidden on diary
- [x] Legacy `/dashboard/new` editor deleted
- [x] Redundant "Add a new memory" dashed CTA removed from vault landing
- [x] Route rename `/dashboard/collection/[id]` → `/vault/[childId]/collection/[collectionId]` with legacy redirect
- [x] Redundant Edit pencil removed from collection cards on vault landing
- [x] Railway deploy warmup fix shipped (then superseded by the NODE_OPTIONS HPE fix — the actual root cause)
- [x] Cron services created for draft-expiry + contributor-reminder + db-backup
- [x] Cover image rendering fixed on collection cards (signed `coverUrl` at render)
- [x] Volleyball-style collection thumbnails now show uploaded photos
- [x] **"View combined preview"** — now routes to `/vault/[childId]/preview`, scoped to the child, rendered through new `RevealExperience`. Legacy `/dashboard/preview` deleted
- [x] Admin user-delete cascade — FK violations fixed; error logging improved

### Infrastructure (Carry-forward)
- [ ] Extend test coverage to the vault/collection surfaces (started with `ageOnDate`; 6 unit tests shipping)
