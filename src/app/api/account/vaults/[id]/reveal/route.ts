import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/account/vaults/[id]/reveal
 *
 * Updates a vault's reveal-reel settings:
 *   - revealMode: "RANDOM" | "BUILD"
 *   - curatedSlides: array of { entryId, view } (BUILD mode only)
 *     view ∈ "letter" | "VOICE" | "PHOTO" | "VIDEO"
 *   - revealSongId: id of a RevealSong, or null to clear
 *
 * Validates ownership + that any referenced entries actually
 * belong to the vault. Caps curatedSlides at 5 to match the
 * RevealExperience STORY_LIMIT.
 */

type SlideRef = { entryId: string; view: "letter" | "VOICE" | "PHOTO" | "VIDEO" };

type PatchBody = {
  revealMode?: "RANDOM" | "BUILD";
  curatedSlides?: SlideRef[] | null;
  revealSongId?: string | null;
};

const MAX_SLIDES = 5;
const VALID_VIEWS = new Set(["letter", "VOICE", "PHOTO", "VIDEO"]);

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });

  const { id: vaultId } = await ctx.params;
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  const vault = await prisma.vault.findUnique({
    where: { id: vaultId },
    include: { child: { select: { parentId: true } } },
  });
  if (!vault || vault.child.parentId !== user.id)
    return NextResponse.json({ error: "Vault not found." }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (body.revealMode === "RANDOM" || body.revealMode === "BUILD") {
    data.revealMode = body.revealMode;
  }

  if ("curatedSlides" in body) {
    if (body.curatedSlides === null) {
      data.curatedSlides = null;
    } else if (Array.isArray(body.curatedSlides)) {
      if (body.curatedSlides.length > MAX_SLIDES) {
        return NextResponse.json(
          { error: `Curator caps out at ${MAX_SLIDES} slides.` },
          { status: 400 },
        );
      }
      // View must always be one of the four allowed strings.
      for (const slide of body.curatedSlides) {
        if (!VALID_VIEWS.has(slide.view)) {
          return NextResponse.json(
            { error: `Invalid view: ${slide.view}` },
            { status: 400 },
          );
        }
      }
      // Drop slides whose entryId doesn't resolve to a sealed
      // entry on this vault. Vault history can leave stale ids
      // in the curatedSlides JSON (entry deleted, moved, etc.)
      // — those would block every subsequent save (e.g. just
      // changing the reveal song) if we rejected the whole
      // request. Filtering keeps the user's other intent
      // (song change, mode flip) intact and the next save
      // persists a cleaned-up slide list.
      const ids = body.curatedSlides.map((s) => s.entryId);
      const okEntries = await prisma.entry.findMany({
        where: { id: { in: ids }, vaultId, isSealed: true },
        select: { id: true },
      });
      const okSet = new Set(okEntries.map((e) => e.id));
      data.curatedSlides = body.curatedSlides.filter((s) =>
        okSet.has(s.entryId),
      );
    } else {
      return NextResponse.json(
        { error: "curatedSlides must be an array or null." },
        { status: 400 },
      );
    }
  }

  if ("revealSongId" in body) {
    if (body.revealSongId === null) {
      data.revealSongId = null;
    } else if (typeof body.revealSongId === "string") {
      const song = await prisma.revealSong.findUnique({
        where: { id: body.revealSongId },
        select: { id: true },
      });
      if (!song) {
        return NextResponse.json(
          { error: "Song not found." },
          { status: 400 },
        );
      }
      data.revealSongId = body.revealSongId;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  await prisma.vault.update({ where: { id: vaultId }, data });
  revalidatePath(`/vault/${vault.childId}`);
  revalidatePath(`/vault/${vault.childId}/preview`);

  return NextResponse.json({ success: true });
}
