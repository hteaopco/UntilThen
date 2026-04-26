"use client";

import { BarChart3, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Two-column shell for /enterprise/*. Left rail = nav (Roster +
 * Stat Board, ADMIN+ only). Right column = page children.
 *
 * MEMBERs (role = MEMBER) don't see the left rail at all — they
 * only get the center "Create a Gift Capsule" CTA on the
 * /enterprise landing because they aren't allowed to manage the
 * roster or view org-wide stats.
 */
const ADMIN_NAV: Array<{ href: string; label: string; icon: typeof Users }> = [
  { href: "/enterprise/roster", label: "Roster", icon: Users },
  { href: "/enterprise/stats", label: "Stat Board", icon: BarChart3 },
];

export function EnterpriseShell({
  orgId: _orgId,
  orgName,
  role,
  children,
}: {
  orgId: string;
  orgName: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = role === "OWNER" || role === "ADMIN";

  return (
    <div className="mx-auto max-w-[1200px] px-5 sm:px-6 lg:px-10 pt-6 pb-12">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber">
          Enterprise
        </p>
        <h1 className="text-[26px] sm:text-[30px] font-extrabold text-navy tracking-[-0.5px]">
          {orgName}
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 lg:gap-8">
        {isAdmin && (
          <nav
            aria-label="Enterprise sections"
            className="lg:sticky lg:top-6 lg:self-start"
          >
            <ul className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible">
              {ADMIN_NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px] font-semibold whitespace-nowrap transition-colors ${
                        active
                          ? "bg-navy text-white"
                          : "text-ink-mid hover:text-navy hover:bg-navy/[0.04]"
                      }`}
                    >
                      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
