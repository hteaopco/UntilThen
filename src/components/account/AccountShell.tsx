"use client";

import {
  Bell,
  CreditCard,
  User,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Tab = {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
};

const TABS: Tab[] = [
  { href: "/account", label: "Profile", shortLabel: "Profile", icon: User },
  { href: "/account/capsules", label: "Time Capsules", shortLabel: "Capsules", icon: UsersRound },
  { href: "/account/notifications", label: "Notifications", shortLabel: "Alerts", icon: Bell },
  { href: "/account/billing", label: "Billing", shortLabel: "Billing", icon: CreditCard },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/account") return pathname === "/account";
  return pathname.startsWith(href);
}

export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <section className="mx-auto max-w-[1020px] px-6 lg:px-10 pt-8 lg:pt-10 pb-24 lg:pb-12">
      <h1 className="text-[32px] lg:text-[40px] font-extrabold text-navy tracking-[-0.8px] leading-[1.05] mb-8">
        Account
      </h1>

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

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Account sections"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-navy/[0.08] safe-bottom"
      >
        <div className="flex items-stretch">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch={false}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] transition-colors ${
                  active ? "text-amber" : "text-ink-light"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2 : 1.5} aria-hidden="true" />
                <span className="text-[10px] font-bold tracking-[0.02em]">
                  {tab.shortLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </section>
  );
}
