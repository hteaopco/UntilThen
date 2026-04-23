import Link from "next/link";

import { LogoSvg } from "@/components/ui/LogoSvg";
import { RecoveryForm } from "@/app/help/recovery/RecoveryForm";

export const metadata = {
  title: "Account recovery — untilThen",
  description: "Trouble signing in? Reset your password or request help.",
};

export default function RecoveryPage() {
  return (
    <main className="min-h-screen bg-cream px-6 py-12">
      <div className="mx-auto max-w-[560px]">
        <Link
          href="/"
          aria-label="untilThen home"
          className="mb-10 inline-flex items-center"
        >
          <LogoSvg variant="dark" width={140} height={28} />
        </Link>

        <h1 className="text-[28px] font-extrabold text-navy tracking-[-0.5px] mb-3">
          Trouble signing in?
        </h1>
        <p className="text-[15px] text-ink-mid leading-[1.6] mb-8">
          Pick the option that matches what&rsquo;s happening. Most issues are
          solved by the first two.
        </p>

        <Section
          title="I forgot my password"
          body="Use the &quot;Forgot password?&quot; link on the sign-in page. You&rsquo;ll get a reset email within a minute — check spam if you don&rsquo;t see it."
          cta={{ href: "/sign-in", label: "Go to sign-in" }}
        />

        <Section
          title="I'm locked out"
          body="Too many failed attempts temporarily lock the account for 15 minutes. Wait and try again, or reset your password using the link above."
          cta={{ href: "/sign-in", label: "Go to sign-in" }}
        />

        <div className="mt-8 rounded-2xl border border-navy/10 bg-white p-6 shadow-[0_4px_32px_rgba(15,31,61,0.04)]">
          <h2 className="text-[18px] font-extrabold text-navy tracking-[-0.3px] mb-2">
            I lost access to my email
          </h2>
          <p className="text-[14px] text-ink-mid leading-[1.6] mb-5">
            If the email address on your account is no longer reachable, we need
            to verify who you are before switching it. Fill out the form below
            and we&rsquo;ll get back to you within 1&ndash;2 business days.
          </p>
          <RecoveryForm />
        </div>

        <p className="text-center text-[13px] text-ink-light mt-10">
          Still stuck?{" "}
          <a
            href="mailto:hello@untilthenapp.io"
            className="text-amber font-bold hover:underline"
          >
            hello@untilthenapp.io
          </a>
        </p>
      </div>
    </main>
  );
}

function Section({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="mb-4 rounded-2xl border border-navy/10 bg-white p-6 shadow-[0_4px_32px_rgba(15,31,61,0.04)]">
      <h2 className="text-[18px] font-extrabold text-navy tracking-[-0.3px] mb-2">
        {title}
      </h2>
      <p className="text-[14px] text-ink-mid leading-[1.6] mb-4">{body}</p>
      <Link
        href={cta.href}
        className="inline-flex items-center gap-1 text-[14px] text-amber font-bold hover:text-amber-dark"
      >
        {cta.label} <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
