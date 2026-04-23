import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { deleteR2Object, r2IsConfigured } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/admin/reveal-songs/[id]
 *
 * Removes the song from R2 and from the catalog. Vault FK is
 * ON DELETE SET NULL so any vault that picked this song quietly
 * reverts to "no music" — no broken refs.
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });

  const { id } = await ctx.params;
  const { prisma } = await import("@/lib/prisma");
  const song = await prisma.revealSong.findUnique({
    where: { id },
    select: { id: true, r2Key: true },
  });
  if (!song)
    return NextResponse.json({ error: "Song not found." }, { status: 404 });

  if (r2IsConfigured()) {
    try {
      await deleteR2Object(song.r2Key);
    } catch (err) {
      console.error("[admin/reveal-songs] R2 delete failed:", err);
      // Non-fatal — orphan the file but still drop the DB row so
      // the admin doesn't get stuck with an undeletable entry.
    }
  }

  await prisma.revealSong.delete({ where: { id } });

  await logAdminAction(
    req,
    "reveal-song.delete",
    { type: "RevealSong", id: song.id },
    { r2Key: song.r2Key },
  );

  return NextResponse.json({ success: true });
}
