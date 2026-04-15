import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

// Prisma Accelerate over HTTP. The `/edge` import ships without the
// query-engine binary so cold starts stay tiny on Railway and any
// future edge runtimes (the same client works in Node and edge).
//
// `withAccelerate` adds the `cacheStrategy` argument to read queries
// — opt in per call where stale-tolerance is acceptable.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof buildPrisma> | undefined;
};

function buildPrisma() {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  }).$extends(withAccelerate());
}

export const prisma = globalForPrisma.prisma ?? buildPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
