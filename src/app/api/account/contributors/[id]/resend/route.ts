import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Resend a contributor's invite email. Reuses the existing invite
 * token — the link already in the Contributor row stays valid. If
 * you want to rotate the token, call POST with ?regenerate=1.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { id } = await ctx.params;
  const regenerate = req.nextUrl.searchParams.get("regenerate") === "1";

  const { prisma } = await import("@/lib/prisma");

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      children: {
        include: { vault: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  const contributor = await prisma.contributor.findUnique({
    where: { id },
  });
  if (!contributor)
    return NextResponse.json(
      { error: "Contributor not found." },
      { status: 404 },
    );

  const child = user.children.find((c) => c.vault?.id === contributor.vaultId);
  if (!child || !child.vault)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  if (regenerate) {
    const { randomUUID } = await import("node:crypto");
    await prisma.contributor.update({
      where: { id },
      data: { inviteToken: randomUUID() },
    });
  }

  const refreshed = await prisma.contributor.findUniqueOrThrow({
    where: { id },
    select: { inviteToken: true, email: true, name: true },
  });

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
  const inviteUrl = `${origin}/invite/${refreshed.inviteToken}`;
  const revealLabel = child.vault.revealDate
    ? child.vault.revealDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "the reveal date";

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "untilThen <hello@untilthenapp.io>",
        replyTo: "support@untilthenapp.io",
        to: refreshed.email,
        subject: `Invitation to write to ${child.firstName}`,
        html: `
<div style="font-family: 'DM Sans', -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #0f1f3d;">
  <h1 style="font-size: 24px; font-weight: 800; color: #0f1f3d; margin: 0 0 12px; letter-spacing: -0.5px;">
    You&rsquo;ve been invited to write to ${escapeHtml(child.firstName)}.
  </h1>
  <p style="font-size: 16px; color: #4a5568; line-height: 1.7; margin: 0 0 20px;">
    ${escapeHtml(user.displayName ?? user.firstName)} has invited you to contribute a letter, photo, voice note, or video to ${escapeHtml(child.firstName)}&rsquo;s vault &mdash; a collection of memories they&rsquo;ll open on ${escapeHtml(revealLabel)}.
  </p>
  <p style="margin: 24px 0;">
    <a href="${inviteUrl}" style="display: inline-block; background: #c47a3a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">Accept invitation &rarr;</a>
  </p>
  <p style="font-size: 12px; color: #8896a5; margin-top: 32px; font-style: italic;">
    If the button doesn&rsquo;t work, paste this link into your browser: ${inviteUrl}
  </p>
</div>`,
      });
    } catch (err) {
      console.error("[contributors resend] email error:", err);
    }
  }

  return NextResponse.json({ success: true, regenerated: regenerate });
}
