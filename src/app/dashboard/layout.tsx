import { VaultPinScreen } from "@/components/dashboard/VaultPinScreen";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <VaultPinScreen />
      {children}
    </>
  );
}
