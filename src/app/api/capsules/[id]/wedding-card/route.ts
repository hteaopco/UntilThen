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
 * Three cosmetic variants exist as PNG templates in /public:
 *   - wedding-card-cream.png  (1054×1492 portrait, big QR box)
 *   - wedding-card-white.png  (1054×1492 portrait, big QR box)
 *   - Easel-Card-Image.png    (1536×1024 landscape, small QR box
 *                              tucked next to the "ADD YOUR
 *                              MEMORIES" panel)
 *
 * All three ship with empty QR boxes. Until this endpoint, the
 * organiser had to print, paste a QR by hand, and reprint. We
 * compose the capsule's actual QR (`/wedding/<guestToken>`) into
 * the box and stream the result back as a download so the print
 * is one tap.
 *
 * Auth: same as the other capsule endpoints — the caller must
 * either be the original organiser or an OWNER/ADMIN of the
 * capsule's organisation. WEDDING-only: capsules without a
 * guestToken (every non-WEDDING type) return 400.
 *
 * Coordinates were detected per-template from the orange border
 * via pixel sampling; each variant carries its own size + offset
 * because the easel is landscape with a much smaller box than
 * the portrait cards.
 */
type TemplateConfig = {
  /** Filename in /public (case-sensitive on Linux). */
  file: string;
  /** Square QR size in pixels. */
  qrSize: number;
  /** Top-left composite offset on the template. */
  qrLeft: number;
  qrTop: number;
};

const TEMPLATES: Record<string, TemplateConfig> = {
  // Cream box: x=296..750, y=505..995 (~454 wide × 490 tall —
  // close to square). 450 QR gives ~2px horizontal gutter and
  // ~20px vertical gutter top + bottom.
  cream: { file: "wedding-card-cream.png", qrSize: 450, qrLeft: 298, qrTop: 525 },
  // White box: x=250..800, y=500..1053 (~550 wide × 553 tall —
  // a notably bigger printed box than the cream variant).
  // Reusing cream's coords made the QR look stranded; 530 QR
  // centred at (525, 776) fills the box like cream fills its
  // own (~10-12px gutter on every side) so the two thumbnails
  // read at the same visual scale.
  white: { file: "wedding-card-white.png", qrSize: 530, qrLeft: 260, qrTop: 511 },
  // Easel box: x=970..1127, y=697..860 (~157×163). 150 QR gives
  // ~3-4px gutter on every side without overlapping the orange
  // line.
  easel: { file: "Easel-Card-Image.png", qrSize: 150, qrLeft: 974, qrTop: 704 },
};

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

  const variantParam = req.nextUrl.searchParams.get("variant") ?? "cream";
  const tpl = TEMPLATES[variantParam] ?? TEMPLATES.cream;
  const variant = TEMPLATES[variantParam] ? variantParam : "cream";
  const templatePath = path.join(process.cwd(), "public", tpl.file);

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
  const guestUrl = `${origin}/wedding/${encodeURIComponent(c.guestToken)}`;

  let composed: Buffer;
  try {
    // qrcode buffer in PNG, sized exactly to the template's QR
    // slot so we don't need to resample with sharp. Black-on-
    // transparent so the template's box border peeks through if
    // the QR is slightly smaller than the box.
    const qrBuffer = await QRCode.toBuffer(guestUrl, {
      type: "png",
      width: tpl.qrSize,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0F1F3D", light: "#00000000" },
    });

    composed = await sharp(templatePath)
      .composite([{ input: qrBuffer, left: tpl.qrLeft, top: tpl.qrTop }])
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
