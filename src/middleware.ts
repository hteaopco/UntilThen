import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow the login page and its assets through — otherwise we create an
  // infinite redirect loop when the user has no cookie yet.
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const auth = req.cookies.get("admin_auth")?.value;
    if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
