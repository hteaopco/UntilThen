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

// ── Invite accepted (parent notified) ──────────────────────────
export async function sendInviteAccepted(params: {
  parentEmail: string;
  parentFirstName: string;
  contributorName: string;
  childFirstName: string;
  dashboardUrl?: string;
}): Promise<void> {
  const url = params.dashboardUrl ?? `${baseUrl()}/dashboard`;
  const html = wrapper(`
    <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
      ${escapeHtml(params.contributorName)} accepted your invitation.
    </h1>
    <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px;">
      They can now add letters, voice notes, photos, and videos to
      ${escapeHtml(params.childFirstName)}&rsquo;s vault.
    </p>
    <p style="margin:24px 0;">
      <a href="${url}" style="display:inline-block;background:#0f1f3d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Open dashboard</a>
    </p>
  `);
  await send({
    to: params.parentEmail,
    subject: `${params.contributorName} accepted your invitation`,
    html,
  });
}

// ── Entry needs review (parent notified) ───────────────────────
export async function sendEntryNeedsReview(params: {
  parentEmail: string;
  contributorName: string;
  childFirstName: string;
  entryTitle: string;
  dashboardUrl?: string;
}): Promise<void> {
  const url = params.dashboardUrl ?? `${baseUrl()}/dashboard`;
  const html = wrapper(`
    <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
      ${escapeHtml(params.contributorName)} added something to ${escapeHtml(params.childFirstName)}&rsquo;s vault.
    </h1>
    <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 8px;">
      &ldquo;${escapeHtml(params.entryTitle)}&rdquo;
    </p>
    <p style="font-size:14px;color:#8896a5;line-height:1.6;margin:0 0 20px;">
      Review it before it joins the vault.
    </p>
    <p style="margin:24px 0;">
      <a href="${url}" style="display:inline-block;background:#0f1f3d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Review entry</a>
    </p>
  `);
  await send({
    to: params.parentEmail,
    subject: `${params.contributorName} added something to ${params.childFirstName}'s vault`,
    html,
  });
}

// ── Entry approved (contributor notified) ──────────────────────
export async function sendEntryApproved(params: {
  contributorEmail: string;
  contributorName: string;
  childFirstName: string;
  entryTitle: string;
  contributorDashboardUrl: string;
}): Promise<void> {
  const html = wrapper(`
    <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
      Your contribution is in the vault.
    </h1>
    <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 8px;">
      &ldquo;${escapeHtml(params.entryTitle)}&rdquo; is now sealed in ${escapeHtml(params.childFirstName)}&rsquo;s vault.
    </p>
    <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px;">
      Thanks for writing, ${escapeHtml(params.contributorName)}.
    </p>
    <p style="margin:24px 0;">
      <a href="${params.contributorDashboardUrl}" style="display:inline-block;background:#0f1f3d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Open your dashboard</a>
    </p>
  `);
  await send({
    to: params.contributorEmail,
    subject: `Your contribution is in the vault`,
    html,
  });
}

// ── Entry rejected (contributor notified) ──────────────────────
export async function sendEntryRejected(params: {
  contributorEmail: string;
  contributorName: string;
  childFirstName: string;
  entryTitle: string;
  contributorDashboardUrl: string;
}): Promise<void> {
  const html = wrapper(`
    <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
      Your contribution needs a small update.
    </h1>
    <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
      ${escapeHtml(params.childFirstName)}&rsquo;s parent reviewed
      &ldquo;${escapeHtml(params.entryTitle)}&rdquo; and asked for
      changes before it joins the vault.
    </p>
    <p style="font-size:14px;color:#8896a5;line-height:1.6;margin:0 0 20px;">
      You can edit and resubmit from your dashboard.
    </p>
    <p style="margin:24px 0;">
      <a href="${params.contributorDashboardUrl}" style="display:inline-block;background:#0f1f3d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Open your dashboard</a>
    </p>
  `);
  await send({
    to: params.contributorEmail,
    subject: `Your contribution needs a small update`,
    html,
  });
}

export async function sendAccountDeleted(params: {
  to: string;
  firstName: string;
}): Promise<void> {
  const html = wrapper(`
    <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
      Your account has been deleted.
    </h1>
    <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 16px;">
      Hi ${escapeHtml(params.firstName)}, your untilThen account and all associated data have been permanently removed.
    </p>
    <p style="font-size:14px;color:#8896a5;line-height:1.6;margin:0;">
      If you didn&rsquo;t request this, please contact us immediately at hello@untilthenapp.io.
    </p>
  `);
  await send({
    to: params.to,
    subject: "Your untilThen account has been deleted",
    html,
  });
}

export async function sendWritingReminder(params: {
  to: string;
  parentName: string;
  childName: string;
}): Promise<void> {
  const url = `${baseUrl()}/dashboard`;
  const html = wrapper(`
    <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
      It&rsquo;s been a while, ${escapeHtml(params.parentName)}.
    </h1>
    <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 8px;">
      You haven&rsquo;t written to ${escapeHtml(params.childName)}&rsquo;s vault in over 30 days. Even a short note means the world.
    </p>
    <p style="font-size:14px;color:#8896a5;line-height:1.6;margin:0 0 20px;">
      What are they doing right now that you never want to forget?
    </p>
    <a href="${url}" style="display:inline-block;background:#c47a3a;color:#ffffff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Write a memory
    </a>
  `);
  await send({
    to: params.to,
    subject: `${params.childName} is waiting for your next memory`,
    html,
  });
}

export async function sendRevealCountdown(params: {
  to: string;
  parentName: string;
  childName: string;
  daysLeft: number;
  revealDate: string;
}): Promise<void> {
  const url = `${baseUrl()}/dashboard`;
  const dateStr = new Date(params.revealDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const urgency = params.daysLeft === 1
    ? "Tomorrow is the day."
    : `${params.daysLeft} days to go.`;
  const html = wrapper(`
    <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
      ${urgency}
    </h1>
    <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 8px;">
      ${escapeHtml(params.childName)}&rsquo;s time capsule opens on ${dateStr}.
    </p>
    <p style="font-size:14px;color:#8896a5;line-height:1.6;margin:0 0 20px;">
      ${params.daysLeft <= 7
        ? "Last chance to add anything before it opens."
        : "Still time to add more memories before the big reveal."}
    </p>
    <a href="${url}" style="display:inline-block;background:#c47a3a;color:#ffffff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Open your vault
    </a>
  `);
  await send({
    to: params.to,
    subject: `${urgency} ${params.childName}'s capsule opens ${dateStr}`,
    html,
  });
}
