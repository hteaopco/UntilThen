import { Footer } from "@/components/landing/Footer";
import { PinGate } from "@/components/dashboard/PinGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // PinGate is opt-in — if the signed-in user hasn't enabled a
  // vault PIN, the gate renders children verbatim. Otherwise
  // shows the lock screen until they unlock for this session.
  // Footer sits below the dashboard content so the Privacy /
  // Terms / Help row is reachable on every signed-in page;
  // when locked the PinGate's full-screen takeover hides it.
  return (
    <PinGate>
      {children}
      <Footer />
    </PinGate>
  );
}
