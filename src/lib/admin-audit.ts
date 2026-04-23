import type { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";

import { clientIp } from "@/lib/ratelimit";

export interface AuditTarget {
  type: string;
  id?: string | null;
}

/**
 * Log an admin action for the /admin/audit trail.
 *
 * Safe to fire-and-forget — failures are caught and logged but
 * never surface to the caller. An audit-logging outage should
 * not block the underlying admin action.
 *
 * Call this AFTER the mutation succeeds so we don't log actions
 * that never actually happened.
 */
export async function logAdminAction(
  req: NextRequest,
  action: string,
  target?: AuditTarget,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.adminAuditLog.create({
      data: {
        action,
        targetType: target?.type ?? null,
        targetId: target?.id ?? null,
        metadata: metadata as Prisma.InputJsonValue | undefined,
        ipAddress: clientIp(req.headers),
        userAgent: req.headers.get("user-agent"),
      },
    });
  } catch (err) {
    console.error("[admin-audit] failed to log", action, err);
  }
}
