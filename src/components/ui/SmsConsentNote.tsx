import Link from "next/link";

/**
 * Inline SMS consent disclosure shown adjacent to any field that
 * collects a phone number we may use for transactional SMS.
 *
 * Includes everything Twilio's A2P 10DLC reviewers need to verify
 * the consent flow:
 *   - the recipient is opting in to TRANSACTIONAL messages
 *   - what kinds of messages get sent + the frequency hint
 *   - "Message and data rates may apply"
 *   - STOP / HELP keywords
 *   - links to /privacy and /terms (must be visible at the
 *     consent point, not just in a footer)
 *
 * The variant prop swaps the leading sentence so the same note
 * works under "your phone" (first-person agreement) and "their
 * phone" (organiser passes us a recipient's number after they've
 * obtained the recipient's consent themselves).
 */
type Variant = "self" | "third-party";

export function SmsConsentNote({
  variant = "self",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const lead =
    variant === "self"
      ? "By providing your phone number you agree to receive transactional SMS notifications from untilThen"
      : "By submitting this number you confirm the recipient has agreed to receive transactional SMS notifications from untilThen";
  return (
    <p
      className={
        className ??
        "mt-1.5 text-[12px] leading-[1.55] text-ink-mid"
      }
    >
      {lead} &mdash; account verification codes, capsule reveal alerts,
      contributor invite reminders, and capsule activity updates. Message
      frequency varies by capsule activity (typically 1&ndash;5 messages per
      capsule lifecycle). Message and data rates may apply. Reply{" "}
      <strong className="font-bold">STOP</strong> to opt out,{" "}
      <strong className="font-bold">HELP</strong> for help. See our{" "}
      <Link
        href="/privacy"
        className="underline underline-offset-2 hover:text-navy"
      >
        Privacy Policy
      </Link>{" "}
      and{" "}
      <Link
        href="/terms"
        className="underline underline-offset-2 hover:text-navy"
      >
        Terms
      </Link>
      .
    </p>
  );
}
