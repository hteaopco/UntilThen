import { Footer } from "@/components/landing/Footer";
import { PinGate } from "@/components/dashboard/PinGate";

export default function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Same PIN gate as the dashboard. /account intentionally stays
  // ungated so users who forgot their PIN can reach the email
  // reset link at /account/pin/reset without being locked out.
  return (
    <PinGate>
      {children}
      <Footer />
    </PinGate>
  );
}
