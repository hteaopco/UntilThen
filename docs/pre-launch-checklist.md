# untilThen — Pre-Launch Checklist
*Updated April 23, 2026*

> Only outstanding items. Everything completed has been pruned —
> see git history (`docs/pre-launch-checklist.md`) for the archive.

---

## 🔴 Blockers

- [~] **Backup + restore verification** — code + infra shipped
  (`/api/cron/db-backup`, `scripts/restore-db.ts`, `docs/backup-restore.md`,
  Railway native PG backups enabled, R2 lifecycle rule live). **Outstanding:**
  run the end-to-end restore drill into staging after the first cron produces
  a backup. See also the `db-backup cron 502` item under _Tabled_ below.

---

## 🟡 Before Soft Launch

- [ ] **Terms of Service + Privacy Policy legal review** — minors' data,
  long-term storage, data export on request
- [ ] **Sentry end-to-end live verification** — `/admin/settings →
  Sentry live test` + diagnostic panel shipped. **Picking up next
  session.** Last state: DSN resolved (SENTRY_DSN set), host parsed
  (o4511224418795520.ingest.us.sentry.io), but `clientActive: NO`
  before the inline-init fix. Commit `8f550c6` moved `Sentry.init()`
  directly into `instrumentation.ts` (was failing across a dynamic-
  import module boundary). On the next deploy, watch Railway runtime
  logs for `[sentry] node init complete, client bound = true`, then
  re-fire the button. If the diagnostic panel still shows
  `clientActive: NO`, the next step is to audit the Sentry webpack
  plugin in `next.config.ts` (it might be auto-wrapping the init
  and we're double-initializing).
- [ ] **Reveal theme picker** — currently a "Coming soon" placeholder.
  Decide whether to ship at launch or defer. If shipping, pick 2–3
  background/color variants
- [ ] **Build-mode reveal QA** — curator flow + admin-uploaded music
  end-to-end on iPhone
- [ ] **Billing regression sweep** — exercise subscribe → addon →
  remove-addon → update-card → switch → cancel-switch → cancel → resume
  on prod, verify vault-lock reconciliation and webhook promotion at
  each step

---

## 🟠 Capsule Dashboard QA

- [ ] Audit capsule detail page layout on mobile
- [ ] Verify activation card shows correctly in DRAFT and ACTIVE states
- [ ] Confirm post-activation copy is correct
- [ ] Verify "Preview their moment" link is visible and functional in
  both states
- [ ] Test adding contributor to already-active capsule — invite email
  fires immediately
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
- [ ] Confirm "Dear [name]," placeholder is correct across all editors
- [ ] Test editor on mobile — toolbar doesn't overlap, min-height 180px

---

## 🟠 Reveal Visual QA

The full recipient reveal runs through `RevealExperience` everywhere
(`/reveal/[token]`, organiser preview, vault preview, contributor
preview, admin mock). Remaining work is hands-on device QA.

### Gate + Entry
- [ ] **Gate screen** — "Tap to begin" pulses amber dot, cream bokeh
  background, tap unlocks music + advances to Entry
- [ ] **Entry fade choreography** — heart → headline → rule → date stagger
  in over ~1500ms, Begin button slides up at 1400ms and lands at 2000ms.
  No hard flashes
- [ ] **Music** — starts at volume 0.25 on gate tap, plays through Entry
  / Stories / Transition without restarting at phase boundaries

### Stories
- [ ] **Progress bar** fills as cards advance; tap-right advances, tap-left
  goes back, middle dead zone
- [ ] **✕ close** exits to gallery; **mute toggle** silences music + voice
  together (shared state)
- [ ] **PhotoCard** — full-bleed media, bottom gradient + caption readable,
  sender attribution amber, amber-initial fallback renders on load failure
- [ ] **LetterCard preview** — 5-line clamp + fade, brush sig,
  "Tap to read more" reveals expanded view
- [ ] **LetterCard expanded** — ✕ collapses back to preview (doesn't exit
  reveal), Aa cycles 15→17→20px, body scrolls, ✕ accessible above preview
  top bar during organiser/vault preview
- [ ] **VoiceCard** — play button works, timestamps update, pause/resume
  cleanly, **music ducks to 0.05** while voice plays, restores on pause/end

### Transition + Gallery
- [ ] **TransitionScreen** — "{N} more memories · {X} contributors" copy
  correct, ghost CTA advances to gallery; entire screen skipped when
  contributions ≤ 5
- [ ] **Music fade-out** into gallery — 25 × 120ms ticks, stair-stepped
- [ ] **GalleryScreen** — Alex Brush header, subhead variant-aware (vault:
  "N memories from Dad"; capsule: "N memories from Y people who love you")
- [ ] **Search bar** — filters across author, title, body, date, collection;
  clears cleanly
- [ ] **Primary type pills** — all four (Letters, Audio, Photos, Videos)
  always visible; "All" chip doesn't jam against left edge during
  horizontal scroll
- [ ] **Filter section** — "From" row only on gift capsules with > 1
  contributor; "Collection" row only on vaults with collections
- [ ] **Clear all** link appears when any filter is active
- [ ] **Grid ⇄ List toggle** — grid shows uniform 240px tiles; list shows
  type badge + title + from + date rows
- [ ] **GalleryCard tap** → full-screen card view, ✕ + Esc close, ✕
  accessible above preview top bar

### Edge cases
- [ ] **Sealed before reveal date** — soft "opens on …" screen
- [ ] **Invalid token** — `/reveal/garbage` shows graceful error + logo
- [ ] **Empty capsule** — gallery empty-state
- [ ] **Replay** — "Relive the opening" restarts music + runs through full
  flow, fades out again into gallery
- [ ] **Returning visitor** — `recipientCompletedAt` set; lands directly
  in gallery, no music auto-start

### Preview surfaces
- [ ] **Organiser preview** (`/capsules/[id]/preview`) — This-capsule /
  Full-demo toggle works, Back link returns to capsule
- [ ] **Vault preview** (`/vault/[childId]/preview`) — variant clearly
  different (no People filter, named subhead)
- [ ] **Contributor preview** (inside contribute flow) — shows their single
  message through full Entry → Story sequence
- [ ] **Admin mock** (`/admin/previews` → Mock Capsule card) —
  9-contribution seeded demo with stock Unsplash photos + W3C audio sample

### Platform
- [ ] **iOS Safari** — gate satisfies autoplay, music actually plays,
  no overflow, safe-area insets respected
- [ ] **Android Chrome** — same
- [ ] **Desktop 1440+** — centered layout reads right; music still
  autoplays after gate tap
- [ ] **Tone** — the new flow doesn't branch on tone (no confetti/fireworks
  variants). Re-decide whether to port or leave minimalist

---

## 🟢 End-to-End Live Tests

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
- [ ] Test /admin/emails — fire test email for all 22 templates
- [ ] Test /admin/tones — all 6 tones correct
- [ ] Test /admin/moderation — approve/reject works + Hive flag
  rendering + Clear-flag → organiser inbox
- [ ] Test /admin/audit — mutating admin action shows up as a new row
- [ ] Test /admin/analytics — numbers render, error card surfaces
  actual HogQL error on a bad query
- [ ] Test account deletion — cascade + Clerk deleted
- [ ] Test vault PIN flow — set → lock screen appears on `/dashboard`
  + `/vault` → unlock → session-only → Forgot PIN → email reset link
  → cleared → set a new one
- [ ] Test iPhone Safari — no overflow, no broken layouts (new vault/collection flow)
- [ ] Test Android Chrome — same
- [ ] Test desktop 1440px+ — pricing, dashboard, landing page
- [ ] Cover photo upload end-to-end (vault + collection) — pick →
  crop → zoom → save → image renders on card + landing
- [ ] Collection create flow — name, cover, description, reveal
  date, clamped ≤ vault date
- [ ] Collection edit flow (Edit Details pill) — metadata + cover
  in one modal
- [ ] Delete collection with "move memories to" and "delete memories"
  variants both honored
- [ ] Updates inbox — select all, bulk approve/deny, per-row actions,
  "Show more" body expand, media playback

---

## 🟢 Nice to Have (Post-Launch)

### Marketing / Content
- [ ] **ElevenLabs voice snippet demo** — 3–4 short emotional snippets
  (10–15 words each) rotating on landing page. Child, spouse, just because.
  Cache audio files, essentially free to generate. "Great game today kiddo,
  you really nailed those free throws."
- [ ] **"How to use untilThen" marketing video** — short walkthrough for
  landing page. Show create → write → invite → reveal flow. Keep under
  60 seconds

---

## 🟣 Tabled / Paused

- [ ] **`db-backup` cron returning 502** — authed past 401 after we set
  `CRON_SECRET` on every cron service, now hits 502 from the web service.
  **Picking up next session.** Most likely: `pg_dump` spawn failure OR
  `Buffer.concat` OOM under Railway's web-service memory cap. Paused
  for now; Railway's native Postgres backups remain the primary layer
  so we're not exposed.

  **Debug order when resuming:**
  1. Railway → Web service → Observability → filter for `[cron/db-backup]`
     during a cron invocation window. The try/catch in
     `/api/cron/db-backup/route.ts` should log `[cron/db-backup] failed:`
     with the underlying error — that's the fastest diagnosis.
  2. If no log lines at all: container died before the handler logged
     → likely OOM. Switch from `Buffer.concat` to streaming via
     `@aws-sdk/lib-storage` multipart upload (commented hook already
     exists in the 500MB-ceiling safety check).
  3. If log shows `pg_dump` error: confirm `DATABASE_URL` is set on
     the web service (not just on the Postgres service) and that
     `postgresql_17` is still in `nixpacks.toml`.
  4. Alternative path: ditch the R2 pg_dump cron entirely and rely on
     Railway's native PG backups as the single layer. Still acceptable
     per the backup-restore runbook, just less belt-and-suspenders.
