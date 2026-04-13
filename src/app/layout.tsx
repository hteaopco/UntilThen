import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

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
  title: "untilThen — Letters from the past, opened in the future",
  description:
    "A time capsule diary for parents. Write letters, record voice notes, and seal memories your child unlocks when they're ready.",
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
    <html lang="en" className={dmSans.variable}>
      <body className="font-sans bg-white text-navy antialiased">{children}</body>
    </html>
  );
}
