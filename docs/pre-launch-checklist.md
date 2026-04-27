# untilThen — Pre-Launch Checklist
*Updated April 27, 2026*

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
- [ ] **Verify `editToken` migration on prod** — confirm
  `\d "CapsuleContribution"` shows the new `editToken TEXT` column
  with the `CapsuleContribution_editToken_key` unique index
  (migration `20260427_contribution_edit_token`). Required for the
  wedding editable-card flow; POST will throw on `editToken` until
  the column exists.
- [ ] **Terms of Service + Privacy Policy legal review** — minors' data,
  long-term storage, data export on request
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

- [ ] **Couple capsules deliver to both addresses** — seed a couple capsule,
  jump the reveal date, run `/api/cron/reveal`, confirm both
  `recipientEmail` and `recipient2Email` receive the reveal-day mail (deduped)

---

## 🟠 Reveal Visual QA

The full recipient reveal runs through `RevealExperience` everywhere
(`/reveal/[token]`, organiser preview, vault preview, contributor
preview, admin mock). Remaining work is hands-on device QA.

### Stories + Transition + Gallery

*All Story/Transition/Gallery card behaviours verified Apr 27, 2026.
PhotoCard, LetterCard (preview + expanded), VoiceCard (with music
ducking), TransitionScreen, music fade-out, GalleryScreen, search,
type pills, clear-all, grid/list toggle, and GalleryCard
full-screen tap all confirmed working. Pruned per the doc
convention; see git history if you need the prior list.*

### Preview surfaces
- [ ] **Organiser preview** (`/capsules/[id]/preview`) — This-capsule /
  Full-demo toggle works, Back link returns to capsule
- [ ] **Vault preview** (`/vault/[childId]/preview`) — variant clearly
  different (no People filter, named subhead)
- [ ] **Contributor preview** (inside contribute flow) — shows their single
  message through full Entry → Story sequence
- [ ] **Admin mock — Vault** (`/admin/previews` → "Recipient Reveal —
  Vault (Mock)") — 15-contribution time-capsule demo following Olivia
  from birth (2031) through her wedding (2056). 5 Story highlights
  (baby photo, wedding photo, mom's voice, letter at age 10, letter
  at age 25) + 10 gallery letters from family. Voice card uses the
  ElevenLabs vault-mom clip (W3C fallback before upload). Exercises
  the Transition screen.
- [ ] **Admin mock — Gift Capsule** (`/admin/previews` → "Recipient
  Reveal — Gift Capsule (Mock)") — 15-contribution adult-birthday
  demo: 5 Story highlights + 10 gallery letters. Voice card uses the
  ElevenLabs capsule-birthday clip (W3C fallback before upload).
  Exercises the Transition screen.

### Platform
- [ ] **iOS Safari** — gate satisfies autoplay, music actually plays,
  no overflow, safe-area insets respected
- [ ] **Android Chrome** — same
- [ ] **Desktop 1440+** — centered layout reads right; music still
  autoplays after gate tap
- [ ] **Tone** — the new flow doesn't branch on tone (no confetti/fireworks
  variants). Re-decide whether to port or leave minimalist

---

## 🟠 Session Apr 27 — New Surfaces QA

Hands-on verification for everything shipped this session. Group
by feature so each can be checked off independently as you walk
through the device tests.

### Wedding contributor flow
- [ ] **"Preview my message" CTA** appears on the thank-you screen
  alongside "Make one for someone you love" (commit `0a704b1` /
  `cbde6ae`)
- [ ] **Full-reveal preview** — tapping "Preview my message" launches
  the same RevealExperience pipeline the recipient sees: gate
  (tap-to-begin) → entry → story cards → gallery, with background
  music. Single-message contribution array — only the previewer's
  own message appears.
- [ ] **Gate banner copy** reads exactly: *"This is a preview of your
  own message. On reveal day, {names} will see yours alongside
  every other guest's."*
- [ ] **Explainer modal** auto-opens the moment the gallery loads:
  *"{names} will be able to filter through every message left for
  them in this gallery..."* with **Exit preview** (→ /weddings)
  and **Keep looking** (dismiss) buttons.
- [ ] **Roses corner** (not the gift-box FlowerCorner) renders on the
  closed-capsule and thank-you screens.
- [ ] **Post-seal email prompt** ("One more thing — Want to be able to
  edit this later?") fires *before* the "Sealed for {names}"
  typewriter, not after.
  - [ ] **Yes** path → email field → Send → confirmation → Continue
    → typewriter
  - [ ] **No thanks** path → typewriter
  - [ ] **Skip** mid-form path → typewriter
  - [ ] Bad-format email shows inline error; doesn't proceed.
- [ ] **Editable-card email** delivers (subject *"Edit your message
  for {names}"*); link is `/wedding/<guestToken>?edit=<editToken>`.
- [ ] **Edit-mode bootstrap** — opening that link drops the user
  straight into the editor pre-populated with their original
  authorName, body text, and media. No splash, no card phase.
- [ ] **Edit submit** PATCHes (doesn't POST), skips the email prompt
  the second time around, lands in the typewriter.
- [ ] **Edit window closes when capsule SEALED** — past the contributor
  deadline (or organiser-triggered seal), the edit URL returns the
  "contributions closed" screen rather than re-opening the editor.

### Public marketing surfaces
- [ ] **`/weddings` accessible signed-out** — sales pitch + flyer load
  without bouncing to /sign-in.
- [ ] **`/business` accessible signed-out** — same.
- [ ] **`/weddings/faq` and `/business/faq` accessible signed-out**.
- [ ] **`/wedding/<guestToken>` (guest contributor) accessible
  signed-out** — QR-scanned guests don't get bounced to sign-in.
- [ ] **TopNav (signed-out)** — only Home button visible (back +
  account-settings buttons hidden, avatar slot hidden). Home
  button routes to `/`.
- [ ] **Login CTAs route correctly:**
  - `/weddings` signed-out → `/sign-up?redirect_url=/weddings/dashboard`
  - `/weddings` signed-in → `/weddings/dashboard`
  - `/business` signed-out → `/sign-up?redirect_url=/enterprise`
  - `/business` org-member → `/enterprise`
  - `/business` signed-in non-org → CTA hidden entirely

### Enterprise email routing
- [ ] **#23 Org Invite (new user) email** routes to
  `/business?invite=<token>`. Visitor reads pitch → clicks Login
  → lands on `/sign-up?redirect_url=/enterprise/invite/<token>`.
  After signup, Clerk forwards to the invite page and the row
  is auto-claimed (verify `OrganizationMember` is created and
  invite status flips to ACCEPTED).
- [ ] **#24 Org Invite (existing user) email** routes to `/business`
  (no token needed — they're already auto-joined).

### Stat Board
- [ ] **No wedding leakage** — every count (capsules, recipients,
  contributions, status breakdown) excludes `occasionType: WEDDING`.
  Same scope on `/api/orgs/[id]/stats`.
- [ ] **Recipients section** lists every gift sent under the org
  (excludes DRAFT). Each row shows recipient name + email,
  capsule title, contribution count, status badge ("Live" /
  "Sealed" / "Opened"), and "Sent {date}" / "Scheduled for {date}"
  hint that flips based on whether revealDate has passed. Tapping
  a row deep-links to `/capsules/[id]`.
- [ ] **Empty state** ("No gifts have gone out yet") renders when
  no non-draft capsules exist.

### Disclosures + FAQ
- [ ] **`/privacy` section 7.2** reads accurately — infrastructure-
  level encryption (Railway Postgres + Cloudflare R2), signed URLs,
  scrypt PINs, audit-logged admin access, plus the explicit
  disclosure that letter content isn't application-level encrypted
  yet.
- [ ] **FAQ Q1 ("What is untilThen?")** renders the new full-product
  copy (Time Capsules / Gift Capsules / Wedding Capsules / Teams).
- [ ] **FAQ "Who can see my entries?"** matches `/privacy` 7.2 — no
  contradictions for a regulator to point at.
- [ ] **FAQ "Why We Built untilThen" banner** appears above the
  accordion in an amber-tint card; both scripture references
  (Proverbs 18:21, Matthew 12:34 paraphrase) italicised.

### Misc
- [ ] **`/home` top-right enterprise pill removed** — confirm signed-in
  org members and signed-in non-org users both see only the
  avatar (no Building2 pill). Bottom Enterprise bubble still
  routes to `/business`.
- [ ] **Admin Emails tab #26 Wedding Edit Link** appears in
  `/admin/emails`; the test-fire endpoint sends a sample correctly.
- [ ] **Admin Emails tab #23 / #24 preview copy** matches the new
  /business routing (per CLAUDE.md sync rule).

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

## 🔵 v2

- [ ] **Reveal theme picker** — currently a "Coming soon" placeholder.
  Decide whether to ship at launch or defer. If shipping, pick 2–3
  background/color variants

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
