import type { ReactNode } from "react";

import { Footer } from "@/components/landing/Footer";
import { TopNav } from "@/components/ui/TopNav";

interface LegalShellProps {
  eyebrow: string;
  title: string;
  // Stamped under the title — last-updated/effective date pair.
  meta?: ReactNode;
  children: ReactNode;
}

/**
 * Page chrome for long-form legal pages (Privacy Policy, Terms of
 * Service). Reuses the .blog-prose typography (17px / 1.8 / DM Sans
 * / navy 800 headings / amber links) so legal copy reads with the
 * same comfort as a blog post.
 */
export async function LegalShell({ eyebrow, title, meta, children }: LegalShellProps) {
  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-cream pb-20 px-6 lg:px-14 pt-10">
        <div className="mx-auto max-w-[720px]">
          <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-amber mb-3.5">
            {eyebrow}
          </p>
          <h1 className="text-[clamp(32px,4.5vw,48px)] font-extrabold tracking-[-1.5px] text-navy leading-[1.08] mb-5">
            {title}
          </h1>
          {meta && (
            <p className="text-sm text-ink-light leading-[1.6]">{meta}</p>
          )}

          <hr className="border-t border-navy/[0.08] my-10" />

          <article className="blog-prose">{children}</article>
        </div>
      </main>
      <Footer />
    </>
  );
}
