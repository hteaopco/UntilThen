// IP-keyed sliding-window rate limits backed by Upstash Redis.
//
// When UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are
// missing (local dev, preview deploys) the limiter falls back
// to a no-op so requests aren't blocked. In production both
// vars must be set or every request short-circuits to "allow".
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimiterKind = "public" | "authenticated" | "auth" | "email";

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export const ratelimitConfigured = Boolean(REDIS_URL && REDIS_TOKEN);

const redis = ratelimitConfigured
  ? new Redis({ url: REDIS_URL!, token: REDIS_TOKEN! })
  : null;

function buildLimiter(
  prefix: string,
  tokens: number,
  window: Parameters<typeof Ratelimit.slidingWindow>[1],
): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: true,
    prefix,
  });
}

const limiters: Record<LimiterKind, Ratelimit | null> = {
  // Anonymous public surfaces — capsule reveals, contributor
  // submission tokens. Tight cap because these have no auth
  // backing them.
  public: buildLimiter("rl:public", 20, "1 m"),

  // Authenticated app traffic. Generous, mostly here to catch
  // runaway client loops.
  authenticated: buildLimiter("rl:auth", 100, "1 m"),

  // Sign-in / sign-up — anything that creates an account or
  // attempts credentials.
  auth: buildLimiter("rl:auth-strict", 5, "1 m"),

  // Anything that triggers an email send. 10 in 10 minutes gives a
  // parent room to invite a handful of grandparents / teachers
  // back-to-back without tripping the limiter, while still slamming
  // the door on mass-invite scripts.
  email: buildLimiter("rl:email", 10, "10 m"),
};

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check the limiter for a given identifier (typically the
 * client IP). Returns success=true when rate limiting is
 * disabled or the request is under the cap; success=false when
 * the cap is exceeded.
 *
 * If the Upstash call itself throws (misconfigured URL, DNS
 * failure, network blip, quota exhaustion), we log and fall
 * open to "allow" rather than 500-ing the caller. A broken
 * rate-limiter shouldn't take down the product.
 */
export async function checkRateLimit(
  kind: LimiterKind,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = limiters[kind];
  if (!limiter) {
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: Date.now(),
    };
  }
  try {
    return await limiter.limit(identifier);
  } catch (err) {
    console.error("[ratelimit] upstash call failed, allowing request:", err);
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: Date.now(),
    };
  }
}

/**
 * Pull the best-available client IP out of a request's headers.
 * Cloudflare adds CF-Connecting-IP; otherwise we fall back to
 * X-Forwarded-For (first hop), then X-Real-IP, then a stable
 * sentinel so requests without any IP header still bucket
 * deterministically.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "0.0.0.0"
  );
}
