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

async function send({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("[emails] send failed:", err);
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

// #18 — Writing Reminder (30+ Days)
export async function sendWritingReminder(params: {
  to: string;
  parentName: string;
  childName: string;
}): Promise<void> {
  const url = `${baseUrl()}/dashboard`;
  await send({
    to: params.to,
    subject: "Don\u2019t forget this version of them.",
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        It&rsquo;s been a while since your last memory.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        Take a minute to write something &mdash; even small moments matter.
      </p>
      ${cta(url, "Write a memory")}
    `),
  });
}

// #19 — Reveal Countdown
export async function sendRevealCountdown(params: {
  to: string;
  parentName: string;
  childName: string;
  daysLeft: number;
  revealDate: string;
}): Promise<void> {
  const url = `${baseUrl()}/dashboard`;
  const subject =
    params.daysLeft === 1 ? "Tomorrow changes everything"
    : params.daysLeft === 7 ? "One week to go"
    : "One month from now";
  await send({
    to: params.to,
    subject,
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        ${params.daysLeft === 1
          ? "It&rsquo;s almost time."
          : params.daysLeft === 7
            ? "They&rsquo;re about to see it all."
            : "They&rsquo;ll open everything."}
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        ${escapeHtml(params.childName)}&rsquo;s capsule ${params.daysLeft === 1 ? "opens tomorrow" : `opens in ${params.daysLeft} days`}.
      </p>
      ${cta(url, "View your capsule")}
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
