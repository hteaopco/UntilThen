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

## Records in production

Resend-issued DKIM + merged SPF (Resend + Microsoft 365 for the
inbound `hello@` mailbox) + a minimal DMARC record in monitor
mode. All four records are Cloudflare TXT / MX entries, proxy
disabled.

| Type | Name                  | Content                                                                                                                                 | Notes |
| ---- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| TXT  | `resend._domainkey`   | `v=DKIM1; k=rsa; p=<full key Resend generates>`                                                                                         | Selector is `resend`. Copy the entire `v=DKIM1; k=rsa; p=…` string from the Resend dashboard |
| TXT  | `@`                   | `v=spf1 include:amazonses.com include:spf.protection.outlook.com ~all`                                                                  | One record only per host — merge new senders into this one |
| MX   | `send`                | `feedback-smtp.us-east-1.amazonses.com` priority 10                                                                                     | Bounce / feedback loop for SES under Resend |
| TXT  | `_dmarc`              | `v=DMARC1; p=none; adkim=r; aspf=r`                                                                                                     | Monitor mode, no reporting ingestor yet — add `rua=` at the `p=quarantine` step |

After DNS propagates (5–15 min) click **Verify** in Resend → the
domain should flip to Verified with green ticks on SPF + DKIM.

### DMARC ramp

Start at `p=none` (monitor only). At `p=none`, nothing gets blocked
or spam-foldered regardless of alignment — the policy is purely
advisory — so the reports aren't actionable yet. Skipping the
ingestor keeps today's setup minimal.

When you're ready to tighten the policy:

- **Week 3+**: sign up `untilthenapp.io` at
  https://dmarc.postmarkapp.com (free, readable UI). Paste the
  emailed token into a new `rua=` tag and tighten to `quarantine`:
  ```
  v=DMARC1; p=quarantine; rua=mailto:re+<token>@dmarc.postmarkapp.com; adkim=r; aspf=r
  ```
  Review Postmark digests weekly for 2 weeks. Any unexpected
  sources or alignment failures get investigated here before the
  next step.
- **Week 5+**: `p=reject` — hard fail on unaligned mail.

Edit the `_dmarc` TXT record in place for each step.

---

## Reply-to mailbox

`hello@untilthenapp.io` is set as both From and Reply-To on every
transactional email, and the apex SPF includes
`spf.protection.outlook.com` because inbound `hello@` is handled by
Microsoft 365. Make sure that mailbox:

- Exists and is monitored (M365)
- Has its own MX + autodiscover records pointing at Microsoft
  (those are separate from the `sendfeedback` MX for Resend bounces)
- Has an auto-responder if it isn't going to be monitored 24/7

---

## Verify

Once DNS propagates (5–15 min):

```sh
dig TXT resend._domainkey.untilthenapp.io +short
dig TXT untilthenapp.io +short
dig TXT _dmarc.untilthenapp.io +short
dig MX send.untilthenapp.io +short
```

All four should return the values from the table above.

Then in Gmail:

1. Send a test from `/admin/emails`
2. Open the received email → ⋮ menu → **Show original**
3. Confirm:
   - **SPF: PASS** with domain `untilthenapp.io`
   - **DKIM: 'PASS' with domain untilthenapp.io**
   - **DMARC: 'PASS'** with domain `untilthenapp.io`

For a second opinion and a full spam-score breakdown, send the
same test to the temporary address at https://www.mail-tester.com
and review the 10/10 scorecard there.

---

## Monitor

No DMARC reporting set up at the `p=none` stage — reports without
an enforcement policy are mostly noise. Revisit when the policy
moves to `p=quarantine` (see the DMARC ramp section above), at
which point Postmark's free ingestor becomes worth the 2-minute
signup.

In the meantime, eyeball deliverability by sending a weekly test
through `/admin/emails` → a Gmail + an Outlook + an iCloud inbox
→ confirm all three land in the primary inbox, not spam.
