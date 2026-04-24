"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

// Shared error surface for every route-group error.tsx boundary.
// Each boundary passes its own `scope` (analytics + Sentry tag)
// and copy so the reveal flow can stay gentle while the admin
// shell can show a Sentry digest id. Every fallback pipes the
// error to Sentry on mount so captures reach the project even
// when the client-side SDK hasn't initialized (belt-and-suspenders
// for the inline-init path we're iterating on).

export type ErrorFallbackVariant =
  | "shell"
  | "admin"
  | "reveal"
  | "contribute"
  | "account";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  variant?: ErrorFallbackVariant;
  scope: string;
  title?: string;
  body?: string;
  ctaHref?: string;
  ctaLabel?: string;
}

export function ErrorFallback({
  error,
  reset,
  variant = "shell",
  scope,
  title,
  body,
  ctaHref,
  ctaLabel,
}: ErrorFallbackProps) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { area: `route-error.${scope}` },
      extra: { digest: error.digest },
    });
  }, [error, scope]);

  const copy = resolveCopy(variant, title, body);

  // The reveal flow is seen by recipients, so the palette + tone
  // stays soft. The admin shell can afford to be a bit more
  // technical and surfaces the digest id so we can search Sentry.
  if (variant === "reveal") {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
        <div className="max-w-sm text-center">
          <div className="text-3xl mb-4" aria-hidden="true">
            ♡
          </div>
          <h1 className="text-xl font-extrabold text-navy tracking-[-0.3px] mb-2">
            {copy.title}
          </h1>
          <p className="text-[14px] text-ink-mid leading-[1.6] mb-5">
            {copy.body}
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-block bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
      <div className="max-w-md text-center">
        <div className="text-4xl mb-4" aria-hidden="true">
          🔌
        </div>
        <h1 className="text-2xl font-extrabold text-navy tracking-[-0.5px] mb-2">
          {copy.title}
        </h1>
        <p className="text-sm text-ink-mid leading-[1.6] mb-6">{copy.body}</p>
        <div className="flex flex-col sm:flex-row gap-2 items-center justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-block bg-amber text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
          >
            Try again
          </button>
          {ctaHref ? (
            <Link
              href={ctaHref}
              className="text-sm font-semibold text-ink-mid hover:text-navy px-3 py-2"
            >
              {ctaLabel ?? "Go back"}
            </Link>
          ) : null}
        </div>
        {variant === "admin" && error.digest ? (
          <p className="mt-5 text-[11px] text-ink-light font-mono">
            Digest: {error.digest}
          </p>
        ) : null}
        <p className="mt-4 text-xs text-ink-light">
          If this keeps happening, email{" "}
          <a
            href="mailto:hello@untilthenapp.io"
            className="text-amber font-semibold hover:underline"
          >
            hello@untilthenapp.io
          </a>
        </p>
      </div>
    </main>
  );
}

function resolveCopy(
  variant: ErrorFallbackVariant,
  title: string | undefined,
  body: string | undefined,
): { title: string; body: string } {
  if (title && body) return { title, body };
  switch (variant) {
    case "reveal":
      return {
        title: title ?? "We hit a snag opening this.",
        body:
          body ??
          "Please try again. Your capsule is safe — nothing was lost.",
      };
    case "admin":
      return {
        title: title ?? "Admin section crashed",
        body:
          body ??
          "Check the digest below in Sentry for the stack trace, or refresh.",
      };
    case "account":
      return {
        title: title ?? "Something went wrong in your account.",
        body:
          body ??
          "Your data is safe. Refresh to try again — or reach out if this keeps happening.",
      };
    case "contribute":
      return {
        title: title ?? "Couldn't load the invite.",
        body:
          body ??
          "Refresh to try again. If the link doesn't work, ask whoever sent it to resend.",
      };
    default:
      return {
        title: title ?? "Something went wrong",
        body:
          body ??
          "We hit an unexpected error. Your data is safe — try refreshing the page.",
      };
  }
}
