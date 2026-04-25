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
