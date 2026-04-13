import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Sans } from "next/font/google";
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

export const metadata: Metadata = {
  title: "untilThen — Moments from the past, opened in the future",
  description:
    "A time capsule diary for parents. Write moments, record voice notes, and seal memories your child unlocks when they're ready.",
  openGraph: {
    title: "untilThen — Moments from the past, opened in the future",
    description:
      "A time capsule diary for parents. Write moments, record voice notes, and seal memories your child unlocks when they're ready.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "untilThen — Moments from the past, opened in the future",
    description:
      "A time capsule diary for parents. Write moments, record voice notes, and seal memories your child unlocks when they're ready.",
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
      <html lang="en" className={dmSans.variable}>
        <body className="font-sans bg-white text-navy antialiased">
          <PosthogProvider>{children}</PosthogProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
