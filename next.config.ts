import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,

  // Production hardening — applied to every response. Clerk has
  // its own CSP requirements which it manages via its own
  // middleware; these headers are deliberately conservative to
  // avoid breaking sign-in / sign-up flows.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
};

// Sentry's webpack plugin is opt-in for source-map upload — only
// active when SENTRY_AUTH_TOKEN is present (set in CI / Railway).
// Without it, the plugin still wires the SDK but skips uploads,
// so local builds don't fail when the token is unset.
export default withSentryConfig(nextConfig, {
  org: "untilthenapp",
  project: "javascript-nextjs",

  // Quiet the build log — Sentry's plugin is chatty by default.
  silent: !process.env.CI,

  // Tunnel route lets the client-side SDK bypass ad-blockers
  // that otherwise block /sentry/* requests.
  tunnelRoute: "/monitoring",

  // Strip source maps from the public bundle after they've
  // been uploaded so error stacks stay readable in Sentry but
  // not in the browser.
  sourcemaps: { deleteSourcemapsAfterUpload: true },

  // We're on Railway, not Vercel — disable the cron-monitor
  // wiring that only makes sense on Vercel deployments.
  automaticVercelMonitors: false,

  // Tree-shake Sentry's debug logger out of the production
  // bundle for a smaller payload.
  disableLogger: true,
});
