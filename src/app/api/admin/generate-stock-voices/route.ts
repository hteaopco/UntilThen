import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import {
  STOCK_VOICE_SPECS,
  r2KeyForStockVoice,
  synthesizeToElevenLabs,
  uploadSnippetToR2,
} from "@/lib/elevenlabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireAuth(req: NextRequest): NextResponse | null {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

type Result = {
  key: string;
  voiceId: string;
  bytes?: number;
  error?: string;
  durationMs?: number;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  await logAdminAction(req, "system.generate-stock-voices");

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "ELEVENLABS_API_KEY is not set. Add it to Railway variables and redeploy.",
      },
      { status: 500 },
    );
  }

  const results: Result[] = [];

  for (const spec of STOCK_VOICE_SPECS) {
    const voiceId = process.env[spec.voiceIdEnvVar] ?? spec.voiceIdFallback;
    const r2Key = r2KeyForStockVoice(spec.key);
    const startedAt = Date.now();
    try {
      const audio = await synthesizeToElevenLabs({
        apiKey,
        voiceId,
        text: spec.text,
      });
      await uploadSnippetToR2({ key: r2Key, body: audio });
      results.push({
        key: r2Key,
        voiceId,
        bytes: audio.length,
        durationMs: Date.now() - startedAt,
      });
      console.log(
        `[admin/generate-stock-voices] uploaded ${r2Key} — ${audio.length} bytes`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[admin/generate-stock-voices] ${r2Key} failed:`,
        message,
      );
      results.push({
        key: r2Key,
        voiceId,
        error: message,
        durationMs: Date.now() - startedAt,
      });
    }
  }

  const allOk = results.every((r) => !r.error);
  return NextResponse.json(
    { success: allOk, results },
    { status: allOk ? 200 : 500 },
  );
}
