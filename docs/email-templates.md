# untilThen — Email Template Reference

*Last updated: April 17, 2026*

All emails send from `hello@untilthenapp.io` with reply-to `hello@untilthenapp.io`.

---

## System Principle

Every email does ONE job:
- **Pull back in** (re-engage)
- **Push forward** (next action)
- **Deepen emotion** (attachment → long-term retention)

---

## Behavioral Funnel

### 1. Acquisition (Viral Loop)
- #1 Invite Contributor
- #20 Vault Contributor Invite (API)
- #21 Resend Invite

### 2. Activation (First Action)
- #10 Contributor Confirmation
- #5 Contribution Submitted
- #2 Draft Saved
- #9 Capsule Saved

### 3. Completion (Revenue Moment)
- #3 Draft Expiring
- #4 Capsule Activated

### 4. Engagement (Ongoing Use)
- #18 Writing Reminder
- #6 Contributor Reminder
- #13 Invite Accepted
- #14 Entry Needs Review
- #15 Approved
- #16 Rejected

### 5. Anticipation (Emotional Build)
- #19 Countdown
- #7 Reveal Day

### 6. Retention / Loop
- #8 New Link
- #11 Contributor Approved
- #12 Contributor Rejected
- #17 Account Deleted (last touchpoint)

---

## Gift Capsule Emails

*Source: `src/lib/capsule-emails.ts` — 12 templates*

| # | Function | Subject | CTA |
|---|----------|---------|-----|
| 1 | `sendCapsuleInvite` | {name} will read this one day. | Leave your message |
| 2 | `sendCapsuleDraftSaved` | You started something meaningful. | Continue building |
| 3 | `sendCapsuleDraftExpiring` | Don't lose this. | Finish your capsule |
| 4 | `sendCapsuleActivated` | It's happening. | View your capsule |
| 5 | `sendCapsuleContributionSubmitted` | Someone just added something for {name} | Review contribution |
| 6 | `sendCapsuleContributorReminder` | Don't miss this. | Leave your message |
| 7 | `sendCapsuleRevealDay` | It's time. | Open your capsule |
| 8 | `sendCapsuleNewLink` | Here's your new link | Open your capsule |
| 9 | `sendCapsuleSaved` | This is yours now. | Go to your vault |
| 10 | `sendContributorConfirmation` | This is going to mean everything to them. | Edit your message |
| 11 | `sendContributorApproved` | Your message is in. | View your message |
| 12 | `sendContributorRejected` | Small update needed | Edit your message |

---

## Vault & Account Emails

*Source: `src/lib/emails.ts` — 7 templates*

| # | Function | Subject | CTA |
|---|----------|---------|-----|
| 13 | `sendInviteAccepted` | Someone just joined you | View your capsule |
| 14 | `sendEntryNeedsReview` | Something new is waiting | Review entry |
| 15 | `sendEntryApproved` | It's been added | View your message |
| 16 | `sendEntryRejected` | Almost there | Edit entry |
| 17 | `sendAccountDeleted` | Your account has been deleted | — |
| 18 | `sendWritingReminder` | Don't forget this version of them. | Write a memory |
| 19 | `sendRevealCountdown` | Tomorrow changes everything / One week to go / One month from now | View your capsule |

---

## Inline API Route Emails

| # | File | Subject | CTA |
|---|------|---------|-----|
| 20 | `src/app/api/invites/route.ts` | {name} will read this one day. | Leave your message |
| 21 | `src/app/api/account/contributors/[id]/resend/route.ts` | Just a reminder | Leave your message |

---

## Couples Logic

All recipient-facing emails derive pronouns from the recipient name:
- Single: "she'll" / "her" / "she"
- Couple (name contains "&"): "they'll" / "them" / "they"
- First name mentioned once, then pronouns thereafter
- Display name: "Ann" (single) or "Ann & Bob" (couple)

---

## Not Yet Wired to Triggers

- **#3** `sendCapsuleDraftExpiring` — needs cron job for 6-day-old drafts
- **#6** `sendCapsuleContributorReminder` — needs cron job for 48hr deadline

---

## Cron Schedule

| Endpoint | Schedule | Description |
|----------|----------|-------------|
| `POST /api/cron/reveal` | Every 15 min | Reveal-day emails (timezone-aware) |
| `POST /api/cron/reminders` | Mondays 9am | Writing reminders (30+ days inactive) |
| `POST /api/cron/countdowns` | Daily 9am | Reveal countdown (30/7/1 day) |

All cron endpoints protected by `Authorization: Bearer <CRON_SECRET>`.
