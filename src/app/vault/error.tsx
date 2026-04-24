"use client";

import { ErrorFallback } from "@/components/ui/ErrorFallback";

export default function VaultError({
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
      scope="vault"
      title="Something went wrong opening this vault."
      body="Your memories are safe. Try again, or head back to your dashboard."
      ctaHref="/dashboard"
      ctaLabel="Back to dashboard"
    />
  );
}
