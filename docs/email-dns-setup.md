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
inbound `hello@` mailbox) + Postmark-hosted DMARC reports. All
four records are Cloudflare TXT / MX entries, proxy disabled.

| Type | Name                  | Content                                                                                                                                 | Notes |
| ---- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| TXT  | `resend._domainkey`   | `v=DKIM1; k=rsa; p=<full key Resend generates>`                                                                                         | Selector is `resend`. Copy the entire `v=DKIM1; k=rsa; p=…` string from the Resend dashboard |
| TXT  | `@`                   | `v=spf1 include:amazonses.com include:spf.protection.outlook.com ~all`                                                                  | One record only per host — merge new senders into this one |
| MX   | `sendfeedback`        | `smtp.us-east-1.amazonses.com` priority 10                                                                                              | Bounce / feedback loop for SES under Resend — follow the exact Name + Value Resend shows (the subdomain label and hostname have shifted across Resend revisions) |
| TXT  | `_dmarc`              | `v=DMARC1; p=none; rua=mailto:re+<token>@dmarc.postmarkapp.com; adkim=r; aspf=r`                                                        | `<token>` comes from Postmark DMARC Digests — sign up at https://dmarc.postmarkapp.com and paste the emailed token in place |

After DNS propagates (5–15 min) click **Verify** in Resend → the
domain should flip to Verified with green ticks on SPF + DKIM.

### DMARC ramp

Start at `p=none` (monitor only). Review Postmark's weekly digest
for two weeks. Once there are no unauthorised sources and alignment
is passing, raise:

- Week 3+: `p=quarantine` (suspicious mail lands in spam)
- Week 5+: `p=reject` (hard fail on unaligned mail)

Edit the `_dmarc` TXT record in place for each step — no other
changes needed.

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
dig MX sendfeedback.untilthenapp.io +short
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

DMARC aggregate reports land in Postmark's UI via the `rua=` address
in the `_dmarc` record. Log in at https://dmarc.postmarkapp.com
weekly for the first month — look for:

- **Alignment** staying at 100% (no unexpected sources)
- **Pass rate** staying > 98% (the remaining 2% is typically
  forwarders + auto-replies that strip DKIM — expected background
  noise)
- New domains/IPs showing up in the "Sources" panel — investigate
  any unknown source before tightening past `p=none`
