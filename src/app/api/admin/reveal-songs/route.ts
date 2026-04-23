import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { R2_BUCKET, r2IsConfigured } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin CRUD for reveal background songs.
 *
 * - GET   → list every song (id, name, durationSec, uploadedAt)
 * - POST  → multipart upload: { file, name } → uploads to R2
 *   under reveal-music/{cuid}-{safe-filename}, then writes a
 *   RevealSong row pointing at the key.
 *
 * Capsule owners read the list via /api/reveal-songs (auth-gated
 * but not admin-gated) so they can preview + pick one for their
 * vault. Deletion lives under [id]/route.ts.
 *
 * Upload limit: 20 MB. Songs are short-loop ambient — anything
 * bigger is almost certainly the wrong file. Type must start
 * with audio/.
 */

const MAX_BYTES = 20 * 1024 * 1024;

function r2Client(): S3Client {
  // R2 is S3-compatible. Build the same client r2.ts uses but
  // colocate here so the file stays self-contained — admin
  // upload doesn't share the lib's lazy singleton.
  const accountId = process.env.R2_ACCOUNT_ID!;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

function checkAdmin(req: NextRequest): NextResponse | null {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authErr = checkAdmin(req);
  if (authErr) return authErr;
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });

  const { prisma } = await import("@/lib/prisma");
  const songs = await prisma.revealSong.findMany({
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      name: true,
      r2Key: true,
      durationSec: true,
      uploadedAt: true,
    },
  });

  return NextResponse.json({
    songs: songs.map((s) => ({
      id: s.id,
      name: s.name,
      r2Key: s.r2Key,
      durationSec: s.durationSec,
      uploadedAt: s.uploadedAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authErr = checkAdmin(req);
  if (authErr) return authErr;
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  if (!r2IsConfigured())
    return NextResponse.json(
      { error: "Media storage isn't configured." },
      { status: 503 },
    );

  const form = await req.formData().catch(() => null);
  if (!form)
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });

  const file = form.get("file");
  const name = form.get("name");
  const durationSecRaw = form.get("durationSec");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing audio file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error: `File too large. Max is ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`,
      },
      { status: 413 },
    );
  }
  const contentType = file.type || "audio/mpeg";
  if (!contentType.startsWith("audio/")) {
    return NextResponse.json(
      { error: "File must be an audio file (audio/*)." },
      { status: 400 },
    );
  }
  const songName =
    typeof name === "string" && name.trim()
      ? name.trim().slice(0, 80)
      : (file.name || "Untitled song").replace(/\.[^.]+$/, "").slice(0, 80);

  // Optional duration — front-end can read it via HTMLAudioElement
  // and pass it along so the admin list shows pretty "2:42" badges.
  let durationSec: number | null = null;
  if (typeof durationSecRaw === "string") {
    const n = Number(durationSecRaw);
    if (Number.isFinite(n) && n > 0 && n < 60 * 60) {
      durationSec = Math.round(n);
    }
  }

  const { prisma } = await import("@/lib/prisma");
  // Generate the cuid up front so we can put the key together
  // before the DB insert. R2 PUT first, then DB row — if the DB
  // insert fails we only orphan a small file (admin can re-upload).
  const safe = songName.replace(/[^\w\-]+/g, "_").slice(-40) || "song";
  const r2Key = `reveal-music/${Date.now()}-${safe}.mp3`;

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    await r2Client().send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  } catch (err) {
    console.error("[admin/reveal-songs] R2 upload failed:", err);
    return NextResponse.json(
      { error: "Couldn't upload the audio file." },
      { status: 502 },
    );
  }

  const created = await prisma.revealSong.create({
    data: {
      name: songName,
      r2Key,
      durationSec,
    },
    select: {
      id: true,
      name: true,
      r2Key: true,
      durationSec: true,
      uploadedAt: true,
    },
  });

  await logAdminAction(
    req,
    "reveal-song.upload",
    { type: "RevealSong", id: created.id },
    { name: created.name, r2Key: created.r2Key, durationSec: created.durationSec },
  );

  return NextResponse.json({
    song: {
      id: created.id,
      name: created.name,
      r2Key: created.r2Key,
      durationSec: created.durationSec,
      uploadedAt: created.uploadedAt.toISOString(),
    },
  });
}
