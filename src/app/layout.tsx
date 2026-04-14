import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Sans } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { PosthogProvider } from "@/components/PosthogProvider";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const viewport: Viewport = {
  colorScheme: "light",
};

const DEFAULT_TITLE =
  "untilThen — Moments from the past, opened in the future.";
const DEFAULT_DESCRIPTION =
  "Write letters, record voice notes, and seal memories in a vault your child opens when they're ready.";

/**
 * Resolve the absolute site origin per request. This is what lets
 * link-preview scrapers (iMessage, WhatsApp, Twitter, LinkedIn,
 * Slack, etc.) fetch the OG image from the same host they just
 * scraped, whether that's a Railway preview URL or the final
 * untilthenapp.io production domain.
 *
 * Precedence:
 * 1. Explicit override via NEXT_PUBLIC_SITE_URL.
 * 2. Incoming request headers (`x-forwarded-*` in front of a
 *    proxy, `host` otherwise).
 * 3. untilthenapp.io fallback.
 */
async function resolveSiteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) return `${proto}://${host}`;
  } catch {
    // headers() throws in contexts where it can't be called;
    // fall through to the production URL.
  }
  return "https://untilthenapp.io";
}

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await resolveSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    openGraph: {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      url: siteUrl,
      siteName: "untilThen",
      type: "website",
      images: [
        {
          url: "/api/og",
          width: 1200,
          height: 630,
          alt: "untilThen — Moments from the past, opened in the future.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      images: ["/api/og"],
    },
    other: {
      "supported-color-schemes": "light",
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#0f1f3d",
          colorText: "#0f1f3d",
          fontFamily: "var(--font-dm-sans), DM Sans, sans-serif",
          borderRadius: "8px",
        },
      }}
    >
      <html lang="en" className={dmSans.variable}>
        <body className="font-sans bg-white text-navy antialiased">
          <PosthogProvider>{children}</PosthogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
