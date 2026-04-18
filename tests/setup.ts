import { vi } from "vitest";

// Stub environment variables for tests
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.CRON_SECRET = "test-cron-secret";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
process.env.ADMIN_PASSWORD = "test-admin-pw";

// Mock Clerk auth — returns a configurable userId
let mockUserId: string | null = "user_test123";

export function setMockUserId(id: string | null) {
  mockUserId = id;
}

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => ({ userId: mockUserId }),
  clerkClient: async () => ({
    users: {
      getUser: async () => ({
        firstName: "Test",
        primaryEmailAddress: { emailAddress: "test@example.com" },
        emailAddresses: [{ emailAddress: "test@example.com" }],
      }),
      deleteUser: async () => ({}),
    },
  }),
}));

// Mock Prisma — individual tests override as needed
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    child: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    vault: {
      create: vi.fn(),
    },
    memoryCapsule: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    contributor: {
      findUnique: vi.fn(),
    },
    notificationPreferences: {
      create: vi.fn(),
    },
    capsuleInvite: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock PostHog — no-op
vi.mock("@/lib/posthog-server", () => ({
  captureServerEvent: vi.fn(),
  identifyServerUser: vi.fn(),
}));

// Mock emails — no-op
vi.mock("@/lib/emails", () => ({
  sendCapsuleDraftSaved: vi.fn(),
  sendInviteAccepted: vi.fn(),
}));
vi.mock("@/lib/capsule-emails", () => ({
  sendCapsuleDraftSaved: vi.fn(),
  sendCapsuleRevealDay: vi.fn(),
  sendCapsuleInvite: vi.fn(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
