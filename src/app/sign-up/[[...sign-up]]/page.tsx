import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

import { Footer } from "@/components/landing/Footer";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { SmsConsentNote } from "@/components/ui/SmsConsentNote";

export const metadata = {
  title: "Get started — untilThen",
};

/**
 * Honour ?redirect_url=... so flows that bounce a user through
 * sign-up (capsule creation, reveal claim, etc.) can land them
 * back on their original page once they're authenticated.
 *
 * After Clerk completes, every new user still has to stop at
 * /onboarding to capture their name + create the User row, so the
 * forwarded redirect_url is propagated as a query param on the
 * onboarding hop. OnboardingForm reads it and pushes there after
 * the User row is created.
 */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const sp = await searchParams;
  const redirectUrl =
    typeof sp.redirect_url === "string" && sp.redirect_url.startsWith("/")
      ? sp.redirect_url
      : null;
  const onboardingTarget = redirectUrl
    ? `/onboarding?redirect_url=${encodeURIComponent(redirectUrl)}`
    : "/onboarding";
  const signInUrl = redirectUrl
    ? `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`
    : "/sign-in";

  return (
    <>
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
          signInUrl={signInUrl}
          forceRedirectUrl={onboardingTarget}
          fallbackRedirectUrl={onboardingTarget}
        />

        {/* SMS consent disclosure — visible at the consent point
            so Twilio reviewers can verify the opt-in flow without
            signing in. Sign-up may collect a phone number for
            verification + transactional notifications; the note
            covers frequency, rates, STOP/HELP, and links to the
            policies. */}
        <div className="mt-6 max-w-[420px] w-full px-1">
          <SmsConsentNote />
        </div>
      </main>
      <Footer />
    </>
  );
}
