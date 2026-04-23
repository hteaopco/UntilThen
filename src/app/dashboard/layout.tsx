import { PinGate } from "@/components/dashboard/PinGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // PinGate is opt-in — if the signed-in user hasn't enabled a
  // vault PIN, the gate renders children verbatim. Otherwise
  // shows the lock screen until they unlock for this session.
  return <PinGate>{children}</PinGate>;
}
