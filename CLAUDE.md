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
