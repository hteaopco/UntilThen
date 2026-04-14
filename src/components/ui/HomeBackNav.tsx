"use client";

import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Small pair of circular nav buttons that sits in the top-left
 * of sub-page headers: a back button (browser history) and a
 * home button (→ /dashboard). On mobile there's no system-level
 * "home", so having both explicit + always-visible beats the
 * current mix of page-specific "Back to X" links.
 */
export function HomeBackNav({
  homeHref = "/dashboard",
  homeLabel = "Home",
}: {
  homeHref?: string;
  homeLabel?: string;
}) {
  const router = useRouter();

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Go back"
        title="Go back"
        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-navy/15 text-navy hover:border-navy hover:bg-amber-tint transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <Link
        href={homeHref}
        prefetch={false}
        aria-label={homeLabel}
        title={homeLabel}
        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-navy/15 text-navy hover:border-navy hover:bg-amber-tint transition-colors"
      >
        <Home size={16} strokeWidth={1.5} aria-hidden="true" />
      </Link>
    </div>
  );
}
