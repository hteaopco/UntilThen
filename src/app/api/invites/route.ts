import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ContributorRole } from "@prisma/client";

import { captureServerEvent } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  vaultId?: string;
  email?: string;
  name?: string;
  role?: string;
  requiresApproval?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES: ContributorRole[] = ["FAMILY", "FRIEND", "TEACHER", "OTHER"];

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;
  const role = VALID_ROLES.includes(body.role as ContributorRole)
    ? (body.role as ContributorRole)
    : "FAMILY";
  const requiresApproval = body.requiresApproval === true;

  try {
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

    // Accept an explicit vaultId so multi-vault parents can invite
    // to a specific child's vault. Falls back to the first vault
    // for legacy single-child flows.
    const vault =
      (body.vaultId &&
        user.children.find((c) => c.vault?.id === body.vaultId)?.vault) ||
      user.children[0]?.vault;
    if (!vault)
      return NextResponse.json({ error: "No vault yet." }, { status: 404 });
    const vaultChild = user.children.find((c) => c.vault?.id === vault.id);

    const contributor = await prisma.contributor.create({
      data: {
        vaultId: vault.id,
        invitedBy: userId,
        email,
        name,
        role,
        requiresApproval,
      },
    });

    // Send invite email (best-effort).
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
        const inviteUrl = `${origin}/invite/${contributor.inviteToken}`;
        const child = vaultChild ?? user.children[0];
        const revealLabel = vault.revealDate
          ? vault.revealDate.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          : "the reveal date";
        await resend.emails.send({
          from: "untilThen <hello@untilthenapp.io>",
          replyTo: "support@untilthenapp.io",
          to: email,
          subject: `You've been invited to write to ${child?.firstName ?? "their child"}`,
          html: `
<div style="font-family: 'DM Sans', -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #0f1f3d;">
  <h1 style="font-size: 24px; font-weight: 800; color: #0f1f3d; margin: 0 0 12px; letter-spacing: -0.5px;">
    You&rsquo;ve been invited to write to ${escapeHtml(child?.firstName ?? "their child")}.
  </h1>
  <p style="font-size: 16px; color: #4a5568; line-height: 1.7; margin: 0 0 20px;">
    ${escapeHtml(user.firstName)} has invited you to contribute a letter, photo, voice note, or video to ${escapeHtml(child?.firstName ?? "their child")}&rsquo;s vault &mdash; a collection of memories they&rsquo;ll open on ${escapeHtml(revealLabel)}.
  </p>
  <p style="margin: 24px 0;">
    <a href="${inviteUrl}" style="display: inline-block; background: #0f1f3d; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">Accept invitation &rarr;</a>
  </p>
  <p style="font-size: 12px; color: #8896a5; margin-top: 32px; font-style: italic;">
    If the button doesn&rsquo;t work, paste this link into your browser: ${inviteUrl}
  </p>
</div>`,
        });
      } catch (err) {
        console.error("[invites] email error:", err);
      }
    }

    await captureServerEvent(userId, "contributor_invited", {
      contributorId: contributor.id,
      vaultId: vault.id,
      role,
      requiresApproval,
    });

    return NextResponse.json({ success: true, id: contributor.id });
  } catch (err) {
    console.error("[invites POST] error:", err);
    return NextResponse.json(
      { error: "Couldn't create invite." },
      { status: 500 },
    );
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
