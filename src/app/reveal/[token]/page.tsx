import type { Metadata } from "next";

import { RevealClient } from "./RevealClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://untilthenapp.io";

export const metadata: Metadata = {
  title: "Your capsule — untilThen",
  description: "Someone left you something to open today.",
  openGraph: {
    type: "website",
    title: "Someone left you something to open today.",
    description:
      "A capsule of letters, photos, and voice notes from people who love you.",
    siteName: "untilThen",
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Someone left you something to open today.",
    images: [`${SITE_URL}/og-image.png`],
  },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Public recipient reveal — token-only URL, no auth.
 *
 *   /reveal/{accessToken}
 *
 * The full state machine (Entry → Story Cards → Transition →
 * Gallery → Replay) lives in the client component so the four
 * phases share one in-memory data load. The server side here
 * just sets metadata + renders the shell.
 */
export default async function RevealPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <RevealClient token={token} />;
}
