"use client";

import { BarChart3, Home, Users } from "lucide-react";
import Link from "next/link";

/**
 * Slim contextual sub-nav rendered above CapsuleOverview for
 * org-attributed capsules. Lets the viewer jump back to their
 * enterprise surfaces without bouncing through /home → /enterprise.
 *
 * MEMBERs only see Home (Roster + Stat Board are admin-only).
 * Server resolves the role and passes it down so this stays a
 * client component for nothing more than the inline Tailwind hover
 * state — no auth round-trip on render.
 */
export function EnterpriseCapsuleSubNav({
  role,
}: {
  role: "OWNER" | "ADMIN" | "MEMBER";
}) {
  const isAdmin = role === "OWNER" || role === "ADMIN";
  return (
    <nav
      aria-label="Enterprise sections"
      className="border-b border-navy/[0.06] bg-cream/80 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-[840px] px-6 lg:px-10 py-2 flex items-center gap-1.5 overflow-x-auto">
        <SubNavLink href="/enterprise" icon={Home}>
          Enterprise home
        </SubNavLink>
        {isAdmin && (
          <>
            <SubNavLink href="/enterprise/roster" icon={Users}>
              Roster
            </SubNavLink>
            <SubNavLink href="/enterprise/stats" icon={BarChart3}>
              Stat Board
            </SubNavLink>
          </>
        )}
      </div>
    </nav>
  );
}

function SubNavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof Home;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold text-ink-mid hover:text-navy hover:bg-navy/[0.04] whitespace-nowrap transition-colors"
    >
      <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
      {children}
    </Link>
  );
}
