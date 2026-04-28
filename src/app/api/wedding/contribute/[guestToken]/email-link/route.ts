import { NextResponse, type NextRequest } from "next/server";

import { effectiveStatus } from "@/lib/capsules";
import { sendWeddingEditLink } from "@/lib/emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  contributionId?: string;
  email?: string;
}

/**
 * Public: stamps the guest's email on their just-submitted
 * contribution and sends them an "editable card" email — a link
 * back to /wedding/<guestToken>?edit=<editToken> that loads the
 * editor pre-filled with their text + media. Edits are allowed
 * while the capsule is ACTIVE; once it goes SEALED the link
 * returns a "too late" screen.
 *
 * Auth model:
 *   - guestToken in the URL identifies the wedding capsule.
 *   - contributionId in the body identifies the row.
 *   - We verify the row belongs to that capsule + that the
 *     capsule is still accepting contributions. The email
 *     itself is the auth handoff to the guest's inbox.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ guestToken: string }> },
): Promise<NextResponse> {
  const { guestToken } = await ctx.params;

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { guestToken },
  });
  if (!capsule || capsule.occasionType !== "WEDDING") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const status = effectiveStatus(capsule);
  if (
    capsule.status === "DRAFT" ||
    status === "SEALED" ||
    status === "SENT" ||
    status === "REVEALED"
  ) {
    return NextResponse.json(
      { error: "Contributions are closed for this capsule." },
      { status: 410 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const contributionId =
    typeof body.contributionId === "string" ? body.contributionId.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!contributionId || !email) {
    return NextResponse.json(
      { error: "Missing contributionId or email." },
      { status: 400 },
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json(
      { error: "That email doesn't look right." },
      { status: 400 },
    );
  }

  const contribution = await prisma.capsuleContribution.findUnique({
    where: { id: contributionId },
  });
  if (!contribution || contribution.capsuleId !== capsule.id) {
    return NextResponse.json(
      { error: "Contribution not found." },
      { status: 404 },
    );
  }
  if (!contribution.editToken) {
    // Pre-edit-token contributions don't get retroactive links.
    // Should never happen for new POSTs; only relevant for any
    // historical row created before the migration.
    return NextResponse.json(
      { error: "This contribution can't be edited later." },
      { status: 409 },
    );
  }

  await prisma.capsuleContribution.update({
    where: { id: contributionId },
    data: { authorEmail: email },
  });

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
  const editUrl = `${origin}/wedding/${encodeURIComponent(guestToken)}?edit=${encodeURIComponent(contribution.editToken)}`;

  // Couple names for the email copy. We pull from recipientName on
  // the capsule (e.g. "Alex & Jordan Smith") and shorten to first
  // names if a "&" is present, matching the in-app couple display.
  const coupleNames = formatCoupleNames(capsule.recipientName);

  try {
    await sendWeddingEditLink({
      to: email,
      authorName: contribution.authorName,
      coupleNames,
      editUrl,
    });
  } catch (err) {
    console.error("[wedding email-link] send failed:", err);
    return NextResponse.json(
      { error: "Couldn't send the email. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

function formatCoupleNames(recipientName: string): string {
  if (!recipientName.includes("&")) return recipientName;
  const [a, b] = recipientName.split("&");
  const first = (a ?? "").trim().split(" ")[0] ?? "";
  const second = (b ?? "").trim().split(" ")[0] ?? "";
  if (!first || !second) return recipientName.trim();
  return `${first} & ${second}`;
}
