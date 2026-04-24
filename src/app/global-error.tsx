"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Last-resort boundary. Fires only when the root layout itself
// crashes (rare — would mean a provider like Clerk or Sentry
// threw during render). Must render its own <html> and <body>
// because the normal shell is gone at this point.
//
// Keep this file dependency-free (no imported shared components)
// so a bug in a shared module can't also break the fallback.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { area: "route-error.root" },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          fontFamily:
            "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "#fdf8ef",
          color: "#0f1f3d",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              margin: "0 0 8px",
              letterSpacing: "-0.5px",
            }}
          >
            Something went very wrong
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#4a5568",
              lineHeight: 1.6,
              margin: "0 0 24px",
            }}
          >
            The app couldn&rsquo;t load. Your data is safe — please refresh
            the page. If this keeps happening, email hello@untilthenapp.io.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#c47a3a",
              color: "white",
              border: "none",
              fontWeight: 700,
              fontSize: 14,
              padding: "12px 24px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p
              style={{
                marginTop: 20,
                fontSize: 11,
                color: "#8896a5",
                fontFamily: "monospace",
              }}
            >
              Digest: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
