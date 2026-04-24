import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// ElevenLabs text-to-speech. Used by /api/admin/generate-stock-voices
// to build the stock audio played in MockRevealPreview — previously
// a W3C horse-whinny sample. Also provides the scaffolding for any
// one-off marketing clips we generate later.

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

// Voice IDs from ElevenLabs' default library. Stable across accounts.
// Can be overridden via env if someone wants a specific sound.
const DEFAULT_VOICES = {
  // Warm, motherly — closest to an older-female feel in the free lib.
  grandmother: "EXAVITQu4vr4xnSDxMaL",
  // Deep male voice, warm — stand-in for grandfather.
  grandfather: "pNInz6obpgDQGcFmaJgB",
} as const;

export type StockVoiceKey = "grandma-rose" | "grandpa-bill";

export type StockVoiceSpec = {
  /** Filename the snippet lives under inside R2 stock-voices/. */
  key: StockVoiceKey;
  /** Display label shown in the admin audio panel. */
  label: string;
  /** ElevenLabs voice_id; overridable via env. */
  voiceIdEnvVar: string;
  voiceIdFallback: string;
  /** Which default library voice the fallback corresponds to. */
  voiceFallbackName: string;
  /** Script read aloud by ElevenLabs. */
  text: string;
};

export const STOCK_VOICE_SPECS: StockVoiceSpec[] = [
  {
    key: "grandma-rose",
    label: "Grandma Rose",
    voiceIdEnvVar: "ELEVENLABS_VOICE_GRANDMA",
    voiceIdFallback: DEFAULT_VOICES.grandmother,
    voiceFallbackName: "Bella (warm female)",
    text:
      "Oh, my little Olivia. Happy first birthday, my sweet girl. " +
      "I remember the day your mama called me, crying happy tears — " +
      "I drove through the night just to hold you. You were so tiny. " +
      "And now look at you, one whole year old. " +
      "Grandma loves you to the moon, bug.",
  },
  {
    key: "grandpa-bill",
    label: "Grandpa Bill",
    voiceIdEnvVar: "ELEVENLABS_VOICE_GRANDPA",
    voiceIdFallback: DEFAULT_VOICES.grandfather,
    voiceFallbackName: "Adam (deep male)",
    text:
      "Happy birthday, Olivia. I held you the day you came home " +
      "from the hospital — you fell asleep right on my chest. " +
      "Now you're walking around the backyard chasing butterflies " +
      "and telling me exactly what's what. " +
      "You're going to do wonderful things, kiddo. Grandpa's proud of you. Always.",
  },
];

export function r2KeyForStockVoice(key: StockVoiceKey): string {
  return `stock-voices/${key}.mp3`;
}

export async function synthesizeToElevenLabs(opts: {
  apiKey: string;
  voiceId: string;
  text: string;
}): Promise<Buffer> {
  const { apiKey, voiceId, text } = opts;
  const res = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.4,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `ElevenLabs returned ${res.status}: ${body.slice(0, 500) || "(empty body)"}`,
    );
  }

  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

export async function uploadSnippetToR2(opts: {
  key: string;
  body: Buffer;
}): Promise<void> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2 is not configured.");
  }
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  const bucket = process.env.R2_BUCKET_NAME ?? "untilthen-media";
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: opts.key,
      Body: opts.body,
      ContentType: "audio/mpeg",
    }),
  );
}
