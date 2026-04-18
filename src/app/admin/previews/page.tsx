import { AdminHeader } from "@/app/admin/AdminHeader";
import { PreviewsClient } from "@/app/admin/previews/PreviewsClient";

export const dynamic = "force-dynamic";

export default function AdminPreviewsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <AdminHeader />
        <PreviewsClient />
      </div>
    </main>
  );
}
