import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Routes that don't require Clerk sign-in.
const isPublicRoute = createRouteMatcher([
  "/",
  "/faq",
  "/blog",
  "/blog/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/invite/(.*)",
  // Memory Capsule public surfaces — contributor invite links
  // and the recipient reveal flow are both accountless by design.
  // /capsules/new is public too so visitors landing from the
  // pricing CTA can fill out step 1 before being asked to
  // sign up. The API routes still gate on Clerk.
  "/capsules/new",
  "/contribute/capsule/(.*)",
  "/capsule/(.*)/open",
  "/api/contribute/capsule/(.*)",
  "/api/capsules/open/(.*)",
  "/api/capsules/(.*)/refresh-token",
  "/api/waitlist(.*)",
  "/api/health(.*)",
  "/api/invites/(.*)",
]);

export default clerkMiddleware((auth, req) => {
  const { pathname } = req.nextUrl;

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
