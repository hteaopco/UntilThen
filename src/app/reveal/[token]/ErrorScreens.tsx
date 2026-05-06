"use client";

import { Lock } from "lucide-react";

function toFirstNames(name: string): string {
  if (!name.includes("&")) return name.trim().split(" ")[0] ?? name;
  return name.split("&").map((p) => p.trim().split(" ")[0] ?? p.trim()).join(" & ");
}

import { LogoSvg } from "@/components/ui/LogoSvg";

/**
 * Loading shim — shown while the initial /api/reveal/{token}
 * fetch is in flight. Kept deliberately minimal (no spinner, no
 * progress bar) so the recipient's first frame isn't a busy
 * loading state. The fetch is fast enough that this rarely
 * lingers more than a beat.
 */
export function LoadingScreen() {
  return (
    <main className="min-h-screen w-full bg-cream" aria-hidden="true" />
  );
}

/**
 * Catch-all error screen for: invalid token, capsule deleted,
 * link expired, network failure on the data fetch.
 */
export function ErrorScreen({ message }: { message: string }) {
  return (
    <main
      className="min-h-screen w-full bg-cream flex flex-col items-center justify-center px-6 text-center"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 24px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
      }}
    >
      <div className="mb-8">
        <LogoSvg variant="dark" width={140} height={28} />
      </div>
      <h1 className="font-serif text-navy text-[26px] leading-[1.2] tracking-[-0.3px] max-w-[20ch]">
        {message}
      </h1>
      <p className="mt-4 text-[14px] text-ink-mid leading-[1.6] max-w-[28ch]">
        If you got this link from someone you trust, ask them to send a
        fresh one — the magic links expire after a window.
      </p>
    </main>
  );
}

/**
 * "This capsule opens on {date}" — recipient hit the link before
 * the reveal date. Same layout as the entry screen but with a
 * sealed lock icon and no Begin CTA.
 */
export function NotYetOpenScreen({
  recipientName,
  revealDate,
}: {
  recipientName: string;
  revealDate: string;
}) {
  const dateLabel = new Date(revealDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <main
      className="min-h-screen w-full bg-cream flex flex-col items-center justify-center px-6 text-center"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 24px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
      }}
    >
      <span className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-tint text-amber">
        <Lock size={28} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h1 className="font-serif text-navy text-[28px] leading-[1.2] tracking-[-0.3px] max-w-[18ch]">
        {recipientName ? `${toFirstNames(recipientName)}, this` : "This"} capsule opens on
      </h1>
      <p className="mt-3 font-sans text-amber font-semibold text-[13px] tracking-[0.24em] uppercase">
        {dateLabel}
      </p>
      <p className="mt-6 text-[14px] text-ink-mid leading-[1.6] max-w-[28ch]">
        Come back any time after that — your link will still work.
      </p>
    </main>
  );
}
