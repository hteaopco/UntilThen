"use client";

import { ErrorFallback } from "@/components/ui/ErrorFallback";

export default function AdminError({
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
      variant="admin"
      scope="admin"
      ctaHref="/admin"
      ctaLabel="Back to admin home"
    />
  );
}
