import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { checkRateLimit, clientIp } from "@/lib/ratelimit";

// Routes that don't require Clerk sign-in.
const isPublicRoute = createRouteMatcher([
  "/",
  "/faq",
  "/blog",
  "/blog/(.*)",
  "/privacy",
  "/terms",
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Gift Capsule public surfaces — contributor invite links
  // and the recipient reveal flow are both accountless by design.
  // /capsules/new is public too so visitors landing from the
  // pricing CTA can fill out step 1 before being asked to
  // sign up. The API routes still gate on Clerk.
  "/capsules/new",
  "/contribute/capsule/(.*)",
  "/reveal/(.*)",
  "/api/contribute/capsule/(.*)",
  "/api/capsules/(.*)/refresh-token",
  "/api/reveal/(.*)",
  "/api/webhooks/(.*)",
  "/api/health(.*)",
]);

// Path-based rate limit classification. Order matters — first
// match wins. Anything that ends up unclassified under /api/*
// gets the moderate "authenticated" cap.
//
// Auth = strict (5/min), email = very strict (3/10min),
// public = 20/min, authenticated = 100/min.
function rateLimitKindFor(
  method: string,
  path: string,
): "public" | "auth" | "email" | "authenticated" | null {
  if (!path.startsWith("/api/")) return null;
  // Health probes — never throttle, Railway/uptime monitors hit
  // them on a tight schedule.
  if (path.startsWith("/api/health")) return null;
  // Cron jobs — self-auth via bearer token, never rate-limited.
  if (path.startsWith("/api/cron")) return null;
  // Sentry tunnel route — never throttle.
  if (path.startsWith("/monitoring")) return null;

  // Email-sending endpoints
  if (method === "POST" && /^\/api\/capsules\/[^/]+\/invites$/.test(path))
    return "email";
  if (
    method === "POST" &&
    /^\/api\/capsules\/[^/]+\/refresh-token$/.test(path)
  )
    return "email";
  // Auth-strict — account creation
  if (method === "POST" && path === "/api/onboarding") return "auth";

  // Public anonymous surfaces
  if (path.startsWith("/api/contribute/capsule/")) return "public";
  if (path.startsWith("/api/reveal/")) return "public";
  // Webhooks are signature-verified inside the handler — don't
  // throttle here since Square retries aggressively on any
  // non-2xx and can spike momentarily on renewal waves.
  if (path.startsWith("/api/webhooks/")) return null;

  // Default for any other API hit
  return "authenticated";
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Rate limiting runs before any auth work so abusive traffic
  // can't burn Clerk quota. Skip when the limiter isn't
  // configured (the helper returns success=true in that case).
  const kind = rateLimitKindFor(req.method, pathname);
  if (kind) {
    const ip = clientIp(req.headers);
    const { userId } = auth();
    const key =
      kind === "authenticated" && userId ? `${userId}:${ip}` : ip;
    const { success, limit, remaining, reset } = await checkRateLimit(
      kind,
      key,
    );
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": Math.ceil(
              (reset - Date.now()) / 1000,
            ).toString(),
          },
        },
      );
    }
  }

  // The admin dashboard and its APIs run on a separate password-cookie
  // auth system, so Clerk shouldn't touch them. Handle them first and
  // short-circuit before Clerk's protect() can redirect to /sign-in.
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const adminAuth = req.cookies.get("admin_auth")?.value;
    if (!process.env.ADMIN_PASSWORD || adminAuth !== process.env.ADMIN_PASSWORD) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  // /api/admin/* routes self-guard via the same cookie check inside
  // each handler. Don't let Clerk intercept them.
  if (pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }
  // Cron endpoints self-guard via bearer token.
  if (pathname.startsWith("/api/cron")) {
    return NextResponse.next();
  }

  // Everything else uses Clerk auth for protected routes.
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  // Standard Clerk matcher: all app routes except static assets and _next
  // internals, plus all API / tRPC routes.
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
