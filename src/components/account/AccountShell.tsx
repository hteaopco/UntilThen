"use client";

import {
  Bell,
  CreditCard,
  User,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Tab = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const TABS: Tab[] = [
  { href: "/account", label: "Profile", icon: User },
  { href: "/account/children", label: "Time Capsules", icon: UsersRound },
  { href: "/account/contributors", label: "Contributors", icon: Users },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/billing", label: "Billing", icon: CreditCard },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/account") return pathname === "/account";
  return pathname.startsWith(href);
}

/**
 * Shared account-section layout. Sidebar on desktop, horizontal
 * pill strip on mobile. Renders whatever page the child route
 * provides inside the main content column.
 */
export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <section className="mx-auto max-w-[1020px] px-6 lg:px-10 pt-8 lg:pt-10 pb-24">
      <h1 className="text-[32px] lg:text-[40px] font-extrabold text-navy tracking-[-0.8px] leading-[1.05] mb-8">
        Account
      </h1>

      {/* Mobile tab strip */}
      <nav
        aria-label="Account sections"
        className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-4 border-b border-navy/[0.06] -mx-6 px-6"
      >
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={false}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-[0.06em] whitespace-nowrap transition-colors ${
                active
                  ? "bg-amber-tint text-amber border border-amber/30"
                  : "border border-navy/15 text-ink-mid"
              }`}
            >
              <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <nav aria-label="Account sections" className="flex flex-col gap-1">
            {TABS.map((tab) => {
              const active = isActive(pathname, tab.href);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  prefetch={false}
                  className={`flex items-center gap-3 text-sm font-semibold px-3 py-2.5 rounded-md border-l-[3px] transition-colors ${
                    active
                      ? "bg-amber-tint text-amber border-amber"
                      : "text-navy border-transparent hover:bg-amber-tint/40 hover:text-amber"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
