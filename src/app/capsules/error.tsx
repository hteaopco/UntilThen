"use client";

import { ErrorFallback } from "@/components/ui/ErrorFallback";

export default function CapsulesError({
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
      scope="capsules"
      title="Something went wrong loading this capsule."
      body="Your capsule is saved. Refresh to try again, or head back."
      ctaHref="/dashboard"
      ctaLabel="Back to dashboard"
    />
  );
}
