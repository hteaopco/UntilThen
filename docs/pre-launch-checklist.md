# untilThen — Pre-Launch Checklist
*Updated April 25, 2026*

> Only outstanding items. Everything completed has been pruned —
> see git history (`docs/pre-launch-checklist.md`) for the archive.

---

## 🔴 Blockers

*(none — backup-restore drill demoted; Railway native PG backups
plus the proven R2 pipeline give enough coverage at this user
volume.)*

---

## 🟡 Before Soft Launch

- [ ] **Verify `recipient2Email` migration on prod** — after the next
  Railway deploy, confirm `\d "MemoryCapsule"` shows the new
  `recipient2Email TEXT` column (migration `20260425_recipient2_email`,
  applied via `prisma migrate deploy` in `railway.json:startCommand`)
- [ ] **Terms of Service + Privacy Policy legal review** — minors' data,
  long-term storage, data export on request
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

## 🟤 Before First 100 Paying Users

- [ ] **Backup + restore drill** — pg_dump → gzip → R2 streaming
  pipeline already confirmed working via `/admin/settings → DB
  backup live test` (commits `0bfff40`, `30f3604`, `0bb171e`).
  Railway native PG backups are on as the primary safety net.
  When data volume warrants it, run the end-to-end restore drill
  per `docs/backup-restore.md` "Pre-launch drill" section: spin
  up a staging Postgres, run `scripts/restore-db.ts` against the
  latest dump, verify row counts + spot-check one real capsule's
  contributions + media keys.

---

## 🟠 Capsule Dashboard QA

- [ ] Audit capsule detail page layout on mobile
- [ ] Verify activation card shows correctly in DRAFT and ACTIVE states
- [ ] Confirm post-activation copy is correct
- [ ] **Recipient email is captured at creation, not at activate** — verify
  the activate modal no longer asks for email/phone (collapsed to summary →
  pay), and that the summary CTA reads "Send contributor invites" on free
  activations / "Continue to payment" when paywall is on
- [ ] **Couple capsules deliver to both addresses** — seed a couple capsule,
  jump the reveal date, run `/api/cron/reveal`, confirm both
  `recipientEmail` and `recipient2Email` receive the reveal-day mail (deduped)
- [ ] Verify "Preview their moment" link is visible and functional in
  both states
- [ ] Test adding contributor to already-active capsule — invite email
  fires immediately
- [ ] Verify gift capsule pricing card renders correctly
- [ ] Test swipe between pricing cards on mobile

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
  9-contribution seeded demo with stock Unsplash photos + the ElevenLabs
  stock voice note (falls back to W3C horse sample if `vault-mom.mp3`
  hasn't been generated / uploaded yet via `/admin/audio`)

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
- [ ] Create Gift Capsule → all 6 steps (incl. recipient email step) → verify DRAFT
- [ ] Create couple Gift Capsule → enter both recipient emails → verify both
  saved on the capsule row (`recipientEmail`, `recipient2Email`)
- [ ] Add contributors to DRAFT → verify list
- [ ] Activate capsule → activate modal is just summary → pay (no contact step)
  → verify ACTIVE + invite emails fire
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
- [ ] **Generate / upload stock voice clips** — `/admin/audio` has two
  slots: `vault-mom` (time capsule mock) and `capsule-birthday` (gift
  capsule mock). Either Generate via ElevenLabs (paid plan needed —
  Railway's shared IPs trip the free-tier abuse heuristic) or Upload
  MP3s you generated elsewhere. Scripts live in
  `src/lib/elevenlabs.ts`; voice IDs overridable via
  `ELEVENLABS_VOICE_VAULT_MOM` / `ELEVENLABS_VOICE_CAPSULE_BIRTHDAY`.
- [ ] **"How to use untilThen" marketing video** — short walkthrough for
  landing page. Show create → write → invite → reveal flow. Keep under
  60 seconds

---

## 🟣 Tabled / Paused

- [ ] **Slim the Railway image** — the built image is currently 622 MB,
  which makes Railway's image-push stage take 5–15+ minutes per deploy.
  During that window the old container has already drained and the new
  one doesn't exist yet, so the site 502s until the push finishes.
  (The 8s health-grace + lifecycle-hook fix in `173a104` means the
  container-side behavior is fine once it starts — the 502s were
  image-push slowness, not container startup.)

  **Two attempts this session, both reverted:**

  1. **Nixpacks in-place prune** (`12a1119` → `f2deb47`, reverted in
     `8ef6516`, `8da4626`, `764433a`). Tried merging `npm ci` + `next
     build` + `npm prune --omit=dev` into a single RUN, plus moving
     `prisma` to runtime deps. Two build failures — `npm ci` hit
     `EBUSY` on BuildKit's `node_modules/.cache` bind mount — and
     when finally placed in the install phase the image somehow grew
     from 622 MB → 699 MB.

  2. **Multi-stage Dockerfile** (`7be2f63` → `82ae2cc`, reverted in
     `f10547d`, `f78626f`, `022082a`, `96b5593`). Builder stage did
     full install + build + `npm prune --omit=dev`, runtime stage
     copied the pruned tree. Image dropped to 434 MB (-30%) and
     first deploy came up clean. But subsequent restarts and
     deploys crashed with no usable stdout — Deploy Logs showed
     only `curl: (22) 502` (Railway's healthcheck probe failing),
     no `[start ...]` stage markers from the CMD. Never pinned
     down whether the CMD itself was failing to exec (bash issue?
     JSON escape?) or whether something earlier in the container
     boot was dying silently.

  **When resuming** (desktop, not mobile — both attempts hit walls
  that needed `docker build` + `docker run` locally to triage):
  1. Start with the exact Dockerfile that gave us 434 MB on first
     deploy (see git history around `82ae2cc`) — that part worked.
  2. Debug the restart-crash separately. First guess: try a simple
     `CMD ["sh", "-c", "printf hello && sleep 5"]` to confirm CMD
     is running at all; if even that doesn't log, the issue is
     Railway routing or healthcheck, not the container.
  3. Consider writing the start command as a committed shell script
     file (`scripts/start.sh`) instead of an inline JSON-encoded
     bash command — easier to read, no escape pitfalls.
  4. Alternative: leave image as-is and accept the slow push. User
     workflow is already "push → wait 2–5 min → site updates."
