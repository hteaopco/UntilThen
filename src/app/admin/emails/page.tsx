import { AdminHeader } from "@/app/admin/AdminHeader";
import { EmailTestClient } from "@/app/admin/emails/EmailTestClient";

export const dynamic = "force-dynamic";

export default function AdminEmailsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <AdminHeader />
        <EmailTestClient />
      </div>
    </main>
  );
}
