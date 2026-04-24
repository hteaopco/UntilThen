import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// ElevenLabs text-to-speech + R2 upload helpers. Powers the
// stock-voice generation + upload flows on /admin/audio. Two
// clips live under stock-voices/*.mp3:
//   vault-mom         — used by the time-capsule / personal vault
//                       mock reveal. Intimate, open-ended.
//   capsule-birthday  — used by the gift capsule mock reveal.
//                       Short birthday message from one contributor.

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";

// Voice IDs from ElevenLabs' default library. Stable across accounts.
// Overridable per spec via the `voiceIdEnvVar` below.
const DEFAULT_VOICES = {
  // Bella — warm, soft female. Default Mom voice.
  bella: "EXAVITQu4vr4xnSDxMaL",
  // Rachel — confident, friendly female. Default birthday-wisher voice.
  rachel: "21m00Tcm4TlvDq8ikWAM",
} as const;

export type StockVoiceKey = "vault-mom" | "capsule-birthday";

export type StockVoiceSpec = {
  /** Filename the snippet lives under inside R2 stock-voices/. */
  key: StockVoiceKey;
  /** Display label shown in the admin audio panel. */
  label: string;
  /** Short description of where this voice is used. */
  context: string;
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
    key: "vault-mom",
    label: "Mom (time capsule)",
    context: "Used by the personal-vault / time-capsule mock reveal.",
    voiceIdEnvVar: "ELEVENLABS_VOICE_VAULT_MOM",
    voiceIdFallback: DEFAULT_VOICES.bella,
    voiceFallbackName: "Bella (warm female)",
    text:
      "Hi, baby girl. Happy first birthday. " +
      "I don't know when you'll hear this — maybe you're five, maybe you're twenty-five. " +
      "But I want you to know: the day you were born, my whole world got quieter and louder all at once. " +
      "I love you, Olivia. More than anything. Always.",
  },
  {
    key: "capsule-birthday",
    label: "Birthday wish (gift capsule)",
    context: "Used by the gift-capsule mock reveal.",
    voiceIdEnvVar: "ELEVENLABS_VOICE_CAPSULE_BIRTHDAY",
    voiceIdFallback: DEFAULT_VOICES.rachel,
    voiceFallbackName: "Rachel (friendly female)",
    text:
      "Happy birthday, my girl. " +
      "I can't believe how much you've grown — it feels like yesterday you were wobbling across the backyard. " +
      "I hope today is full of cake and laughter and the people who love you. " +
      "I love you. Always.",
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
  contentType?: string;
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
      ContentType: opts.contentType ?? "audio/mpeg",
    }),
  );
}
