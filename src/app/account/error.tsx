"use client";

import { ErrorFallback } from "@/components/ui/ErrorFallback";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      variant="account"
      scope="account"
      ctaHref="/dashboard"
      ctaLabel="Back to dashboard"
    />
  );
}
