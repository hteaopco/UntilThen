// Shared Resend email helpers. Each send is best-effort: if Resend is
// not configured or the send throws, we log and move on — we never
// want a failing email to break the primary request.

const FROM = "untilThen <hello@untilthenapp.io>";
const REPLY_TO = "hello@untilthenapp.io";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
}

/**
 * Send via Resend. Best-effort: if Resend is not configured or
 * the call throws we log and return. Returns the Resend message
 * id when available so callers can persist it for downstream
 * webhook correlation; null if the send was skipped or failed.
 *
 * `tags` are forwarded as Resend tags and round-trip through the
 * webhook payload — that's how /api/webhooks/resend recovers the
 * `capsuleId` link when an event lands.
 */
async function send({
  to,
  subject,
  html,
  tags,
}: {
  to: string;
  subject: string;
  html: string;
  tags?: Record<string, string>;
}): Promise<string | null> {
  if (!process.env.RESEND_API_KEY) return null;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const tagList = tags
      ? Object.entries(tags).map(([name, value]) => ({ name, value }))
      : undefined;
    const result = await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject,
      html,
      ...(tagList ? { tags: tagList } : {}),
    });
    return result.data?.id ?? null;
  } catch (err) {
    console.error("[emails] send failed:", err);
    return null;
  }
}

function wrapper(body: string): string {
  return `<div style="font-family:'DM Sans',-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;color:#0f1f3d;">${body}</div>`;
}

function cta(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${href}" style="display:inline-block;background:#c47a3a;color:#ffffff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">${label}</a></p>`;
}

// #17 — Account Deleted
export async function sendAccountDeleted(params: {
  to: string;
  firstName: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: "Your account has been deleted",
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        Your account has been successfully deleted.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        If you ever decide to return, we&rsquo;ll be here.
      </p>
      <p style="font-size:14px;color:#8896a5;line-height:1.6;margin:0;">
        If you didn&rsquo;t request this, contact us at hello@untilthenapp.io.
      </p>
    `),
  });
}

export async function sendTrusteeNominated(params: {
  to: string;
  trusteeName: string;
  parentName: string;
  childName: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: "Someone trusts you with something important.",
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        ${escapeHtml(params.parentName)} named you as a trusted person.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        If ${escapeHtml(params.parentName)} is ever unable to access their account, you may be contacted to help transfer ${escapeHtml(params.childName)}&rsquo;s time capsule.
      </p>
      <p style="font-size:14px;color:#8896a5;line-height:1.6;margin:0 0 12px;">
        You don&rsquo;t need to do anything right now. This is just to let you know.
      </p>
      <p style="font-size:14px;color:#8896a5;line-height:1.6;margin:0;">
        If you have questions, reply to this email.
      </p>
    `),
  });
}

// #20a — Recovery Request (internal — to support inbox)
//
// Submitted by the /help/recovery form when a user has lost access
// to the email address on their account. Contains everything we
// need to verify identity before manually updating the Clerk email.
export async function sendAccountRecoveryRequest(params: {
  originalEmail: string;
  newEmail: string;
  fullName: string;
  childFirstName: string;
  approximateSignupDate: string;
  details: string;
  ipAddress: string;
  userAgent: string;
}): Promise<void> {
  await send({
    to: REPLY_TO, // hello@untilthenapp.io — the support inbox itself
    subject: `Recovery request: ${params.fullName} (${params.originalEmail})`,
    html: wrapper(`
      <h1 style="font-size:22px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        New account recovery request
      </h1>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#0f1f3d;margin:0 0 16px;">
        <tr><td style="padding:4px 0;width:180px;color:#8896a5;">Original email</td><td><strong>${escapeHtml(params.originalEmail)}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#8896a5;">New email (reach them here)</td><td><strong>${escapeHtml(params.newEmail)}</strong></td></tr>
        <tr><td style="padding:4px 0;color:#8896a5;">Full name</td><td>${escapeHtml(params.fullName)}</td></tr>
        <tr><td style="padding:4px 0;color:#8896a5;">Child&rsquo;s first name</td><td>${escapeHtml(params.childFirstName)}</td></tr>
        <tr><td style="padding:4px 0;color:#8896a5;">Signed up around</td><td>${escapeHtml(params.approximateSignupDate)}</td></tr>
        <tr><td style="padding:4px 0;color:#8896a5;vertical-align:top;">IP / UA</td><td style="font-family:monospace;font-size:12px;">${escapeHtml(params.ipAddress)}<br/>${escapeHtml(params.userAgent)}</td></tr>
      </table>
      <h2 style="font-size:14px;font-weight:800;margin:16px 0 8px;color:#0f1f3d;text-transform:uppercase;letter-spacing:0.08em;">
        Additional details
      </h2>
      <p style="font-size:14px;color:#4a5568;line-height:1.7;margin:0 0 16px;white-space:pre-wrap;">
        ${escapeHtml(params.details)}
      </p>
      <p style="font-size:12px;color:#8896a5;line-height:1.6;margin:0;">
        Verify identity (child&rsquo;s name, signup date, original email) against the User row in /admin/users before changing the Clerk email.
      </p>
    `),
  });
}

// #20b — Recovery Confirmation (to requester)
//
// Sent alongside the support notification so the requester knows
// the form went through and when to expect a response.
export async function sendAccountRecoveryConfirmation(params: {
  to: string;
  fullName: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: "We got your recovery request",
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        We&rsquo;re on it, ${escapeHtml(params.fullName.split(" ")[0] ?? "there")}.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        Your account recovery request has been received. Someone on our team will review the details you sent and get back to you within 1&ndash;2 business days.
      </p>
      <p style="font-size:14px;color:#8896a5;line-height:1.6;margin:0 0 12px;">
        If you need to add more information, just reply to this email.
      </p>
      <p style="font-size:14px;color:#8896a5;line-height:1.6;margin:0;">
        &mdash; untilThen
      </p>
    `),
  });
}

// #21 — Vault PIN Reset
//
// Sent when a user hits "Forgot PIN?" on the lock screen. The
// link carries a one-time token that, when visited, clears the
// user's pinHash so they can set a fresh one from account
// settings. Token lives 1 hour.
export async function sendPinReset(params: {
  to: string;
  firstName: string;
  resetUrl: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: "Reset your vault PIN",
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        Let&rsquo;s get you back in, ${escapeHtml(params.firstName)}.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        You asked to reset the PIN on your vault. Click the button below
        to clear it &mdash; you&rsquo;ll be able to set a new one from your
        account settings right after.
      </p>
      ${cta(params.resetUrl, "Reset my PIN")}
      <p style="font-size:13px;color:#8896a5;line-height:1.6;margin:16px 0 0;">
        This link works once and expires in one hour. If you didn&rsquo;t
        request this, you can ignore the email &mdash; your PIN stays
        untouched.
      </p>
    `),
  });
}

// #22 — Cron Health Alert
//
// Fired by /api/cron/cron-health-check when a cron has missed
// 2x its expected interval. Goes to the support inbox so
// engineering can investigate. Dedup'd to once per 24h per cron
// by the health checker itself — this helper just formats + sends.
export async function sendCronHealthAlert(params: {
  to: string;
  cronName: string;
  intervalSec: number;
  staleThresholdSec: number;
  lastRunAt: Date | null;
  ageSec: number | null;
}): Promise<void> {
  const fmtInterval = formatDuration(params.intervalSec);
  const fmtThreshold = formatDuration(params.staleThresholdSec);
  const fmtAge =
    params.ageSec === null ? "never" : formatDuration(params.ageSec);
  const lastRunLine =
    params.lastRunAt === null
      ? "This cron has no recorded runs."
      : `Last successful run: ${params.lastRunAt.toISOString()}`;

  await send({
    to: params.to,
    subject: `[untilThen] Cron alert: ${params.cronName} is stale (${fmtAge})`,
    html: wrapper(`
      <h1 style="font-size:20px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;color:#b91c1c;">
        Cron hasn&rsquo;t run in a while.
      </h1>
      <p style="font-size:15px;color:#4a5568;line-height:1.6;margin:0 0 16px;">
        <strong>${escapeHtml(params.cronName)}</strong> normally runs every
        ${escapeHtml(fmtInterval)}. It&rsquo;s been
        <strong>${escapeHtml(fmtAge)}</strong> since the last run, past the
        ${escapeHtml(fmtThreshold)} alert threshold.
      </p>
      <p style="font-size:14px;color:#4a5568;line-height:1.6;margin:0 0 12px;">
        ${escapeHtml(lastRunLine)}
      </p>
      <p style="font-size:13px;color:#8896a5;line-height:1.55;margin:16px 0 0;">
        Check the Railway cron service for this job. Re-alerts are
        suppressed for 24 hours per cron to avoid flooding this inbox.
      </p>
    `),
  });
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

// ── Enterprise (Phase 1) ───────────────────────────────────

/**
 * Sent when a company adds someone who DOESN'T already have an
 * untilThen account. Contains the magic-link accept URL with the
 * inviteToken. Once they click + sign up, the accept-flow joins
 * them to the org automatically.
 */
export async function sendOrgInviteNew(params: {
  to: string;
  organizationName: string;
  inviterName: string;
  acceptUrl: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: `Your untilThen access from ${params.organizationName}`,
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        ${escapeHtml(params.organizationName)} has added you to their untilThen team.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        As part of your company&rsquo;s untilThen plan, you can create Gift
        Capsules for colleagues, clients, or anyone worth celebrating &mdash;
        sealed with letters, photos, and voice notes, opened on a date that
        matters.
      </p>
      <p style="font-size:15px;color:#4a5568;line-height:1.6;margin:0 0 12px;">
        Use it for retirements, work anniversaries, farewells, or any
        moment worth remembering.
      </p>
      ${cta(params.acceptUrl, "Get started →")}
      <p style="font-size:13px;color:#8896a5;line-height:1.6;margin:0;">
        This invite is unique to you. If you didn&rsquo;t expect it, just
        ignore the email &mdash; nothing happens until you click the link.
      </p>
    `),
  });
}

/**
 * Sent when a company adds someone who ALREADY has an untilThen
 * account (matched by primary or any verified email). No accept
 * flow needed — they're auto-joined; this is just a heads-up so
 * they know untilThen is now company-funded.
 */
export async function sendOrgInviteExisting(params: {
  to: string;
  organizationName: string;
  inviterName: string;
  dashboardUrl: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: `Your untilThen access from ${params.organizationName}`,
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        ${escapeHtml(params.organizationName)} has added you to their untilThen team.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        As part of your company&rsquo;s untilThen plan, you can create Gift
        Capsules for colleagues, clients, or anyone worth celebrating &mdash;
        sealed with letters, photos, and voice notes, opened on a date that
        matters.
      </p>
      <p style="font-size:15px;color:#4a5568;line-height:1.6;margin:0 0 12px;">
        Use it for retirements, work anniversaries, farewells, or any
        moment worth remembering.
      </p>
      ${cta(params.dashboardUrl, "Get started →")}
      <p style="font-size:13px;color:#8896a5;line-height:1.6;margin:0;">
        Questions? Reply to this email and we&rsquo;ll help.
      </p>
    `),
  });
}

/**
 * Sent when an OWNER transfers an org-attributed capsule from
 * one member to another (typically during offboarding). Goes to
 * the new owner so they know they're now responsible for it.
 */
export async function sendOrgCapsuleTransferred(params: {
  to: string;
  newOrganiserName: string;
  capsuleTitle: string;
  organizationName: string;
  capsuleUrl: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: `A Gift Capsule was transferred to you.`,
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        Hi ${escapeHtml(params.newOrganiserName)} &mdash; a capsule&rsquo;s yours now.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        <strong>${escapeHtml(params.capsuleTitle)}</strong> was just
        transferred to your account by your team at
        ${escapeHtml(params.organizationName)}. You&rsquo;ll see it in your
        capsule list with all its existing contributors and reveal date
        intact.
      </p>
      ${cta(params.capsuleUrl, "Open the capsule")}
      <p style="font-size:13px;color:#8896a5;line-height:1.6;margin:0;">
        Anything that needs explaining, just ask the person who
        transferred it.
      </p>
    `),
  });
}

/**
 * Sent when a wedding guest opts in to "save my email so I can
 * edit later" after sealing their contribution. Carries a
 * deep-link to /wedding/<guestToken>?edit=<editToken> that drops
 * the guest back into the editor pre-filled with their original
 * text and media. Editable while the capsule is ACTIVE; once
 * sealed (past the contributor deadline) the link returns a
 * gentle "too late" screen.
 */
export async function sendWeddingEditLink(params: {
  to: string;
  authorName: string;
  coupleNames: string;
  editUrl: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: `Edit your message for ${params.coupleNames}`,
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        Hi ${escapeHtml(params.authorName)} &mdash; your message is sealed.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        Your message for ${escapeHtml(params.coupleNames)} is in. If you
        ever want to swap a word, add a photo, or change the voice note,
        the link below drops you back into your message exactly as you
        left it.
      </p>
      <p style="font-size:15px;color:#4a5568;line-height:1.6;margin:0 0 12px;">
        Edits stay open until the couple&rsquo;s capsule is sealed for
        delivery. After that, your message is locked &mdash; the way it
        should be.
      </p>
      ${cta(params.editUrl, "Edit my message")}
      <p style="font-size:13px;color:#8896a5;line-height:1.6;margin:0;">
        Keep this email. The link is unique to your message and we
        can&rsquo;t recover it if it&rsquo;s lost.
      </p>
    `),
  });
}
