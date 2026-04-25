"use client";

import { ArrowLeft, Home, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Small pair of circular nav buttons that sits in the top-left
 * of sub-page headers: back (browser history), home (→ /home),
 * and settings (→ /account). On mobile there's no system-level
 * "home", so having all three explicit + always-visible beats
 * the current mix of page-specific "Back to X" links.
 *
 * Default homeHref is /home (the signed-in two-bubble landing).
 * Callers can override — TopNav passes "/" for signed-out
 * viewers so the public home button still routes sensibly.
 */
export function HomeBackNav({
  homeHref = "/home",
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
      <Link
        href="/account"
        prefetch={false}
        aria-label="Account settings"
        title="Account settings"
        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-navy/15 text-navy hover:border-navy hover:bg-amber-tint transition-colors"
      >
        <Settings size={16} strokeWidth={1.5} aria-hidden="true" />
      </Link>
    </div>
  );
}
