import type { Metadata } from "next";

import { CapsuleRevealClient } from "./CapsuleRevealClient";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://untilthenapp.io";

export const metadata: Metadata = {
  title: "Your Gift Capsule — untilThen",
  description: "Someone left you something special on untilThen.",
  openGraph: {
    type: "website",
    title: "You have a message waiting for you.",
    description: "Someone left you something special on untilThen.",
    siteName: "untilThen",
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "You have a message waiting for you.",
    description: "Someone left you something special on untilThen.",
    images: [`${SITE_URL}/og-image.png`],
  },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CapsuleOpenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; preview?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  return (
    <CapsuleRevealClient
      capsuleId={id}
      token={typeof sp.t === "string" ? sp.t : ""}
      preview={sp.preview === "1"}
    />
  );
}
