import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { PosthogProvider } from "@/components/PosthogProvider";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-dm-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-playfair",
  display: "swap",
});

export const viewport: Viewport = {
  colorScheme: "light",
};

// Canonical origin for meta tags (metadataBase, og:image, etc.).
// The production domain is live at untilthenapp.io. NEXT_PUBLIC_SITE_URL
// can still override for preview deploys.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://untilthenapp.io";

const OG_IMAGE_URL = `${SITE_URL}/og-image.jpg`;

const DEFAULT_TITLE =
  "untilThen — Moments from the past, opened in the future.";
const DEFAULT_DESCRIPTION =
  "Write letters, record voice notes, and seal memories in a vault your child opens when they're ready.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: "untilThen",
    type: "website",
    images: [
      {
        url: OG_IMAGE_URL,
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
    images: [OG_IMAGE_URL],
  },
  other: {
    "supported-color-schemes": "light",
  },
};

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
      <html lang="en" className={`${dmSans.variable} ${playfair.variable}`}>
        <body className="font-sans bg-white text-navy antialiased">
          <PosthogProvider>{children}</PosthogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
