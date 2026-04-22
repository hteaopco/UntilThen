import { NextResponse, type NextRequest } from "next/server";

import {
  SQUARE_LOCATION_ID,
  getSquareClient,
  squareIsConfigured,
} from "@/lib/square";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/square-setup-order-templates
 *
 * One-shot setup endpoint. Creates four Order templates (DRAFT
 * Orders) in Square — one per subscription tier at the right
 * price. Returns the order IDs so the admin can paste them into
 * Railway as SQUARE_ORDER_TEMPLATE_* env vars.
 *
 * Why: the four subscription plan variations in this Square
 * account were configured with `pricing.type: RELATIVE` but
 * never linked to a price source. That makes subscriptions.create
 * fail with "Phases with RELATIVE pricing type must have phases
 * on the subscription" until we pass a phases[] entry with an
 * order_template_id that carries the actual price.
 *
 * Pricing lives inline on the line item (base_price_money) — no
 * need to create catalog Items, since subscription templates can
 * reference ad-hoc line items.
 *
 * Idempotent per template — re-running this endpoint returns the
 * same IDs unless the templates are deleted. Safe to click twice.
 */

type TemplateSpec = {
  label: "MONTHLY_BASE" | "ANNUAL_BASE" | "MONTHLY_ADDON" | "ANNUAL_ADDON";
  lineName: string;
  amountCents: number;
};

const TEMPLATES: TemplateSpec[] = [
  {
    label: "MONTHLY_BASE",
    lineName: "untilThen Time Capsule — Monthly",
    amountCents: 499,
  },
  {
    label: "ANNUAL_BASE",
    lineName: "untilThen Time Capsule — Annual",
    amountCents: 3599,
  },
  {
    label: "MONTHLY_ADDON",
    lineName: "untilThen additional capsule — Monthly",
    amountCents: 99,
  },
  {
    label: "ANNUAL_ADDON",
    lineName: "untilThen additional capsule — Annual",
    amountCents: 600,
  },
];

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!squareIsConfigured()) {
    return NextResponse.json(
      { error: "Square isn't configured." },
      { status: 503 },
    );
  }

  const square = getSquareClient();
  const results: { label: string; orderId: string | null; error: string | null }[] = [];

  for (const spec of TEMPLATES) {
    try {
      // Stable idempotency key keeps re-runs safe. "setup-tpl-"
      // (10) + label (max 13) = 23 chars, well under the 45-char
      // Square limit.
      const resp = await square.orders.create({
        idempotencyKey: `setup-tpl-${spec.label}`,
        order: {
          locationId: SQUARE_LOCATION_ID,
          state: "DRAFT",
          lineItems: [
            {
              name: spec.lineName,
              quantity: "1",
              basePriceMoney: {
                amount: BigInt(spec.amountCents),
                currency: "USD",
              },
            },
          ],
        },
      });
      const id = resp.order?.id ?? null;
      results.push({ label: spec.label, orderId: id, error: null });
    } catch (err) {
      const e = err as { errors?: { code?: string; detail?: string }[]; message?: string };
      const detail =
        e.errors?.[0]?.detail ?? e.errors?.[0]?.code ?? e.message ?? "Unknown Square error.";
      console.error(
        `[admin/square-setup-order-templates] ${spec.label}:`,
        detail,
      );
      results.push({ label: spec.label, orderId: null, error: detail });
    }
  }

  return NextResponse.json({ results });
}
