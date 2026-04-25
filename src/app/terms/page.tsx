import type { Metadata } from "next";

import { LegalShell } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service — untilThen",
  description:
    "The rules of using untilThen — including our absolute zero-tolerance policy on content that harms children.",
};

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Terms of Service"
      title="The rules we live by."
      meta={
        <>
          Last updated: April 23, 2026 · Effective: April 15, 2026
        </>
      }
    >
      <p>
        By creating an account or using untilThen, you agree to these Terms of
        Service. Please read them carefully — especially Section 4 (Prohibited
        Content) and Section 5 (Child Safety). If you do not agree, do not use
        the service.
      </p>

      <hr />

      <h2>1. The Service</h2>
      <p>untilThen provides two products:</p>
      <p>
        <strong>Vault</strong> — a subscription service that lets you create
        Time Capsules: sealed collections of memories, letters, voice notes,
        photos and videos for someone you love, opened at a milestone date
        you choose.
      </p>
      <p>
        <strong>Gift Capsule</strong> — a one-time service that allows
        anyone to create a sealed collection of memories contributed by
        multiple people, to be opened by a recipient on a chosen date within
        60 days of creation.
      </p>

      <hr />

      <h2>2. Your Account</h2>

      <h3>2.1 Eligibility</h3>
      <p>
        <strong>
          Account creators (parents, guardians, organisers, contributors)
        </strong>{" "}
        must be at least 18 years old. By creating an account you confirm that
        you are 18 or older.
      </p>
      <p>
        <strong>Recipients</strong> may receive and open Time Capsules at any
        age set by the Vault owner — there is no minimum age for receiving a
        Time Capsule. When a recipient creates an account to access their
        Time Capsule at reveal, they may do so at whatever age the Vault
        owner has designated as the reveal date. Vault owners are responsible
        for ensuring the reveal age is appropriate for the recipient.
      </p>
      <p>
        If a recipient is a child under 13 at the time of reveal, the parent
        or guardian should assist with account creation and access in
        compliance with COPPA.
      </p>

      <h3>2.2 Account Responsibility</h3>
      <p>
        You are responsible for maintaining the security of your account and
        password. You are responsible for all activity that occurs under your
        account. Notify us immediately at{" "}
        <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>{" "}
        if you suspect unauthorised access.
      </p>

      <h3>2.3 Accurate Information</h3>
      <p>
        You agree to provide accurate, current, and complete information when
        creating your account and to keep this information updated.
      </p>

      <h3>2.4 One Account Per Person</h3>
      <p>
        Each person may maintain only one account. Creating multiple accounts
        to circumvent restrictions or bans is prohibited.
      </p>

      <h3>2.5 Death or Incapacity</h3>
      <p>
        In the event of a user&rsquo;s death, next-of-kin or designated
        trustees may contact us at{" "}
        <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>{" "}
        to request account access or data export. We will review each
        request on a case-by-case basis and may require documentation
        (such as a death certificate and proof of relationship or legal
        authority) before taking any action on the account. Until such
        a request is received and verified, existing automated reveals
        and scheduled deliveries will continue to run as the account
        owner originally configured them.
      </p>

      <hr />

      <h2>3. Subscriptions and Payments</h2>

      <h3>3.1 Vault Subscription</h3>
      <ul>
        <li>
          <strong>Monthly plan:</strong> $4.99 per month (includes 3 capsules)
        </li>
        <li>
          <strong>Annual plan:</strong> $35.99 per year (includes 3 capsules)
        </li>
        <li>
          <strong>Additional capsule:</strong> $0.99 per month or $6.00 per year
        </li>
      </ul>
      <p>
        All subscriptions begin with a 7-day free trial. No credit card is
        required to start a trial. Your subscription begins at the end of the
        trial period.
      </p>

      <h3>3.2 Gift Capsule</h3>
      <ul>
        <li>
          <strong>One-time payment:</strong> $9.99 per capsule
        </li>
        <li>No subscription. No auto-renewal.</li>
        <li>
          Payment is required to send invites to contributors and schedule the
          reveal day email.
        </li>
        <li>Creating and drafting a capsule is free.</li>
      </ul>

      <h3>3.3 Billing</h3>
      <p>
        All payments are processed by Square. By providing payment information
        you authorise us to charge your payment method on the billing schedule
        you select.
      </p>

      <h3>3.4 Cancellation</h3>
      <p>
        You may cancel your subscription at any time from your account
        settings. Your access continues until the end of the current billing
        period. We do not offer refunds for partial billing periods.
      </p>

      <h3>3.5 Failed Payments</h3>
      <p>
        If a payment fails, your vault enters read-only mode. You have 7 days
        to update your payment method before your vault is paused. Entries are
        never deleted due to payment failure.
      </p>

      <h3>3.6 Refunds</h3>
      <p>
        We offer refunds at our discretion within 14 days of a charge if you
        have not used the service. Contact{" "}
        <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>{" "}
        to request a refund.
      </p>

      <h3>3.7 Price Changes</h3>
      <p>
        We will give you at least 30 days notice of any price changes by email
        and in-app notification.
      </p>

      <hr />

      <h2>4. Prohibited Content</h2>
      <p>
        The following content is strictly prohibited on untilThen. Violations
        will result in immediate account termination and, where applicable,
        reporting to law enforcement and legal action.
      </p>

      <h3>4.1 Child Sexual Abuse Material — Zero Tolerance</h3>
      <p>
        <strong>
          The upload, storage, creation, sharing, or distribution of any
          sexually explicit content involving minors is absolutely and
          unconditionally prohibited.
        </strong>
      </p>
      <p>This includes but is not limited to:</p>
      <ul>
        <li>Photographs, videos, or recordings of minors in sexual situations</li>
        <li>Sexually suggestive images of minors</li>
        <li>
          Illustrated, animated, or AI-generated sexual content involving
          minors
        </li>
        <li>Any content that sexualises children in any way</li>
      </ul>
      <p>
        <strong>
          There are no warnings and no exceptions for this prohibition.
        </strong>
      </p>
      <p>Any such content will result in:</p>
      <ol>
        <li>Immediate and permanent account termination</li>
        <li>
          Mandatory reporting to the National Center for Missing and Exploited
          Children (NCMEC)
        </li>
        <li>Reporting to the FBI Internet Crime Complaint Center (IC3)</li>
        <li>Reporting to all relevant law enforcement agencies</li>
        <li>Full cooperation with any resulting criminal investigation</li>
        <li>
          Civil legal action to the maximum extent permitted by law
        </li>
      </ol>
      <p>
        We actively monitor for and will aggressively pursue every legal
        remedy available against anyone who attempts to use untilThen to
        create, store, or distribute child sexual abuse material.
      </p>

      <h3>4.2 Nudity</h3>
      <p>
        Nudity is not permitted on untilThen. This includes nudity involving
        adults or minors. Tasteful family photos (such as bath time photos of
        young children in an innocent context) may be permitted at our
        discretion, but any content that could be considered sexualised or
        exploitative will be removed immediately.
      </p>
      <p>When in doubt, do not upload it.</p>

      <h3>4.3 Violent or Harmful Content</h3>
      <p>
        Content that depicts, promotes, or glorifies violence, self-harm,
        abuse, or harm to others is prohibited.
      </p>

      <h3>4.4 Harassment and Abuse</h3>
      <p>
        Using untilThen to harass, threaten, bully, or abuse any person is
        prohibited.
      </p>

      <h3>4.5 Illegal Content</h3>
      <p>
        Any content that violates local, state, federal, or international law
        is prohibited. This includes content that infringes on intellectual
        property rights, defames individuals, or constitutes fraud.
      </p>

      <h3>4.6 Spam and Misuse</h3>
      <p>
        Using untilThen&rsquo;s contributor or invite system to send
        unsolicited communications, spam, or phishing messages is prohibited.
      </p>

      <h3>4.7 Circumvention</h3>
      <p>
        Attempting to access sealed vault content before the reveal date
        through technical means, reverse engineering, or any other method is
        prohibited.
      </p>

      <hr />

      <h2>5. Child Safety — Our Absolute Priority</h2>
      <p>
        untilThen exists to help families preserve love across time.
        Protecting children is not just a legal obligation — it is the
        foundation of everything we do.
      </p>

      <h3>5.1 Account Creator Age Requirement</h3>
      <p>
        Only adults aged 18 or older may create untilThen accounts as parents,
        guardians, contributors, or Gift Capsule organisers. Children are
        recipients of vaults — they do not create accounts to manage or
        contribute to vaults. When a child&rsquo;s reveal date arrives they
        may create an account to access and save their vault content, at
        whatever age the parent has designated.
      </p>

      <h3>5.2 Vault Owner Responsibility</h3>
      <p>
        Vault owners who create Time Capsules for children are responsible
        for:
      </p>
      <ul>
        <li>
          Ensuring all content added to the vault is appropriate for their
          child
        </li>
        <li>
          Reviewing contributions from other contributors before they are
          added to the vault (if the approval setting is enabled)
        </li>
        <li>Managing contributor access appropriately</li>
      </ul>

      <h3>5.3 Contributor Conduct</h3>
      <p>
        Contributors invited to a Gift Capsule or Time Capsule agree to these
        Terms of Service. Contributors must:
      </p>
      <ul>
        <li>
          Only submit content that is appropriate for the recipient
        </li>
        <li>
          Not use their contributor access to contact or communicate with the
          recipient directly
        </li>
        <li>
          Not submit content that sexualises, exploits, or harms the recipient
          in any way
        </li>
      </ul>

      <h3>5.4 Reporting</h3>
      <p>
        If you encounter any content on untilThen that you believe involves
        child sexual abuse, child exploitation, or any harm to a child, report
        it immediately:
      </p>
      <ul>
        <li>
          <strong>Within the app:</strong> Email{" "}
          <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>{" "}
          with details
        </li>
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
          <strong>Emergency:</strong> 911
        </li>
      </ul>
      <p>
        We review all safety reports within 24 hours. We take every report
        seriously.
      </p>

      <h3>5.5 Our Legal Obligations</h3>
      <p>
        We are legally required to report any known or suspected child sexual
        abuse material to NCMEC under 18 U.S.C. § 2258A. We comply fully with
        this obligation and will do so without hesitation.
      </p>

      <h3>5.6 Legal Action</h3>
      <p>
        We will vigorously pursue civil and criminal legal action against any
        individual who uses untilThen to harm children. We maintain detailed
        logs for law enforcement purposes and will cooperate fully with any
        investigation.
      </p>

      <hr />

      <h2>6. Your Content</h2>

      <h3>6.1 Ownership</h3>
      <p>
        You own the content you create on untilThen. Letters, voice notes,
        photos, and videos that you upload remain yours.
      </p>

      <h3>6.2 Licence to Us</h3>
      <p>
        By uploading content, you grant untilThen a limited, non-exclusive
        licence to store, process, and deliver your content solely for the
        purpose of providing the service to you. We do not claim ownership of
        your content. We do not use your content for advertising, AI training,
        or any purpose other than delivering the service.
      </p>

      <h3>6.3 Content Standards</h3>
      <p>You agree that all content you upload:</p>
      <ul>
        <li>Is owned by you or you have permission to use it</li>
        <li>Does not violate the rights of any third party</li>
        <li>
          Does not violate Section 4 (Prohibited Content) of these Terms
        </li>
        <li>Is appropriate for the recipient</li>
      </ul>

      <h3>6.4 Content Removal</h3>
      <p>
        We reserve the right to remove any content that violates these Terms.
        We will notify you of any removal unless we are prohibited from doing
        so by law or the content involves child safety.
      </p>

      <hr />

      <h2>7. Data and Privacy</h2>
      <p>
        Your use of untilThen is also governed by our{" "}
        <a href="/privacy">Privacy Policy</a>. By using untilThen you agree to
        the collection and use of information as described in the Privacy
        Policy.
      </p>

      <hr />

      <h2>8. Service Availability</h2>

      <h3>8.1 Uptime</h3>
      <p>
        We aim to provide reliable service but do not guarantee 100% uptime.
        We will notify you of planned maintenance where possible.
      </p>

      <h3>8.2 Changes to the Service</h3>
      <p>
        We may modify, update, or discontinue features of untilThen. We will
        give you reasonable notice of any significant changes.
      </p>

      <h3>8.3 Discontinuation</h3>
      <p>
        If we discontinue untilThen entirely, we will give you at least 6
        months notice and provide a full data export of all your content.
      </p>

      <hr />

      <h2>9. Termination</h2>

      <h3>9.1 By You</h3>
      <p>
        You may delete your account at any time from your account settings.
        Account deletion is processed within 30 days.
      </p>

      <h3>9.2 By Us</h3>
      <p>
        We may suspend or terminate your account immediately if you:
      </p>
      <ul>
        <li>
          Violate Section 4 (Prohibited Content) — especially any child safety
          violation
        </li>
        <li>Violate Section 5 (Child Safety)</li>
        <li>Engage in fraudulent activity</li>
        <li>Repeatedly violate these Terms after warnings</li>
      </ul>
      <p>
        For serious violations, particularly those involving child safety, we
        will terminate without warning and report to law enforcement.
      </p>

      <h3>9.3 Effect of Termination</h3>
      <p>
        Upon termination your access to the service ends. Your content is
        retained for 30 days before deletion, during which time you may
        request an export.
      </p>

      <hr />

      <h2>10. Disclaimers and Limitation of Liability</h2>

      <h3>10.1 Service Provided As-Is</h3>
      <p>
        untilThen is provided &ldquo;as is&rdquo; without warranties of any
        kind, express or implied. We do not warrant that the service will be
        uninterrupted, error-free, or completely secure.
      </p>

      <h3>10.2 Limitation of Liability</h3>
      <p>
        To the maximum extent permitted by law, untilThen&rsquo;s liability to
        you for any claim arising from your use of the service is limited to
        the amount you paid us in the 12 months preceding the claim.
      </p>

      <h3>10.3 No Liability for User Content</h3>
      <p>
        We are not responsible for content uploaded by users. We are not
        liable for any harm arising from content that violates these Terms,
        though we will act to remove violating content as quickly as possible.
      </p>

      <hr />

      <h2>11. Indemnification</h2>
      <p>
        You agree to indemnify and hold untilThen harmless from any claims,
        damages, or expenses (including legal fees) arising from your use of
        the service, your content, or your violation of these Terms.
      </p>

      <hr />

      <h2>12. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the State of Louisiana, United
        States, without regard to conflict of law provisions. Any disputes
        will be resolved in the courts of Lafayette Parish, Louisiana.
      </p>

      <hr />

      <h2>13. Changes to These Terms</h2>
      <p>
        We will notify you of material changes to these Terms by email at
        least 14 days before they take effect. Your continued use of untilThen
        after changes take effect constitutes acceptance of the updated Terms.
      </p>

      <hr />

      <h2>14. Contact</h2>
      <p>
        <strong>General support:</strong>{" "}
        <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>
        <br />
        <strong>Legal inquiries:</strong>{" "}
        <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>
        <br />
        <strong>Child safety:</strong>{" "}
        <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>
        <br />
        <strong>Privacy:</strong>{" "}
        <a href="mailto:hello@untilthenapp.io">hello@untilthenapp.io</a>
      </p>
      <p>To report child sexual abuse material:</p>
      <ul>
        <li>
          <strong>NCMEC:</strong>{" "}
          <a
            href="https://www.missingkids.org/gethelpnow/cybertipline"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.missingkids.org/gethelpnow/cybertipline
          </a>
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
          <strong>Emergency:</strong> 911
        </li>
      </ul>

      <hr />

      <p>
        <em>
          These Terms of Service were last updated on April 15, 2026. Legal
          review is recommended before these Terms are considered final.
        </em>
      </p>
    </LegalShell>
  );
}
