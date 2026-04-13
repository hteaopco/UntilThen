import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UntilThen",
  description: "Count the moments that matter.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
