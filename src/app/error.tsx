"use client";

import { ErrorFallback } from "@/components/ui/ErrorFallback";

// Catches errors thrown anywhere under / that don't have a more
// specific route-group boundary (landing, blog, privacy, faq,
// help, etc.). Route-group error.tsx files under /dashboard,
// /vault, /capsules, /account, /admin, /reveal, /contribute
// take over for their own segments.
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorFallback error={error} reset={reset} scope="root" />;
}
