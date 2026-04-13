import { clerkClient } from "@clerk/nextjs/server";

import { AdminHeader } from "@/app/admin/AdminHeader";
import { UsersClient, type UserRow } from "@/app/admin/users/UsersClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LoadResult =
  | { ok: true; users: UserRow[] }
  | { ok: false; error: string; hint?: string };

async function loadUsers(): Promise<LoadResult> {
  if (!process.env.DATABASE_URL) {
    return {
      ok: false,
      error: "DATABASE_URL is not set.",
      hint: "Add Postgres in Railway and expose DATABASE_URL.",
    };
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const users = await prisma.user.findMany({
      include: {
        children: {
          include: { vault: true },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch Clerk emails / phone numbers in one batch so we can show
    // them alongside the DB rows. Failure here shouldn't break the
    // page — just leaves those columns blank.
    const clerkLookup = new Map<
      string,
      { email: string | null; phone: string | null }
    >();
    if (users.length > 0) {
      try {
        const clerk = await clerkClient();
        const resp = await clerk.users.getUserList({
          userId: users.map((u) => u.clerkId),
          limit: 500,
        });
        const list = Array.isArray(resp)
          ? resp
          : (resp as { data?: unknown[] }).data ?? [];
        for (const cu of list as Array<{
          id: string;
          emailAddresses?: Array<{ emailAddress: string }>;
          phoneNumbers?: Array<{ phoneNumber: string }>;
        }>) {
          clerkLookup.set(cu.id, {
            email: cu.emailAddresses?.[0]?.emailAddress ?? null,
            phone: cu.phoneNumbers?.[0]?.phoneNumber ?? null,
          });
        }
      } catch (err) {
        console.error("[admin/users] clerk fetch error:", err);
      }
    }

    const rows: UserRow[] = users.map((u) => ({
      id: u.id,
      clerkId: u.clerkId,
      firstName: u.firstName,
      lastName: u.lastName,
      createdAt: u.createdAt.toISOString(),
      email: clerkLookup.get(u.clerkId)?.email ?? null,
      phone: clerkLookup.get(u.clerkId)?.phone ?? null,
      children: u.children.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        dateOfBirth: c.dateOfBirth ? c.dateOfBirth.toISOString() : null,
        vault: c.vault
          ? {
              id: c.vault.id,
              revealDate: c.vault.revealDate
                ? c.vault.revealDate.toISOString()
                : null,
            }
          : null,
      })),
    }));

    return { ok: true, users: rows };
  } catch (err) {
    const message = (err as Error).message;
    return {
      ok: false,
      error: message,
      hint: message.toLowerCase().includes("does not exist")
        ? "Run `prisma migrate deploy` so the auth tables exist."
        : undefined,
    };
  }
}

export default async function AdminUsersPage() {
  const data = await loadUsers();

  if (!data.ok) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <AdminHeader />
          <div className="rounded-lg border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-bold text-red-700 mb-1">
              Couldn&rsquo;t load users
            </p>
            <p className="text-sm text-red-700/90">{data.error}</p>
            {data.hint && (
              <p className="mt-2 text-xs text-red-700/80 italic">{data.hint}</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <AdminHeader />
        <UsersClient initialUsers={data.users} />
      </div>
    </main>
  );
}
