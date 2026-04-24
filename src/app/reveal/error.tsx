"use client";

import { ErrorFallback } from "@/components/ui/ErrorFallback";

// Recipient-facing — keep it gentle. No admin-style digest or
// "back to dashboard" link (recipients don't have accounts).
export default function RevealError({
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
      variant="reveal"
      scope="reveal"
    />
  );
}
