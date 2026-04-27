import type { Metadata } from "next";

import { LegalShell } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy — untilThen",
  description:
    "How untilThen collects, uses, and protects your data — with our strongest commitments around children's privacy.",
};

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Privacy Policy"
      title="Your data, treated with care."
      meta={
        <>
          Last updated: April 15, 2026 · Effective: April 15, 2026
        </>
      }
    >
      <h2>Our Commitment to You</h2>
      <p>
        untilThen was built to help families preserve memories across time. We
        take the trust you place in us — especially when it involves the
        people you love — with the utmost seriousness. This Privacy Policy
        explains what we collect, how we use it, and how we protect it.
      </p>
      <p>
        <strong>
          We will never sell your data. We will never use your recipients&rsquo;
          information for advertising. We will never share your memories with
          anyone who isn&rsquo;t you.
        </strong>
      </p>
      <p>
        If you have questions about this policy, contact us at{" "}
        <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>.
      </p>

      <hr />

      <h2>1. Who We Are</h2>
      <p>
        untilThen is operated by Untilthenapp, LLC (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;, &ldquo;our&rdquo;). Our registered address is 1200
        Camellia Blvd STE 203, Lafayette, LA 70508.
      </p>

      <hr />

      <h2>2. What Information We Collect</h2>

      <h3>2.1 Account Information</h3>
      <p>When you create an account we collect:</p>
      <ul>
        <li>Your name and email address</li>
        <li>Your password (stored encrypted — we never see it in plain text)</li>
        <li>Your phone number (optional, for launch notifications only)</li>
        <li>Your date of birth (optional, for demographic purposes only)</li>
      </ul>

      <h3>2.2 Time Capsule Recipient Information</h3>
      <p>When you create a Time Capsule we collect:</p>
      <ul>
        <li>The recipient&rsquo;s first name</li>
        <li>The recipient&rsquo;s date of birth (optional)</li>
        <li>The Time Capsule&rsquo;s reveal date</li>
      </ul>
      <p>
        <strong>
          We collect the absolute minimum information necessary about
          recipients.
        </strong>{" "}
        We do not collect recipients&rsquo; email addresses, phone numbers,
        photos of recipients&rsquo; faces for identification purposes, or any
        biometric data. Names and birthdays are stored solely to personalise
        the Time Capsule experience.
      </p>

      <h3>2.3 Content You Create</h3>
      <p>
        We store everything you write, record, upload, or create within the
        app:
      </p>
      <ul>
        <li>Letters and written entries</li>
        <li>Voice recordings</li>
        <li>Photos and videos</li>
        <li>Collection titles and descriptions</li>
      </ul>
      <p>
        This content belongs to you. We store it to deliver the service. We do
        not read, analyse, or use your content for any purpose other than
        storing it and delivering it to you and your designated recipients.
      </p>

      <h3>2.4 Gift Capsule Recipients</h3>
      <p>
        For Gift Capsules, we collect the recipient&rsquo;s name and email
        address to deliver the capsule on the reveal date. Recipients who
        create accounts to save their capsule are subject to this Privacy
        Policy.
      </p>

      <h3>2.6 Payment Information</h3>
      <p>
        Payment processing is handled by Square. We do not store your credit
        card number, CVV, or full payment details. We store only a payment
        reference ID from Square and your subscription status. Square&rsquo;s
        privacy policy applies to payment data.
      </p>

      <h3>2.7 Usage Data</h3>
      <p>
        We collect anonymised usage data through PostHog analytics including:
      </p>
      <ul>
        <li>Pages visited</li>
        <li>Features used</li>
        <li>
          Session recordings (with all text inputs masked — we cannot see what
          you write)
        </li>
        <li>Browser type and device type</li>
      </ul>
      <p>
        We use this data to improve the product. It is never linked to a
        recipient&rsquo;s identity.
      </p>

      <h3>2.8 Technical Data</h3>
      <ul>
        <li>IP address (for security and fraud prevention)</li>
        <li>Cookies and session tokens (for keeping you logged in)</li>
        <li>Error logs (to fix bugs)</li>
      </ul>

      <hr />

      <h2>3. Children&rsquo;s Privacy — Our Strongest Commitment</h2>
      <p>
        Time Capsule recipients can be anyone — yourself, a partner, a
        parent, a friend, or a child. When a recipient is under 13, we apply
        the additional protections described in this section.
      </p>

      <h3>3.1 COPPA Compliance</h3>
      <p>
        untilThen complies with the Children&rsquo;s Online Privacy Protection
        Act (COPPA). We do not knowingly collect personal information directly
        from children under 13 for the purpose of creating accounts.
      </p>
      <p>
        <strong>Account creators</strong> — Vault owners, contributors, and
        Gift Capsule organisers — must be 18 or older. They create and manage
        Time Capsules on behalf of recipients.
      </p>
      <p>
        <strong>Recipients</strong> — receive Time Capsules at whatever age
        the Vault owner designates as the reveal date. There is no minimum
        age for receiving a Time Capsule. When a recipient creates an account
        to access their Time Capsule at reveal, they do so at the age the
        Vault owner has chosen. If that age is under 13, the parent or
        guardian should assist with account creation and the parent remains
        responsible for the child&rsquo;s use of the service in accordance
        with COPPA.
      </p>

      <h3>3.2 Recipient Account Creation</h3>
      <p>
        Recipients only create untilThen accounts when their Time Capsule
        reveal date arrives. At no point do we solicit personal information
        from children to create accounts before they are of appropriate age.
      </p>

      <h3>3.3 What We Store About Recipients</h3>
      <p>We store only:</p>
      <ul>
        <li>First name (as entered by the Vault owner)</li>
        <li>Date of birth (optional, entered by the Vault owner)</li>
        <li>Reveal date (set by the Vault owner)</li>
      </ul>
      <p>
        We do not store recipients&rsquo; phone numbers, addresses, school
        information, photographs for identification purposes, or any other
        sensitive personal data.
      </p>

      <h3>3.4 Time Capsule Content</h3>
      <p>
        Photos, videos, and voice recordings uploaded to a Time Capsule are
        stored securely and are never accessible to anyone other than the
        Vault owner, approved contributors, and the recipient themselves
        after the reveal date.
      </p>

      <h3>3.5 No Advertising to Children</h3>
      <p>
        We do not serve advertising of any kind. We do not use children&rsquo;s
        data for any commercial purpose. We do not share children&rsquo;s data
        with advertisers, data brokers, or third-party marketing platforms.
        Ever.
      </p>

      <h3>3.6 Vault-Owner Control</h3>
      <p>
        Vault owners have full control over their Time Capsules at all times:
      </p>
      <ul>
        <li>Delete individual entries</li>
        <li>Delete the entire Time Capsule</li>
        <li>Transfer Vault ownership to a designated trustee</li>
        <li>Request complete data deletion</li>
      </ul>

      <hr />

      <h2>4. Absolute Prohibitions — Zero Tolerance</h2>
      <p>
        The following are strictly prohibited on untilThen and will result in
        immediate account termination, reporting to law enforcement, and
        vigorous legal action:
      </p>

      <h3>4.1 Child Sexual Abuse Material (CSAM)</h3>
      <p>
        <strong>
          The upload, storage, sharing, or distribution of any sexually
          explicit material involving minors is absolutely prohibited.
        </strong>{" "}
        This includes photographs, videos, illustrations, or any other media.
      </p>
      <p>Any such content discovered on our platform will be:</p>
      <ol>
        <li>Immediately removed</li>
        <li>
          Reported to the National Center for Missing and Exploited Children
          (NCMEC) as required by law
        </li>
        <li>Reported to the FBI and relevant law enforcement agencies</li>
        <li>
          Subject to the fullest civil and criminal legal action available
        </li>
      </ol>
      <p>
        <strong>
          We take this with absolute seriousness. There are no warnings, no
          second chances, and no exceptions.
        </strong>
      </p>

      <h3>4.2 Grooming or Exploitation</h3>
      <p>
        Using untilThen to groom, exploit, manipulate, or gain inappropriate
        access to minors is strictly prohibited and will be reported to law
        enforcement immediately.
      </p>

      <h3>4.3 Misrepresentation</h3>
      <p>
        Creating accounts with false identities to gain access to a Time
        Capsule or to deceive contributors or recipients is prohibited.
      </p>

      <h3>4.4 Unauthorised Access</h3>
      <p>
        Attempting to access sealed Time Capsule content before the reveal
        date through any technical means is prohibited.
      </p>

      <hr />

      <h2>5. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide and improve the untilThen service</li>
        <li>
          Send emails you&rsquo;ve requested (confirmation emails, contributor
          invites, reveal day emails)
        </li>
        <li>
          Send occasional product updates (maximum once per month — you can
          unsubscribe at any time)
        </li>
        <li>Detect and prevent fraud and abuse</li>
        <li>Comply with legal obligations</li>
        <li>Respond to your support requests</li>
      </ul>
      <p>We do not use your information for:</p>
      <ul>
        <li>Advertising or marketing to third parties</li>
        <li>Selling to data brokers</li>
        <li>Training AI models</li>
        <li>Any purpose not listed above</li>
      </ul>

      <hr />

      <h2>6. How We Share Your Information</h2>
      <p>We share your information only in these limited circumstances:</p>

      <h3>6.1 Service Providers</h3>
      <p>We use trusted third-party services to operate untilThen:</p>
      <ul>
        <li>
          <strong>Clerk</strong> — authentication and account management
        </li>
        <li>
          <strong>Railway</strong> — hosting and database
        </li>
        <li>
          <strong>Cloudflare</strong> — media storage and DNS
        </li>
        <li>
          <strong>Resend</strong> — email delivery
        </li>
        <li>
          <strong>Square</strong> — payment processing
        </li>
        <li>
          <strong>PostHog</strong> — anonymised analytics
        </li>
      </ul>
      <p>
        Each provider is bound by their own privacy policies and data
        processing agreements. We share only the minimum data necessary for
        each provider to perform their service.
      </p>

      <h3>6.2 Legal Requirements</h3>
      <p>
        We may disclose information if required by law, court order, or to
        protect the safety of our users or the public. We will notify you of
        any such disclosure where legally permitted to do so.
      </p>

      <h3>6.3 Business Transfer</h3>
      <p>
        If untilThen is acquired or merged, your data may transfer to the new
        entity. We will notify you before any such transfer and give you the
        opportunity to delete your account.
      </p>
      <p>We do not sell your personal information. Ever.</p>

      <hr />

      <h2>7. Data Storage and Security</h2>

      <h3>7.1 Where We Store Data</h3>
      <p>
        Your data is stored on servers located in the United States. If you
        are located outside the United States, your data is transferred to and
        processed in the United States.
      </p>

      <h3>7.2 How We Protect Your Data</h3>
      <ul>
        <li>All data is encrypted in transit (TLS/HTTPS).</li>
        <li>
          Database storage volumes and media files are encrypted at rest by
          our infrastructure providers (Railway-managed Postgres and
          Cloudflare R2).
        </li>
        <li>
          Media files are served through signed, time-limited URLs &mdash; the
          underlying objects in storage are never publicly addressable.
        </li>
        <li>
          Sealed Time Capsule content is never transmitted to a recipient&rsquo;s
          device until the reveal date.
        </li>
        <li>
          Authentication is managed by Clerk; passwords are never stored by
          untilThen, and PINs you set on your vault are hashed with scrypt and
          never stored in plain text.
        </li>
        <li>
          Access to production systems is restricted to authorised personnel,
          and administrative actions on user data are recorded in an internal
          audit log.
        </li>
        <li>
          We do not currently apply application-level encryption to the
          content of letters, contributions, or media (beyond the
          infrastructure-level encryption described above). This means that
          authorised untilThen personnel with database access could
          technically read this content in the course of operating the
          service or responding to abuse reports. We are evaluating
          per-account encryption for a future release; this notice will be
          updated when that work ships.
        </li>
      </ul>

      <h3>7.3 Data Retention</h3>
      <ul>
        <li>
          <strong>Active accounts:</strong> Data retained for as long as your
          subscription is active
        </li>
        <li>
          <strong>Cancelled subscriptions:</strong> Entries preserved for 12
          months after cancellation, then deleted with 30 days notice
        </li>
        <li>
          <strong>Gift Capsule drafts:</strong> Deleted after 7 days if not
          activated
        </li>
        <li>
          <strong>Deleted accounts:</strong> Data purged within 30 days of
          account deletion request
        </li>
        <li>
          <strong>Legal holds:</strong> Data retained as required by law
        </li>
      </ul>

      <hr />

      <h2>8. Your Rights</h2>
      <p>
        Depending on your location, you may have the following rights:
      </p>

      <h3>8.1 Access</h3>
      <p>
        You can request a copy of all personal data we hold about you by
        emailing{" "}
        <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>.
      </p>

      <h3>8.2 Correction</h3>
      <p>
        You can update your personal information at any time from your account
        settings.
      </p>

      <h3>8.3 Deletion</h3>
      <p>
        You can request deletion of your account and all associated data from
        your account settings or by emailing{" "}
        <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>.
        We will process deletion requests within 30 days.
      </p>

      <h3>8.4 Data Export</h3>
      <p>
        You can request a full export of your Vault contents — letters,
        photos, voice notes, and videos — by emailing{" "}
        <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>.
      </p>

      <h3>8.5 Opt-out of Communications</h3>
      <p>
        You can unsubscribe from all non-essential emails at any time using
        the unsubscribe link in any email or from your account notification
        settings.
      </p>

      <h3>8.6 CCPA Rights (California Residents)</h3>
      <p>
        California residents have additional rights under the California
        Consumer Privacy Act including the right to know, right to delete, and
        right to opt-out of sale (we do not sell data). Contact{" "}
        <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>{" "}
        to exercise these rights.
      </p>

      <h3>8.7 GDPR Rights (EU/UK Residents)</h3>
      <p>
        EU and UK residents have rights under GDPR including access,
        rectification, erasure, restriction, portability, and objection.
        Contact{" "}
        <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>{" "}
        to exercise these rights.
      </p>

      <hr />

      <h2>9. Cookies</h2>
      <p>We use cookies to:</p>
      <ul>
        <li>Keep you logged in (essential — cannot be disabled)</li>
        <li>Remember your preferences (functional)</li>
        <li>Understand how the product is used (analytics — PostHog)</li>
      </ul>
      <p>
        You can control cookie settings through your browser. Disabling
        essential cookies may prevent the app from functioning correctly.
      </p>

      <hr />

      <h2>10. Changes to This Policy</h2>
      <p>
        We will notify you of material changes to this Privacy Policy by email
        and by posting a notice on the app. Your continued use of untilThen
        after changes are posted constitutes acceptance of the updated policy.
      </p>

      <hr />

      <h2>11. Contact Us</h2>
      <p>
        <strong>Privacy inquiries:</strong>{" "}
        <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>
        <br />
        <strong>Child safety concerns:</strong>{" "}
        <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>
        <br />
        <strong>General support:</strong>{" "}
        <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>
      </p>
      <p>
        To report child sexual abuse material or child exploitation, contact:
      </p>
      <ul>
        <li>
          <strong>NCMEC CyberTipline:</strong>{" "}
          <a
            href="https://www.missingkids.org/gethelpnow/cybertipline"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.missingkids.org/gethelpnow/cybertipline
          </a>{" "}
          or 1-800-843-5678
        </li>
        <li>
          <strong>FBI:</strong>{" "}
          <a
            href="https://tips.fbi.gov"
            target="_blank"
            rel="noopener noreferrer"
          >
            tips.fbi.gov
          </a>
        </li>
        <li>
          <strong>Local law enforcement:</strong> 911
        </li>
      </ul>

      <hr />

      <p>
        <em>
          This Privacy Policy was last updated on April 15, 2026. A lawyer
          review is recommended before this policy is considered final for
          legal purposes.
        </em>
      </p>
    </LegalShell>
  );
}
