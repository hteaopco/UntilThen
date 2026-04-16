import { CapsuleCreationFlow } from "./CapsuleCreationFlow";

export const metadata = {
  title: "Create a Gift Capsule — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The page itself is public — visitors from the landing page's
// pricing CTA should be able to fill out step 1 before being
// asked to sign up. Step 2 (which hits the API) triggers the
// sign-up hand-off inside CapsuleCreationFlow.
export default function NewCapsulePage() {
  return <CapsuleCreationFlow />;
}
