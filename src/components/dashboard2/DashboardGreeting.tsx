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
    <section>
      <div className="flex items-start justify-between gap-4 sm:gap-8">
        <h1 className="font-brush text-[44px] sm:text-[56px] leading-none text-navy">
          {greetingName}
          <span className="ml-2 align-middle text-amber text-[28px] sm:text-[32px]">
            ♡
          </span>
        </h1>

        <div className="shrink-0 flex items-start gap-3 sm:gap-4">
          <ChipCard
            href="/dashboard/preview"
            label="Updates"
            icon={<Sparkles size={24} strokeWidth={1.5} className="text-amber" />}
            badge={updatesCount}
          />
          <ChipCard
            href="/capsules/new"
            label="Gift Capsules"
            icon={<Gift size={24} strokeWidth={1.5} className="text-amber" />}
          />
        </div>
      </div>

      <p className="mt-2 sm:-mt-10 text-[16px] sm:text-[18px] leading-[1.4] text-navy sm:max-w-[460px]">
        Every moment you capture becomes something unforgettable.
      </p>
    </section>
  );
}

function ChipCard({
  href,
  label,
  icon,
  badge,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}) {
  const showBadge = typeof badge === "number" && badge > 0;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Link
        href={href}
        prefetch={false}
        aria-label={label}
        className="relative w-[72px] sm:w-[80px] h-[72px] sm:h-[80px] rounded-2xl bg-white border border-amber/15 shadow-[0_4px_12px_-4px_rgba(196,122,58,0.15)] flex items-center justify-center hover:border-amber/40 transition-colors"
      >
        {icon}
        {showBadge && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber text-white text-[11px] font-bold flex items-center justify-center shadow-[0_2px_4px_rgba(196,122,58,0.35)]">
            {badge! > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
      <span className="text-[12px] sm:text-[13px] font-semibold text-navy">
        {label}
      </span>
    </div>
  );
}
