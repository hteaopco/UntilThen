import Link from "next/link";
import { Gift, Sparkles } from "lucide-react";

export function DashboardGreeting({
  firstName,
  updatesCount,
}: {
  firstName: string;
  updatesCount: number;
}) {
  const greetingName = firstName ? `Hi, ${firstName}` : "Welcome back";

  return (
    <section className="flex items-start justify-between gap-3 sm:gap-8">
      <div className="flex-1 min-w-0">
        <h1 className="font-brush text-[32px] sm:text-[56px] leading-none text-navy whitespace-nowrap">
          {greetingName}
          <span className="ml-2 align-middle text-amber text-[22px] sm:text-[32px]">
            ♡
          </span>
        </h1>
        <p className="mt-1.5 sm:mt-1 text-[14px] sm:text-[18px] leading-[1.35] text-navy sm:max-w-[520px]">
          <span className="font-bold text-amber">Welcome to your Vault!</span>{" "}
          Every moment captured becomes timeless.
        </p>
      </div>

      <div className="shrink-0 flex items-start gap-2 sm:gap-4">
        <ChipCard
          href="/dashboard/preview"
          label="Updates"
          icon={<Sparkles size={20} strokeWidth={1.5} className="text-amber sm:hidden" />}
          iconLg={<Sparkles size={24} strokeWidth={1.5} className="text-amber hidden sm:block" />}
          badge={updatesCount}
        />
        <ChipCard
          href="/capsules/new"
          label="Gift Capsules"
          icon={<Gift size={20} strokeWidth={1.5} className="text-amber sm:hidden" />}
          iconLg={<Gift size={24} strokeWidth={1.5} className="text-amber hidden sm:block" />}
        />
      </div>
    </section>
  );
}

function ChipCard({
  href,
  label,
  icon,
  iconLg,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  iconLg: React.ReactNode;
  badge?: number;
}) {
  const showBadge = typeof badge === "number" && badge > 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <Link
        href={href}
        prefetch={false}
        aria-label={label}
        className="relative w-[56px] sm:w-[80px] h-[56px] sm:h-[80px] rounded-xl sm:rounded-2xl bg-white border border-amber/15 shadow-[0_4px_12px_-4px_rgba(196,122,58,0.15)] flex items-center justify-center hover:border-amber/40 transition-colors"
      >
        {icon}
        {iconLg}
        {showBadge && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-amber text-white text-[10px] sm:text-[11px] font-bold flex items-center justify-center shadow-[0_2px_4px_rgba(196,122,58,0.35)]">
            {badge! > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
      <span className="text-[10px] sm:text-[13px] font-semibold text-navy whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}
