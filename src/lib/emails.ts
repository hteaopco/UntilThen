// Shared Resend email helpers. Each send is best-effort: if Resend is
// not configured or the send throws, we log and move on — we never
// want a failing email to break the primary request.
//
// TEMP: All emails currently route to jett@evolamco.com while the
// untilthenapp.io domain is unverified in Resend. When the domain is
// verified, remove TEST_RECIPIENT and change each `to` back to the
// real recipient.

const TEST_RECIPIENT = "jett@evolamco.com";
const FROM = "untilThen <onboarding@resend.dev>";

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
      // TEMP: routing all sends to the account owner while domain is unverified.
      to: TEST_RECIPIENT,
      subject: `${subject} — for ${to}`,
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
      <a href="${url}" style="display:inline-block;background:#0f1f3d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Open dashboard &rarr;</a>
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
      <a href="${url}" style="display:inline-block;background:#0f1f3d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Review entry &rarr;</a>
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
      <a href="${params.contributorDashboardUrl}" style="display:inline-block;background:#0f1f3d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Open your dashboard &rarr;</a>
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
      <a href="${params.contributorDashboardUrl}" style="display:inline-block;background:#0f1f3d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Open your dashboard &rarr;</a>
    </p>
  `);
  await send({
    to: params.contributorEmail,
    subject: `Your contribution needs a small update`,
    html,
  });
}
