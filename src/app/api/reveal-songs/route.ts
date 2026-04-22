import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { r2IsConfigured, signGetUrl } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/reveal-songs
 *
 * Returns every admin-uploaded reveal song with a short-lived
 * signed preview URL. Used by the curator on the capsule landing
 * page so the owner can audition each option before saving the
 * pick to vault.revealSongId.
 *
 * Clerk-gated. Anyone signed in can list — there's no per-song
 * permission to enforce since the catalog is global.
 */
export async function GET(): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 },
    );

  const { prisma } = await import("@/lib/prisma");
  const songs = await prisma.revealSong.findMany({
    orderBy: { uploadedAt: "asc" },
    select: {
      id: true,
      name: true,
      r2Key: true,
      durationSec: true,
    },
  });

  const r2 = r2IsConfigured();
  const enriched = await Promise.all(
    songs.map(async (s) => ({
      id: s.id,
      name: s.name,
      durationSec: s.durationSec,
      previewUrl: r2 ? await signGetUrl(s.r2Key).catch(() => null) : null,
    })),
  );

  return NextResponse.json({ songs: enriched });
}
