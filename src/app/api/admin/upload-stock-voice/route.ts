import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import {
  STOCK_VOICE_SPECS,
  r2KeyForStockVoice,
  uploadSnippetToR2,
  type StockVoiceKey,
} from "@/lib/elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Cap at 10 MB — voice snippets are under 500 KB on typical bitrate.
// Generous ceiling to accommodate lossless uploads without blowing
// up the container's heap on a misuse.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function requireAuth(req: NextRequest): NextResponse | null {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function isValidKey(k: string): k is StockVoiceKey {
  return STOCK_VOICE_SPECS.some((s) => s.key === k);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data." },
      { status: 400 },
    );
  }

  const keyRaw = String(formData.get("key") ?? "");
  const file = formData.get("file");

  if (!isValidKey(keyRaw)) {
    return NextResponse.json(
      { error: `Unknown voice key: ${keyRaw}` },
      { status: 400 },
    );
  }
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' upload." },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: `File too large (${file.size} bytes). Max ${MAX_UPLOAD_BYTES}.`,
      },
      { status: 413 },
    );
  }

  const contentType = file.type || "audio/mpeg";
  if (!contentType.startsWith("audio/")) {
    return NextResponse.json(
      { error: `Expected audio/*, got ${contentType}.` },
      { status: 400 },
    );
  }

  await logAdminAction(req, "system.stock-voice-upload", { key: keyRaw });

  const buffer = Buffer.from(await file.arrayBuffer());
  const r2Key = r2KeyForStockVoice(keyRaw);

  try {
    await uploadSnippetToR2({ key: r2Key, body: buffer, contentType });
    console.log(
      `[admin/upload-stock-voice] ${r2Key} — ${buffer.length} bytes (${contentType})`,
    );
    return NextResponse.json({
      success: true,
      key: r2Key,
      bytes: buffer.length,
      contentType,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[admin/upload-stock-voice] failed:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
