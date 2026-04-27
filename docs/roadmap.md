# Roadmap

Living document for work that is intentionally deferred. Each
entry records: what the work is, why it's not "now", and what
would pull it forward into the active backlog.

---

## v2 — Hive content moderation (re-enable)

**Status:** Parked for v2. Hive integration is wired in
`src/lib/hive.ts` but the API keys we hold currently 403 against
the V2 sync endpoint (diagnosed as V3 playground keys hitting a
V2 path). Code is in place and fail-open, so contributions still
flow at launch — just unscanned.

**Why deferred:** Resolving the auth path either needs (a) a V2
production key issued from the same Hive project as the playground
key, or (b) updating `lib/hive.ts` to call the V3 endpoint and
parse the V3 response shape (different field names than V2's
`output[].classes[]`). Both require live Hive docs / dashboard
access; neither is a launch-day blocker.

**Pull-forward triggers:**

1. First flagged-content incident on production (a contribution
   that should have been blocked goes through unscanned).
2. Hive issues a V2-compatible production key for our project —
   then it's a 5-minute env-var update, no code change.
3. Volume of guest contributions reaches the point where manual
   abuse review can't keep up.

**On-ramp:** Keep the diagnostic logging in `callHive` (added this
session) so the next time Hive is wired we get actionable Sentry
output, not a generic 403.

**Don't:** Speculate at the V3 endpoint URL or auth scheme without
the docs in front of us — the previous round of guessing at
"Basic auth + base64(ID:SECRET)" turned out to be wrong, and the
V3 endpoints aren't reachable through WebFetch (Hive's docs site
is JS-rendered).

---

## v3 — Per-account envelope encryption of user content

**Status:** Deferred to v3. The privacy page (`src/app/privacy/page.tsx`
section 7.2) currently discloses that letter content is *not*
application-level encrypted today; that disclosure stands until
this work ships and the section is rewritten.

**Why deferred:** Infrastructure-level encryption (Railway-managed
Postgres volumes, Cloudflare R2) plus the existing audit log,
signed URLs, and scrypt-hashed PINs is an above-average baseline
for a small operator. The 3–4 weeks of engineering required for
per-account encryption is better spent on PMF work until one of
the trigger conditions below fires.

**Pull-forward triggers** (any one of these flips this from v3
to "ship this quarter"):

1. First enterprise customer whose security questionnaire requires
   per-account or customer-controlled key encryption of stored
   user content.
2. Headcount with prod DB access exceeds two people.
3. Paying-customer count crosses ~5,000.
4. Series A diligence begins (6+ months before close).
5. A public accusation that untilThen staff have read a user's
   letter content.
6. April 27, 2027 — hard calendar floor regardless of the above.

**Cheap on-ramp to do before the trigger fires** (does not require
the full project):

- Confirm every admin tool that reads letter or contribution
  content writes an `AdminAuditLog` row. The "we know who looked
  at what" story is what customers actually care about; encryption
  is partly a proxy for it. This is already-relevant work
  regardless of v3.

KMS account setup is *not* on this list. Provisioning a KMS master
key is genuinely ~30 minutes when the trigger fires — the
"1-week sprint vs 4-week project" framing applies to the
crypto library, schema migration, backfill, and cutover, not to
the KMS account itself. Adding an AWS account pre-launch costs
billing/IAM/incident surface area that isn't repaid by the
30 minutes saved a year out.

**Scope when the work begins** (full plan archived in conversation
history; high-level only here):

- Add `User.wrappedDek` (KMS-wrapped per-user data encryption key).
- Add `*Encrypted Bytes?` columns alongside the plaintext columns
  on `Entry`, `CapsuleContribution`, `MemoryCapsule.recipientEmail`.
- Build `src/lib/crypto.ts` with `encryptForUser` / `decryptForUser`
  using AES-256-GCM and per-request DEK caching.
- Backfill in chunks; cut over read + write sites; drop plaintext
  columns after a one-week soak.
- Resolve six policy questions before code lands: Hive scanning of
  encrypted content, public guest contributions whose DEK to use,
  admin moderation read access, capsule-transfer re-encryption,
  account-recovery escrow, KMS disaster-recovery runbook.

**Cost when shipped:** ~$1/month KMS + the engineering time. Slows
the admin moderation flow; constrains future search/sort features
on encrypted columns.
