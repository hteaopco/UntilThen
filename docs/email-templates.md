# untilThen — Email Template Reference

*Last updated: April 17, 2026*

All emails send from `hello@untilthenapp.io` with reply-to `hello@untilthenapp.io`.

---

## Gift Capsule Emails

*Source: `src/lib/capsule-emails.ts`*

| # | Function | Subject | Trigger |
|---|----------|---------|---------|
| 1 | `sendCapsuleInvite` | You're invited to contribute to {title} | Contributor invited |
| 2 | `sendCapsuleDraftSaved` | Your Gift Capsule is saved — complete setup to send invites | Organiser creates draft |
| 3 | `sendCapsuleDraftExpiring` | Your Gift Capsule draft expires tomorrow | Day 6 warning *(cron — not wired)* |
| 4 | `sendCapsuleActivated` | Your Gift Capsule is live — invites sent | Organiser activates/pays |
| 5 | `sendCapsuleContributionSubmitted` | New contribution to {title} | Contributor submits → sent to organiser |
| 6 | `sendCapsuleContributorReminder` | Reminder: contribute to {title} | 48hr deadline *(cron — not wired)* |
| 7 | `sendCapsuleRevealDay` | Your Gift Capsule is ready, {name} | Reveal date → magic link to recipient |
| 8 | `sendCapsuleNewLink` | Here's your new link, {name} | Recipient requests fresh link |
| 9 | `sendCapsuleSaved` | Your capsule is saved, {name} | Recipient creates account after opening |
| 10 | `sendContributorConfirmation` | Your contribution to "{title}" is saved | Contributor submits → sent to contributor with message preview + edit link |
| 11 | `sendContributorApproved` | Approved: your contribution to "{title}" | Organiser/admin approves → sent to contributor with edit link |
| 12 | `sendContributorRejected` | Changes requested: your contribution to "{title}" | Organiser/admin rejects → sent to contributor with edit link |

---

## Vault & Account Emails

*Source: `src/lib/emails.ts`*

| # | Function | Subject | Trigger |
|---|----------|---------|---------|
| 13 | `sendInviteAccepted` | Contributor accepted your invite | Vault contributor accepts → sent to parent |
| 14 | `sendEntryNeedsReview` | New entry needs review | Vault contributor seals entry → sent to parent |
| 15 | `sendEntryApproved` | Your entry was approved | Parent approves → sent to vault contributor |
| 16 | `sendEntryRejected` | Your contribution needs a small update | Parent rejects → sent to vault contributor |
| 17 | `sendAccountDeleted` | Your untilThen account has been deleted | User deletes account |
| 18 | `sendWritingReminder` | {child} is waiting for your next memory | Weekly cron — no entry in 30+ days |
| 19 | `sendRevealCountdown` | {days} days to go. {child}'s capsule opens {date} | Daily cron — 30/7/1 day countdown |

---

## Inline API Route Emails

| # | File | Trigger |
|---|------|---------|
| 20 | `src/app/api/invites/route.ts` | Vault contributor invite |
| 21 | `src/app/api/account/contributors/[id]/resend/route.ts` | Re-send vault contributor invite |

---

## Not Yet Wired

- **#3** `sendCapsuleDraftExpiring` — needs a cron job to check 6-day-old drafts
- **#6** `sendCapsuleContributorReminder` — needs a cron job to check 48hr deadline

---

## Cron Schedule

| Endpoint | Schedule | Description |
|----------|----------|-------------|
| `POST /api/cron/reveal` | Every 15 min | Reveal-day emails (timezone-aware) |
| `POST /api/cron/reminders` | Mondays 9am | Writing reminders (30+ days inactive) |
| `POST /api/cron/countdowns` | Daily 9am | Reveal countdown (30/7/1 day) |

All cron endpoints protected by `Authorization: Bearer <CRON_SECRET>`.
