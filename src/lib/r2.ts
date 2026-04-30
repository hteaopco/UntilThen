import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 is S3-compatible. Endpoint pattern:
// https://{account}.r2.cloudflarestorage.com
export const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "untilthen-media";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 is not configured. Missing R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY.",
    );
  }
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

export function r2IsConfigured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY,
  );
}

export async function signPutUrl(
  key: string,
  contentType: string,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn: 600 }); // 10 min
}

export async function signGetUrl(key: string): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  return getSignedUrl(getClient(), cmd, { expiresIn: 3600 }); // 1 hour
}

export async function deleteR2Object(key: string): Promise<void> {
  const cmd = new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key });
  await getClient().send(cmd);
}

// Build a safe storage key. Five surfaces use this:
//   target=entry              → entries/{id}/{kind}/{ts}-{name}
//   target=capsuleContribution → capsule-contributions/{id}/{kind}/{ts}-{name}
//   target=vault              → vaults/{id}/{kind}/{ts}-{name}
//   target=collection         → collections/{id}/{kind}/{ts}-{name}
//   target=userAvatar         → users/{id}/avatar/{ts}-{name}
// The complete + delete routes parse the prefix back so the right
// table receives the update — keep these in sync if either pattern
// changes.
export type MediaTarget =
  | "entry"
  | "capsuleContribution"
  | "vault"
  | "collection"
  | "userAvatar"
  | "capsuleCover";

export function mediaKeyPrefix(target: MediaTarget, id: string): string {
  switch (target) {
    case "entry":
      return `entries/${id}`;
    case "capsuleContribution":
      return `capsule-contributions/${id}`;
    case "vault":
      return `vaults/${id}`;
    case "collection":
      return `collections/${id}`;
    case "userAvatar":
      return `users/${id}`;
    case "capsuleCover":
      return `gift-capsules/${id}`;
  }
}

export function buildMediaKey({
  target = "entry",
  id,
  entryId,
  kind,
  filename,
}: {
  target?: MediaTarget;
  /** Preferred: id + target. */
  id?: string;
  /** Back-compat alias. */
  entryId?: string;
  kind: "photo" | "voice" | "video";
  filename: string;
}): string {
  const resolvedId = id ?? entryId ?? "";
  const safe = filename
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(-60);
  return `${mediaKeyPrefix(target, resolvedId)}/${kind}/${Date.now()}-${safe}`;
}

export type MediaKind = "photo" | "voice" | "video";

// Size + content-type constraints used on the signing endpoint.
export const MEDIA_LIMITS: Record<
  MediaKind,
  { maxBytes: number; prefix: string }
> = {
  photo: { maxBytes: 10 * 1024 * 1024, prefix: "image/" },
  voice: { maxBytes: 50 * 1024 * 1024, prefix: "audio/" },
  video: { maxBytes: 200 * 1024 * 1024, prefix: "video/" },
};

export const PHOTOS_PER_YEAR_LIMIT = 500;
