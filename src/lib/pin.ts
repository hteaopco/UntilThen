import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

// 4-digit PIN hashing using Node's built-in scrypt. Work factor
// is scrypt's default (N=16384, r=8, p=1), which is modest but
// appropriate — a 4-digit PIN has only 10 000 possible values
// so the hash strength matters less than rate-limiting attempts.
// Format: "scrypt:<saltHex>:<hashHex>" so we can version later
// if we ever need to rotate the algorithm.

const SCRYPT_KEYLEN = 32;

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, SCRYPT_KEYLEN);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string | null): boolean {
  if (!stored) return false;
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  try {
    const salt = Buffer.from(parts[1], "hex");
    const expected = Buffer.from(parts[2], "hex");
    const actual = scryptSync(pin, salt, expected.length);
    if (actual.length !== expected.length) return false;
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^[0-9]{4}$/.test(pin);
}

// ── Reset tokens ─────────────────────────────────────────────

export interface PinResetToken {
  /** Raw token to email to the user. URL-safe base64. */
  token: string;
  /** SHA-256 hash of the raw token — this is what we store. */
  hash: string;
  /** Expiry timestamp (1 hour from now). */
  expires: Date;
}

export function generateResetToken(): PinResetToken {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return { token, hash, expires };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
