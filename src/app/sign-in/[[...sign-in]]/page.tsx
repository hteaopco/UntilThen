import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

import { LogoSvg } from "@/components/ui/LogoSvg";

export const metadata = {
  title: "Sign in — untilThen",
};

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 py-12">
      <Link
        href="/"
        aria-label="untilThen home"
        className="mb-10 inline-flex items-center"
      >
        <LogoSvg variant="dark" width={140} height={28} />
      </Link>

      <SignIn
        appearance={{
          elements: {
            formButtonPrimary: {
              background: "#0f1f3d",
              fontWeight: 700,
              "&:hover": { background: "#1e3560" },
            },
            card: {
              boxShadow: "0 4px 32px rgba(15,31,61,0.08)",
              border: "1px solid rgba(15,31,61,0.08)",
            },
            footer: {
              background: "#ffffff",
            },
          },
        }}
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
        fallbackRedirectUrl="/dashboard"
      />

      <Link
        href="/help/recovery"
        className="mt-6 text-[13px] text-ink-mid hover:text-navy"
      >
        Lost access to your email? →
      </Link>
    </main>
  );
}
