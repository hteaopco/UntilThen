import { AdminHeader } from "@/app/admin/AdminHeader";

import { OrgsClient } from "./OrgsClient";

export const metadata = {
  title: "Organizations — untilThen Admin",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Phase 1 enterprise org management is admin-driven: sales
 * manually creates an Organization row + assigns an OWNER user
 * (must already have an untilThen account). The OWNER then
 * manages roster + invites from /enterprise.
 */
export default function AdminOrgsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <AdminHeader />
        <OrgsClient />
      </div>
    </main>
  );
}
