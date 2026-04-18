import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { setMockUserId } from "./setup";

function jsonReq(
  url: string,
  body: unknown,
  opts: { method?: string; headers?: Record<string, string> } = {},
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: opts.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      ...opts.headers,
    },
    body: JSON.stringify(body),
  });
}

// ────────────────────────────────────────────────────────
// 1. Onboarding
// ────────────────────────────────────────────────────────
describe("POST /api/onboarding", () => {
  beforeEach(() => {
    setMockUserId("user_test123");
    vi.resetModules();
  });

  it("rejects unauthenticated requests", async () => {
    setMockUserId(null);
    const { POST } = await import("@/app/api/onboarding/route");
    const res = await POST(jsonReq("/api/onboarding", { firstName: "Jett" }));
    expect(res.status).toBe(401);
  });

  it("rejects missing firstName", async () => {
    const { POST } = await import("@/app/api/onboarding/route");
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await POST(jsonReq("/api/onboarding", { firstName: "" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/first name/i);
  });

  it("creates a user for memory_capsule path", async () => {
    const { POST } = await import("@/app/api/onboarding/route");
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      clerkId: "user_test123",
      firstName: "Jett",
      lastName: "",
      displayName: null,
      role: "PARENT",
      userType: "ORGANISER",
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.notificationPreferences.create).mockResolvedValue({} as never);

    const res = await POST(
      jsonReq("/api/onboarding", {
        firstName: "Jett",
        path: "memory_capsule",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.flow).toBe("memory_capsule");
  });

  it("creates user + child + vault for child_vault path", async () => {
    const { POST } = await import("@/app/api/onboarding/route");
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      clerkId: "user_test123",
      firstName: "Jett",
      lastName: "Smith",
      displayName: null,
      role: "PARENT",
      userType: "PARENT",
      createdAt: new Date(),
    } as never);
    vi.mocked(prisma.child.create).mockResolvedValue({
      id: "c1",
      firstName: "Luna",
      lastName: "Smith",
      parentId: "u1",
    } as never);
    vi.mocked(prisma.vault.create).mockResolvedValue({ id: "v1" } as never);
    vi.mocked(prisma.notificationPreferences.create).mockResolvedValue({} as never);

    const res = await POST(
      jsonReq("/api/onboarding", {
        firstName: "Jett",
        lastName: "Smith",
        childFirstName: "Luna",
        childLastName: "Smith",
        childDateOfBirth: "2020-06-15",
        path: "child_vault",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.flow).toBe("child_vault");
    expect(prisma.child.create).toHaveBeenCalled();
    expect(prisma.vault.create).toHaveBeenCalled();
  });

  it("rejects future child DOB", async () => {
    const { POST } = await import("@/app/api/onboarding/route");
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await POST(
      jsonReq("/api/onboarding", {
        firstName: "Jett",
        childFirstName: "Luna",
        childLastName: "Smith",
        childDateOfBirth: "2099-01-01",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/future/i);
  });
});

// ────────────────────────────────────────────────────────
// 2. Vault creation (POST /api/account/children)
// ────────────────────────────────────────────────────────
describe("POST /api/account/children", () => {
  beforeEach(() => {
    setMockUserId("user_test123");
    vi.resetModules();
  });

  it("rejects unauthenticated requests", async () => {
    setMockUserId(null);
    const { POST } = await import("@/app/api/account/children/route");
    const res = await POST(
      jsonReq("/api/account/children", { firstName: "Luna" }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects missing child name", async () => {
    const { POST } = await import("@/app/api/account/children/route");
    const res = await POST(
      jsonReq("/api/account/children", { firstName: "" }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/name/i);
  });

  it("creates child + vault", async () => {
    const { POST } = await import("@/app/api/account/children/route");
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u1" } as never);

    const mockTx = {
      child: { create: vi.fn().mockResolvedValue({ id: "c1" }) },
      vault: { create: vi.fn().mockResolvedValue({ id: "v1" }) },
    };
    (prisma as unknown as Record<string, unknown>).$transaction = vi
      .fn()
      .mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx));

    const res = await POST(
      jsonReq("/api/account/children", {
        firstName: "Luna",
        lastName: "Smith",
        dateOfBirth: "2020-06-15",
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(mockTx.child.create).toHaveBeenCalled();
    expect(mockTx.vault.create).toHaveBeenCalled();
  });
});

// ────────────────────────────────────────────────────────
// 3. Gift Capsule creation (POST /api/capsules)
// ────────────────────────────────────────────────────────
describe("POST /api/capsules", () => {
  beforeEach(() => {
    setMockUserId("user_test123");
    vi.resetModules();
  });

  it("rejects unauthenticated requests", async () => {
    setMockUserId(null);
    const { POST } = await import("@/app/api/capsules/route");
    const res = await POST(
      jsonReq("/api/capsules", { title: "Birthday" }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects missing title", async () => {
    const { POST } = await import("@/app/api/capsules/route");
    const res = await POST(
      jsonReq("/api/capsules", {
        title: "",
        recipientName: "Luna",
        revealDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/title/i);
  });

  it("rejects past reveal date", async () => {
    const { POST } = await import("@/app/api/capsules/route");
    const res = await POST(
      jsonReq("/api/capsules", {
        title: "Birthday Wishes",
        recipientName: "Luna",
        revealDate: "2020-01-01",
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/future/i);
  });

  it("creates capsule with valid data", async () => {
    const { POST } = await import("@/app/api/capsules/route");
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "u1",
      userType: "PARENT",
    } as never);
    vi.mocked(prisma.memoryCapsule.create).mockResolvedValue({
      id: "mc1",
      accessToken: "tok_abc",
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const res = await POST(
      jsonReq("/api/capsules", {
        title: "Happy Birthday Luna",
        recipientName: "Luna Smith",
        occasionType: "BIRTHDAY",
        revealDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.id).toBe("mc1");
  });
});

// ────────────────────────────────────────────────────────
// 4. Contributor token validation (GET /api/invites/[token])
// ────────────────────────────────────────────────────────
describe("GET /api/invites/[token]", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 404 for unknown token", async () => {
    const { GET } = await import("@/app/api/invites/[token]/route");
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.contributor.findUnique).mockResolvedValue(null);

    const req = new NextRequest(
      new URL("/api/invites/bad-token", "http://localhost:3000"),
    );
    const res = await GET(req, {
      params: Promise.resolve({ token: "bad-token" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns contributor data for valid token", async () => {
    const { GET } = await import("@/app/api/invites/[token]/route");
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.contributor.findUnique).mockResolvedValue({
      id: "cont1",
      email: "friend@example.com",
      name: "Best Friend",
      role: "FAMILY",
      status: "PENDING",
      inviteToken: "valid-token",
      vault: {
        id: "v1",
        revealDate: new Date("2030-01-01"),
        child: {
          firstName: "Luna",
          parent: { firstName: "Jett", displayName: null },
        },
      },
    } as never);

    const req = new NextRequest(
      new URL("/api/invites/valid-token", "http://localhost:3000"),
    );
    const res = await GET(req, {
      params: Promise.resolve({ token: "valid-token" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Best Friend");
    expect(body.childFirstName).toBe("Luna");
  });
});

// ────────────────────────────────────────────────────────
// 5. Cron endpoint auth (POST /api/cron/reveal)
// ────────────────────────────────────────────────────────
describe("POST /api/cron/reveal", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rejects requests with no CRON_SECRET header", async () => {
    const { POST } = await import("@/app/api/cron/reveal/route");
    const req = new NextRequest(
      new URL("/api/cron/reveal", "http://localhost:3000"),
      { method: "POST" },
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("rejects requests with wrong CRON_SECRET", async () => {
    const { POST } = await import("@/app/api/cron/reveal/route");
    const req = new NextRequest(
      new URL("/api/cron/reveal", "http://localhost:3000"),
      {
        method: "POST",
        headers: { authorization: "Bearer wrong-secret" },
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("accepts correct CRON_SECRET and processes capsules", async () => {
    const { POST } = await import("@/app/api/cron/reveal/route");
    const { prisma } = await import("@/lib/prisma");
    vi.mocked(prisma.memoryCapsule.findMany).mockResolvedValue([]);

    const req = new NextRequest(
      new URL("/api/cron/reveal", "http://localhost:3000"),
      {
        method: "POST",
        headers: { authorization: "Bearer test-cron-secret" },
      },
    );
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(0);
    expect(body.sent).toBe(0);
  });
});
