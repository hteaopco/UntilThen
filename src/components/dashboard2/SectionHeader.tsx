import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Section header for dashboard2 rows: small amber-tinted icon bubble,
 * navy title, and an optional "View all" link on the right.
 */
export function SectionHeader({
  icon,
  title,
  viewAllHref,
}: {
  icon: React.ReactNode;
  title: string;
  viewAllHref?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="shrink-0 w-10 h-10 rounded-full bg-amber-tint flex items-center justify-center text-amber" aria-hidden="true">
          {icon}
        </span>
        <h2 className="text-[17px] sm:text-[22px] font-bold text-navy tracking-[-0.3px] leading-tight">
          {title}
        </h2>
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          prefetch={false}
          className="shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold text-ink-mid hover:text-navy transition-colors whitespace-nowrap"
        >
          View all
          <ChevronRight size={16} strokeWidth={2} />
        </Link>
      )}
    </div>
  );
}
