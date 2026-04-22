import { NextResponse, type NextRequest } from "next/server";

import { SQUARE_PLAN_IDS } from "@/lib/square";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/square-plan-variations
 *
 * For each of our four configured Square subscription plans, hit
 * Square's Catalog retrieve endpoint to pull the plan variation
 * IDs — which is what subscriptions.create actually needs (the
 * plan id gets rejected with "does not have type
 * SUBSCRIPTION_PLAN_VARIATION"). The Dashboard UI surfaces only
 * the plan id, so admins need this endpoint to see which variation
 * id to set for each SQUARE_PLAN_* env var.
 *
 * Response shape (one row per plan):
 *   {
 *     label: "MONTHLY_BASE",
 *     planId: "6D7...",
 *     configuredVariationId: "abc...",      // current env var value
 *     variations: [
 *       { id: "xyz...", name: "Monthly", cadence: "MONTHLY" }
 *     ],
 *     configuredMatches: boolean
 *   }
 *
 * Admin-cookie gated. SQUARE_ACCESS_TOKEN required on the server.
 */

type CatalogObject = {
  type?: string;
  id?: string;
  subscription_plan_data?: {
    name?: string;
    subscription_plan_variations?: CatalogObject[];
  };
  subscription_plan_variation_data?: {
    name?: string;
    phases?: { cadence?: string }[];
  };
};

type RetrieveResponse = {
  object?: CatalogObject;
  related_objects?: CatalogObject[];
  errors?: { code?: string; detail?: string }[];
};

type Row = {
  label: string;
  planId: string;
  configuredVariationId: string;
  variations: { id: string; name: string; cadence: string }[];
  configuredMatches: boolean;
  error: string | null;
};

const PLANS = [
  { label: "MONTHLY_BASE" as const, planId: SQUARE_PLAN_IDS.MONTHLY_BASE },
  { label: "ANNUAL_BASE" as const, planId: SQUARE_PLAN_IDS.ANNUAL_BASE },
  { label: "MONTHLY_ADDON" as const, planId: SQUARE_PLAN_IDS.MONTHLY_ADDON },
  { label: "ANNUAL_ADDON" as const, planId: SQUARE_PLAN_IDS.ANNUAL_ADDON },
];

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "SQUARE_ACCESS_TOKEN is not set." },
      { status: 503 },
    );
  }

  const rows: Row[] = [];
  for (const plan of PLANS) {
    // Even though SQUARE_PLAN_IDS.<LABEL> is what both this
    // endpoint and subscribe/route.ts read, read the env var
    // itself so "configured" means the same thing the admin sees
    // in Railway — not a fallback default baked into code.
    const configuredVariationId = process.env[`SQUARE_PLAN_${plan.label}`] ?? "";
    const row: Row = {
      label: plan.label,
      planId: plan.planId,
      configuredVariationId,
      variations: [],
      configuredMatches: false,
      error: null,
    };

    try {
      const url = `https://connect.squareup.com/v2/catalog/object/${plan.planId}?include_related_objects=true`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Square-Version": "2025-04-16",
        },
        // Force a fresh pull — the admin clicks Refresh to see
        // current state, stale caches defeat the purpose.
        cache: "no-store",
      });
      const body = (await res.json()) as RetrieveResponse;
      if (!res.ok || body.errors?.length) {
        row.error =
          body.errors?.[0]?.detail ?? `Square returned ${res.status}.`;
      } else {
        // Square nests variations in two possible places depending
        // on account / API version:
        //   1. object.subscription_plan_data.subscription_plan_variations
        //      (newer accounts — variations are a child array)
        //   2. related_objects (legacy — variations sibling to plan)
        // Union both, de-dupe by id.
        const nested =
          body.object?.subscription_plan_data?.subscription_plan_variations ??
          [];
        const related = (body.related_objects ?? []).filter(
          (o) => o.type === "SUBSCRIPTION_PLAN_VARIATION",
        );
        const seen = new Set<string>();
        const variations = [...nested, ...related]
          .filter((v) => v.id && !seen.has(v.id) && seen.add(v.id))
          .map((v) => ({
            id: v.id ?? "",
            name: v.subscription_plan_variation_data?.name ?? "(unnamed)",
            cadence:
              v.subscription_plan_variation_data?.phases?.[0]?.cadence ?? "?",
          }));
        row.variations = variations;
        row.configuredMatches = variations.some(
          (v) => v.id && v.id === configuredVariationId,
        );
      }
    } catch (err) {
      row.error = (err as Error).message;
    }

    rows.push(row);
  }

  return NextResponse.json({ rows });
}
