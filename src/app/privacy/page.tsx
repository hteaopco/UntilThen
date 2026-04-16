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
        take the trust you place in us — especially when it involves your
        children — with the utmost seriousness. This Privacy Policy explains
        what we collect, how we use it, and how we protect it.
      </p>
      <p>
        <strong>
          We will never sell your data. We will never use your children&rsquo;s
          information for advertising. We will never share your memories with
          anyone who isn&rsquo;t you.
        </strong>
      </p>
      <p>
        If you have questions about this policy, contact us at{" "}
        <a href="mailto:privacy@untilthenapp.io">privacy@untilthenapp.io</a>.
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

      <h3>2.2 Children&rsquo;s Information</h3>
      <p>When you create a Child Vault we collect:</p>
      <ul>
        <li>Your child&rsquo;s first name</li>
        <li>Your child&rsquo;s date of birth (optional)</li>
        <li>Your child&rsquo;s reveal date or age</li>
      </ul>
      <p>
        <strong>
          We collect the absolute minimum information necessary about children.
        </strong>{" "}
        We do not collect children&rsquo;s email addresses, phone numbers,
        photos of children&rsquo;s faces for identification purposes, or any
        biometric data. Children&rsquo;s names and birthdays are stored solely
        to personalise the vault experience.
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

      <h3>2.4 Contributor Information</h3>
      <p>
        When you invite contributors we collect their name (optional) and email
        address to send the invitation. Contributors who create accounts are
        subject to this same Privacy Policy.
      </p>

      <h3>2.5 Gift Capsule Recipients</h3>
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
        We use this data to improve the product. It is never linked to your
        child&rsquo;s identity.
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
        untilThen is a product used by adults to create content for children.
        We take children&rsquo;s privacy with the highest level of seriousness.
      </p>

      <h3>3.1 COPPA Compliance</h3>
      <p>
        untilThen complies with the Children&rsquo;s Online Privacy Protection
        Act (COPPA). We do not knowingly collect personal information directly
        from children under 13 for the purpose of creating accounts.
      </p>
      <p>
        <strong>Account creators</strong> — parents, guardians, contributors,
        and Gift Capsule organisers — must be 18 or older. They create and
        manage vaults on behalf of their children.
      </p>
      <p>
        <strong>Vault recipients</strong> — children receive vaults at whatever
        age the parent designates as the reveal date. There is no minimum age
        for receiving a vault. When a child creates an account to access their
        vault at reveal, they do so at the age their parent has chosen. If
        that age is under 13, the parent or guardian should assist with
        account creation and the parent remains responsible for the
        child&rsquo;s use of the service in accordance with COPPA.
      </p>

      <h3>3.2 Child Account Creation</h3>
      <p>
        Children only create untilThen accounts when their vault reveal date
        arrives and they are old enough to do so. At no point do we solicit
        personal information from children to create accounts before they are
        of appropriate age.
      </p>

      <h3>3.3 What We Store About Children</h3>
      <p>We store only:</p>
      <ul>
        <li>First name (as entered by the parent)</li>
        <li>Date of birth (optional, entered by the parent)</li>
        <li>Reveal date (set by the parent)</li>
      </ul>
      <p>
        We do not store children&rsquo;s phone numbers, addresses, school
        information, photographs for identification purposes, or any other
        sensitive personal data.
      </p>

      <h3>3.4 Children&rsquo;s Content</h3>
      <p>
        Photos, videos, and voice recordings uploaded to a child&rsquo;s vault
        are stored securely and are never accessible to anyone other than the
        parent, approved contributors, and the child themselves after the
        reveal date.
      </p>

      <h3>3.5 No Advertising to Children</h3>
      <p>
        We do not serve advertising of any kind. We do not use children&rsquo;s
        data for any commercial purpose. We do not share children&rsquo;s data
        with advertisers, data brokers, or third-party marketing platforms.
        Ever.
      </p>

      <h3>3.6 Parental Control</h3>
      <p>Parents have full control over their child&rsquo;s vault at all times:</p>
      <ul>
        <li>Add or remove contributors</li>
        <li>Delete individual entries</li>
        <li>Delete the entire vault</li>
        <li>Transfer vault ownership to a designated trustee</li>
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
        Creating accounts with false identities to gain access to a
        child&rsquo;s vault or to deceive contributors or recipients is
        prohibited.
      </p>

      <h3>4.4 Unauthorised Access</h3>
      <p>
        Attempting to access sealed vault content before the reveal date
        through any technical means is prohibited.
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

      <h3>6.2 Contributors You Invite</h3>
      <p>
        When you invite a contributor, we share the child&rsquo;s name and the
        occasion details with them so they can contribute meaningfully. We do
        not share the child&rsquo;s date of birth, your contact details, or
        any other personal information with contributors.
      </p>

      <h3>6.3 Legal Requirements</h3>
      <p>
        We may disclose information if required by law, court order, or to
        protect the safety of our users or the public. We will notify you of
        any such disclosure where legally permitted to do so.
      </p>

      <h3>6.4 Business Transfer</h3>
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
        <li>All data is encrypted in transit (TLS/HTTPS)</li>
        <li>All data is encrypted at rest</li>
        <li>
          Media files are stored in Cloudflare R2 with signed, time-limited
          access URLs
        </li>
        <li>
          Sealed vault content is never transmitted to a child&rsquo;s device
          until the reveal date
        </li>
        <li>
          Passwords are managed by Clerk and never stored in plain text
        </li>
        <li>
          Access to production systems is restricted to authorised personnel
          only
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
        <a href="mailto:privacy@untilthenapp.io">privacy@untilthenapp.io</a>.
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
        <a href="mailto:privacy@untilthenapp.io">privacy@untilthenapp.io</a>.
        We will process deletion requests within 30 days.
      </p>

      <h3>8.4 Data Export</h3>
      <p>
        You can request a full export of your vault contents — letters,
        photos, voice notes, and videos — by emailing{" "}
        <a href="mailto:privacy@untilthenapp.io">privacy@untilthenapp.io</a>.
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
        <a href="mailto:privacy@untilthenapp.io">privacy@untilthenapp.io</a>{" "}
        to exercise these rights.
      </p>

      <h3>8.7 GDPR Rights (EU/UK Residents)</h3>
      <p>
        EU and UK residents have rights under GDPR including access,
        rectification, erasure, restriction, portability, and objection.
        Contact{" "}
        <a href="mailto:privacy@untilthenapp.io">privacy@untilthenapp.io</a>{" "}
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
        <a href="mailto:privacy@untilthenapp.io">privacy@untilthenapp.io</a>
        <br />
        <strong>Child safety concerns:</strong>{" "}
        <a href="mailto:safety@untilthenapp.io">safety@untilthenapp.io</a>
        <br />
        <strong>General support:</strong>{" "}
        <a href="mailto:support@untilthenapp.io">support@untilthenapp.io</a>
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
