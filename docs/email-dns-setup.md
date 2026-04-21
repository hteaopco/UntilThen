# Email Deliverability — DNS Setup

untilThen sends transactional email via **Resend** from
`hello@untilthenapp.io`. Three DNS record types need to be in place
at the DNS provider for `untilthenapp.io` before launch:

1. **SPF** — tells inbox providers "Resend is allowed to send as us"
2. **DKIM** — cryptographic signature so inbox providers can verify
   a message actually came from us
3. **DMARC** — instructs inbox providers what to do when SPF or
   DKIM fails, and where to send reports

Failing any of these puts mail in spam at Gmail / Outlook / iCloud.
DMARC in particular has been enforced by Google and Yahoo since
Feb 2024 for senders above 5,000 messages/day — we'll cross that
threshold on a single invite blast.

---

## Step 1 — Let Resend generate the DKIM selector

1. Log in to Resend → **Domains** → **Add Domain**
2. Enter `untilthenapp.io`
3. Resend will show a set of DNS records. The exact selector is
   account-specific (usually `resend._domainkey` but can differ)

Copy the records Resend gives you. They'll look roughly like:

| Host                        | Type  | Value                                  |
| --------------------------- | ----- | -------------------------------------- |
| `send.untilthenapp.io`      | MX    | `feedback-smtp.us-east-1.amazonses.com` priority 10 |
| `send.untilthenapp.io`      | TXT   | `v=spf1 include:amazonses.com ~all`    |
| `resend._domainkey.untilthenapp.io` | TXT | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADC...` (long key) |

**Paste them into Cloudflare (or whichever DNS provider hosts
`untilthenapp.io`) exactly as Resend shows them.** Then click
**Verify** in Resend.

---

## Step 2 — Apex SPF record

If the domain already sends mail from other services (Google
Workspace, Mailgun, etc.), SPF records from multiple senders need
to be **merged into one TXT record**. You can't have two `v=spf1`
records on the same host.

For Resend-only, add:

```
Host:  @  (apex / untilthenapp.io)
Type:  TXT
Value: v=spf1 include:amazonses.com ~all
```

If Google Workspace handles inbound, merge:

```
v=spf1 include:_spf.google.com include:amazonses.com ~all
```

`~all` = soft-fail (recommended during ramp-up). Tighten to `-all`
after a few weeks of clean DMARC reports.

---

## Step 3 — DMARC record

Start in **monitor mode** so we can see what's happening without
breaking deliverability.

```
Host:  _dmarc  (resolves to _dmarc.untilthenapp.io)
Type:  TXT
Value: v=DMARC1; p=none; rua=mailto:dmarc@untilthenapp.io; ruf=mailto:dmarc@untilthenapp.io; fo=1; adkim=s; aspf=s; pct=100
```

What each tag does:

- `p=none` — don't reject or quarantine yet, just report
- `rua=` — aggregate reports (daily XML from Gmail/etc.) go here
- `ruf=` — forensic reports (per-message failures) go here
- `fo=1` — request a forensic report on any SPF *or* DKIM failure
- `adkim=s aspf=s` — strict alignment (subdomain mismatches count as fail)
- `pct=100` — apply the policy to 100% of mail

**After 2 weeks of reports** with no unauthorized sources showing
up, tighten to `p=quarantine` (spam folder). Another 2 weeks clean
and you can move to `p=reject`.

---

## Step 4 — Reply-to mailbox

`hello@untilthenapp.io` is set as both From and Reply-To on every
transactional email. Make sure that mailbox:

- Actually exists and is monitored (Google Workspace, Fastmail, etc.)
- Has its own MX records configured (unrelated to Resend's
  `send.untilthenapp.io` MX — that one is for Resend's bounce
  processing)
- Has an auto-responder if you don't want to monitor 24/7

---

## Step 5 — Verify

Once DNS propagates (a few minutes to an hour):

1. Resend dashboard → Domains → `untilthenapp.io` → should show
   **Verified** for SPF and DKIM
2. Send a test email from `/admin/emails`
3. Receive it in Gmail → "Show original" → check:
   - **SPF: PASS**
   - **DKIM: PASS**
   - **DMARC: PASS**
4. Paste the raw headers into https://dmarcian.com/dmarc-inspector/
   or https://www.mail-tester.com for a second opinion and a
   spam-score breakdown

---

## Step 6 — Monitor

DMARC aggregate reports arrive as daily XML attachments at whatever
you set for `rua=`. If you'd rather not stare at XML, plug the
mailbox into one of the free ingestors:

- Postmark DMARC (free, good UI): https://dmarc.postmarkapp.com
- Dmarcian (free tier)
- Valimail Monitor (free tier)

Point `rua=` at their provided ingest address instead of
`dmarc@untilthenapp.io`.

---

## What I need from you

When you're ready to kick this off, send me:

1. **Resend DKIM record(s)** — the exact TXT host + value Resend
   shows in the Domains panel after you add `untilthenapp.io`. I
   can format them into a paste-ready block for your DNS provider.
2. **DMARC reporting email** — keep it at `dmarc@untilthenapp.io`
   (need to create this mailbox), or switch to a third-party
   ingestor like Postmark (free, readable UI).
3. **Strict DMARC timeline** — confirm you're OK starting at
   `p=none`, moving to `p=quarantine` after 2 weeks, `p=reject`
   after another 2. If you want to be more aggressive, say so.
4. **Any other senders on `untilthenapp.io`?** — Google Workspace,
   Mailchimp, transactional from a CRM, etc. All need to be merged
   into the single SPF record.
