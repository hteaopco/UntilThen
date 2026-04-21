import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { HomeBackNav } from "@/components/ui/HomeBackNav";
import { LogoSvg } from "@/components/ui/LogoSvg";

/**
 * Shared top navigation used across authenticated surfaces
 * (dashboard, vault landing + sub-pages, diary, memory editor).
 *
 * Layout:
 *   [← back] [home] [untilThen]               [avatar]
 *   ────────────────────────────────────────────────────
 *
 * The home button and the wordmark both route to /dashboard when
 * the viewer is signed in, or to / otherwise — so this component
 * is safe to drop onto public pages too without double-logic.
 *
 * Kept as a server component so the auth check happens SSR and
 * the right home target is baked into the HTML. The inner
 * HomeBackNav and Avatar components handle their own client-only
 * behavior (router.back(), Clerk popover).
 */
export function TopNav() {
  const { userId } = auth();
  const homeHref = userId ? "/dashboard" : "/";

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
        {userId && (
          <div className="[&>div>button]:w-9 [&>div>button]:h-9">
            <Avatar />
          </div>
        )}
      </div>
    </header>
  );
}
