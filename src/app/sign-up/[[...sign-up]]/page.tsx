import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

import { LogoSvg } from "@/components/ui/LogoSvg";

export const metadata = {
  title: "Get started — untilThen",
};

export default function SignUpPage() {
  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 py-12">
      <Link
        href="/"
        aria-label="untilThen home"
        className="mb-10 inline-flex items-center"
      >
        <LogoSvg variant="dark" width={140} height={28} />
      </Link>

      <SignUp
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
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        forceRedirectUrl="/onboarding"
        fallbackRedirectUrl="/onboarding"
      />
    </main>
  );
}
