# Session setup — install deps first

Run `npm install` at the start of every session, before making any
code changes. Without `node_modules` you can't typecheck (`npx tsc
--noEmit`) or lint locally, which means TypeScript errors only
surface once Railway rebuilds — slow, painful, and avoidable.

After dependencies are installed, run `npx tsc --noEmit` before
pushing any commit. Railway's build does the same check; catching
errors locally saves the round-trip.

# Git workflow

Always commit and push directly to `main`. Do not create feature branches.
Every push goes straight to `main` so Railway auto-deploys immediately
without any manual merges.

- If the session was started on a feature branch, switch to `main`
  first, merge/rebase the work in, and push `main`.
- Empty commits are fine (and sometimes necessary) to force a
  Railway rebuild: `git commit --allow-empty -m "..."`.

# Email Templates — Sync Rule

When changing ANY email template copy (subject, body, CTA) in
`src/lib/capsule-emails.ts`, `src/lib/emails.ts`, or inline in
API routes, ALWAYS update the matching entry in the admin Emails
tab at `src/app/admin/emails/EmailTestClient.tsx` (the TEMPLATES
array) AND the test-fire endpoint at
`src/app/api/admin/test-emails/route.ts` so the admin UI and
test emails stay in sync with production.

# Nomenclature

Canonical glossary lives at `docs/glossary.md`. Read it before
writing user-facing copy. The short version:

- **Vault** — top-level container. One per user.
- **Time Capsule** — long-form sealed container inside the Vault.
  Many per Vault. May be for a child, but doesn't have to be.
- **Collection** — optional grouping inside a Time Capsule.
- **Entry** / **Memory** — single letter / photo / voice / video.
- **Gift Capsule** — separate product. Standalone occasion gift,
  not part of the Vault.

Do **not** say "child's vault", "the child's memory capsule", or
"vault for [name]" in user-facing copy. Say "Time Capsule".

Code lags copy by design: Prisma `Vault` model === a single Time
Capsule, Prisma `Child` model === the Time Capsule's subject,
Prisma `MemoryCapsule` model === Gift Capsule. The code rename is
a future Pass 2; until then, copy and code nomenclature diverge
and that's expected.

# Enterprise Gift Capsules — auto-activate at creation

Org-attributed gift capsules (`organizationId !== null`) skip the
$9.99 paywall, so `POST /api/capsules` stamps `status: ACTIVE`,
`isPaid: true`, `paidAt`, and `tokenExpiresAt` at creation time
when `attribution === "enterprise"`. Personal capsules still create
as DRAFT and run through `/api/capsules/[id]/activate` + Square
checkout.

Implications future code must respect:

- An enterprise capsule's `status === "DRAFT"` is rare (only legacy
  rows from before the auto-activation change). Code that branches
  on `isDraft` for enterprise should treat it as the cold path.
- `/api/capsules/[id]/invites` already routes ACTIVE+isPaid invites
  to PENDING with immediate email dispatch — saving contributors
  on an enterprise capsule sends emails right away. No `/activate`
  hop needed.
- `CapsuleOverview`'s "Send Contributor Invites" button (visible
  for `isOrgAttributed`) only opens the activate modal when the
  capsule is still DRAFT (legacy). For new enterprise capsules
  it just saves and refreshes; the emails fire from the invites
  endpoint itself.
- `sendCapsuleActivated` ("Your capsule is live.") was deleted —
  the dashboard already reflects the live state, so the email was
  redundant. Don't reintroduce it.

# `?redirect_url=` chain through auth

`/sign-up`, `/sign-in`, and `/onboarding` honour `?redirect_url=`
(relative paths only — same-origin guard via `startsWith("/")`).
The chain:

1. Caller pushes `/sign-up?redirect_url=/some/path`.
2. Sign-up page reads the param, sets `forceRedirectUrl` to
   `/onboarding?redirect_url=...` so it survives the Clerk hop.
3. `OnboardingPage` reads it, passes it to `OnboardingForm` as
   `redirectUrl` prop. Existing users (already-onboarded) bounce
   to `redirect_url` instead of `/home`.
4. `OnboardingForm.handleSubmit` pushes to `redirectUrl` after
   the `/api/onboarding` call succeeds.

Sign-in is simpler because there's no /onboarding stop — the page
hands `redirect_url` straight to Clerk's `forceRedirectUrl`.

When threading a new flow through auth, prefer `redirect_url` over
localStorage stashes. The reveal-claim flow
(`/reveal/<token>?claim=1`), capsule creation, and any future
"bounce a user through auth and back" feature all use this.

# Pending org invite auto-claim

`claimPendingOrgInvitesForUser(userId, email)` in `src/lib/orgs.ts`
finds every PENDING `OrganizationInvite` matching an email and:
- creates the `OrganizationMember` row (idempotent — skipped if it
  already exists),
- flips the invite to ACCEPTED with `acceptedUserId` set.

Wired into:
- `POST /api/onboarding` — runs immediately after user creation so
  new signups whose email matches an invite auto-join.
- `/home` page render — lazy backfill for users who signed up
  before this was added or skipped the magic link entirely.

Background: the legacy claim endpoint
`POST /api/orgs/invites/[token]/accept` only fires when the user
clicks the magic-link invite. Without the auto-claim helper, a user
signing up via the standard flow stranded the invite in PENDING
forever. New flows should NOT add a third claim path; instead make
sure the email matches and rely on the existing helper.

# Reveal save / claim flow

Recipients claim a gift capsule (link it to their Clerk account
permanently) by clicking "Save to your account" on the
`SavePromptScreen` that appears between the cinematic flow and the
gallery, OR via the persistent banner inside the gallery. Both
bounce through `/sign-up?redirect_url=/reveal/<token>?claim=1`.

When the recipient lands back at `/reveal/<token>?claim=1` with a
Clerk session, `RevealClient` POSTs to
`/api/capsules/[id]/save` (the magic token is sent in the body,
which the endpoint validates against `capsule.accessToken`),
flips an in-session `savedInSession` flag to suppress the prompt
+ banner without a remount, and strips `?claim=1` off the URL so a
refresh doesn't re-fire the claim.

`RevealCapsule.isSaved` (server-side `Boolean(recipientClerkId)`)
gates whether the prompt + banner ever render. Preview surfaces
(organiser preview, vault preview, contributor preview, curator
preview) all stamp `isSaved: true` so the save flow stays
invisible — the viewer there is the organiser, not the recipient.

`RevealExperience` exposes two props for the claim flow:
- `onSaveRequested: () => void` — fired by both the prompt and the
  banner.
- `externalSaved: boolean` — flips the local `saved` state without
  remount when the wrapper's claim handler succeeds.

# Stat board hides capsules where the viewer is the recipient

`/enterprise/stats` filters the recipient list (and its derived
active/sent counts) to exclude any capsule whose `recipientEmail`
or `recipient2Email` matches the viewer's Clerk primary email.
Avoids spoiling a manager's own gift when they happen to be both
admin and recipient. Aggregate org-wide totals stay unfiltered so
admins still see real volume.

If you add another surface that lists per-recipient capsule data,
mirror this filter before listing — leaking a manager-recipient's
own incoming capsule on a stat board is the bug the filter was
written to fix.
