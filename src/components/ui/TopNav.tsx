import { auth } from "@clerk/nextjs/server";
import { Building2 } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { HomeBackNav } from "@/components/ui/HomeBackNav";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { getOrgContextByClerkId } from "@/lib/orgs";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

/**
 * Shared top navigation used across authenticated surfaces
 * (dashboard, vault landing + sub-pages, diary, memory editor).
 *
 * Layout:
 *   [← back] [home] [untilThen]               [avatar]
 *   ────────────────────────────────────────────────────
 *
 * The home button and the wordmark both route to /home when the
 * viewer is signed in (the two-bubble entry landing), or to / when
 * signed out — so this component is safe to drop onto public pages
 * too without double-logic.
 *
 * Kept as a server component so the auth check happens SSR — we
 * pick up the viewer's User.avatarUrl, sign a short-lived GET URL
 * for the R2 object, and hand that down to the Avatar client
 * component. HomeBackNav and Avatar still handle their own
 * client-only bits (router.back(), dropdown state).
 */
export async function TopNav() {
  const { userId } = auth();
  const homeHref = userId ? "/home" : "/";

  let avatarViewUrl: string | null = null;
  let orgName: string | null = null;
  if (userId && process.env.DATABASE_URL) {
    try {
      const { prisma } = await import("@/lib/prisma");
      const u = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { avatarUrl: true },
      });
      if (u?.avatarUrl && r2IsConfigured()) {
        avatarViewUrl = await signGetUrl(u.avatarUrl);
      }
    } catch (err) {
      console.warn("[TopNav] avatar lookup failed:", err);
    }
    // Render the Enterprise pill when the viewer belongs to an
    // org. Cheap query — same lookup the /enterprise layout uses
    // and the result lives behind the same Postgres index.
    try {
      const ctx = await getOrgContextByClerkId(userId);
      if (ctx) orgName = ctx.organizationName;
    } catch {
      /* */
    }
  }

  return (
    <header className="border-b border-navy/[0.06] bg-cream">
      <div className="mx-auto max-w-[1020px] px-6 lg:px-10 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <HomeBackNav homeHref={homeHref} />
          <Link
            href={homeHref}
            aria-label="untilThen home"
            className="inline-flex items-center shrink-0"
          >
            <LogoSvg variant="dark" width={100} height={20} />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {orgName && (
            <Link
              href="/enterprise"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-tint border border-amber/30 text-amber-dark text-[12px] font-bold hover:bg-amber/15 transition-colors whitespace-nowrap"
              title={`Open ${orgName} dashboard`}
            >
              <Building2 size={12} strokeWidth={2.25} aria-hidden="true" />
              <span className="hidden sm:inline">Enterprise</span>
            </Link>
          )}
          {userId && (
            <div className="[&>div>button]:w-9 [&>div>button]:h-9">
              <Avatar avatarUrl={avatarViewUrl} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
