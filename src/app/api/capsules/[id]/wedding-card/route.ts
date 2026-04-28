import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";

import { findOwnedCapsule } from "@/lib/capsules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Wedding share-card download with the capsule's guest QR baked
 * into the printable template.
 *
 * Two cosmetic variants exist as PNG templates in /public:
 *   - wedding-card-cream.png
 *   - wedding-card-white.png
 *
 * Both share the same layout — a centred orange box that a QR
 * code is supposed to live in. Until now those PNGs shipped with
 * the box empty; the organiser had to print, paste a QR by hand,
 * and reprint. This endpoint composes the capsule's actual QR
 * (`/wedding/<guestToken>`) into the box and streams the result
 * back as a download so the print is one tap.
 *
 * Auth: same as the other capsule endpoints — the caller must
 * either be the original organiser or an OWNER/ADMIN of the
 * capsule's organisation. WEDDING-only: capsules without a
 * guestToken (every non-WEDDING type) return 400.
 *
 * Coordinates (templates are 1054 × 1492):
 *   Box bounds detected from the orange border at x=296..750,
 *   y=447..997 — i.e. ~454 wide × 550 tall. We render a 440×440
 *   QR centred at (523, 722) so it almost fills the box
 *   horizontally (≈7px gutter each side) and gives the print
 *   plenty of scannable surface, with the extra vertical room
 *   absorbed equally above and below.
 */
const QR_SIZE = 440;
const QR_LEFT = Math.round((296 + 750) / 2 - QR_SIZE / 2); // 303
const QR_TOP = Math.round((447 + 997) / 2 - QR_SIZE / 2); // 502

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  const { id } = await ctx.params;
  const owned = await findOwnedCapsule(userId ?? null, id);
  if (!owned.ok)
    return NextResponse.json({ error: "Not found." }, { status: owned.status });

  const c = owned.capsule;
  if (c.occasionType !== "WEDDING" || !c.guestToken) {
    return NextResponse.json(
      {
        error:
          "Wedding share cards are only available on WEDDING-type capsules with a guest token.",
      },
      { status: 400 },
    );
  }

  const variant =
    req.nextUrl.searchParams.get("variant") === "white" ? "white" : "cream";
  const templatePath = path.join(
    process.cwd(),
    "public",
    `wedding-card-${variant}.png`,
  );

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
  const guestUrl = `${origin}/wedding/${encodeURIComponent(c.guestToken)}`;

  let composed: Buffer;
  try {
    // qrcode buffer in PNG, sized exactly to QR_SIZE so we don't
    // need to resample with sharp. Black-on-transparent so the
    // template's box border peeks through if the QR is slightly
    // smaller than the box.
    const qrBuffer = await QRCode.toBuffer(guestUrl, {
      type: "png",
      width: QR_SIZE,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0F1F3D", light: "#00000000" },
    });

    composed = await sharp(templatePath)
      .composite([{ input: qrBuffer, left: QR_LEFT, top: QR_TOP }])
      .png()
      .toBuffer();
  } catch (err) {
    console.error("[wedding-card] compose failed:", err);
    return NextResponse.json(
      { error: "Couldn't render the share card." },
      { status: 500 },
    );
  }

  // Stable filename per capsule so the user's downloads folder
  // doesn't accumulate "wedding-card (3).png" copies as they
  // re-download.
  const filename = `wedding-card-${variant}-${c.id}.png`;
  return new NextResponse(new Uint8Array(composed), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Length": composed.length.toString(),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
