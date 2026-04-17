"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-4xl mb-4" aria-hidden="true">
          &#128268;
        </div>
        <h1 className="text-2xl font-extrabold text-navy tracking-[-0.5px] mb-2">
          Something went wrong
        </h1>
        <p className="text-sm text-ink-mid leading-[1.6] mb-6">
          We hit an unexpected error. Your data is safe &mdash; try refreshing the page.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-block bg-amber text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
        >
          Try again
        </button>
        <p className="mt-4 text-xs text-ink-light">
          If this keeps happening, email us at hello@untilthenapp.io
        </p>
      </div>
    </main>
  );
}
