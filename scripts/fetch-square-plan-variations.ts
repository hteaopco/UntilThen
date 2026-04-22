/**
 * One-shot script: fetches plan variation IDs from Square for
 * each of our four configured subscription plans.
 *
 * Usage:
 *   SQUARE_ACCESS_TOKEN=EAAA... npx tsx scripts/fetch-square-plan-variations.ts
 *
 * Or on Railway (where SQUARE_ACCESS_TOKEN is already set):
 *   railway run npx tsx scripts/fetch-square-plan-variations.ts
 *
 * Writes a block of env vars to stdout that can be pasted into
 * Railway's env var editor to point SQUARE_PLAN_* at the correct
 * plan variation IDs (Square's subscriptions.create endpoint
 * rejects plan IDs — it needs plan *variation* IDs).
 */

const PLANS = [
  { label: "SQUARE_PLAN_MONTHLY_BASE", planId: "6D7TZDMBKPQSX7FUD46O5D2W" },
  { label: "SQUARE_PLAN_ANNUAL_BASE", planId: "7SECOFJCZ6CUVPJIWG6UR4F3" },
  { label: "SQUARE_PLAN_MONTHLY_ADDON", planId: "532XDRT3DCHHH2HSFBY2S6KM" },
  { label: "SQUARE_PLAN_ANNUAL_ADDON", planId: "UOWOEMVRR7UZPYIDNKCHQ4BE" },
] as const;

type CatalogObject = {
  type?: string;
  id?: string;
  subscription_plan_variation_data?: {
    name?: string;
    phases?: { cadence?: string; pricing?: unknown }[];
  };
};

type RetrieveResponse = {
  object?: CatalogObject;
  related_objects?: CatalogObject[];
  errors?: { code?: string; detail?: string }[];
};

async function main(): Promise<void> {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    console.error(
      "SQUARE_ACCESS_TOKEN is not set. Run with `railway run` or prefix the command with the token.",
    );
    process.exit(1);
  }

  const lines: string[] = [];
  let hadError = false;

  for (const plan of PLANS) {
    const url = `https://connect.squareup.com/v2/catalog/object/${plan.planId}?include_related_objects=true`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Square-Version": "2025-04-16",
      },
    });
    const body = (await res.json()) as RetrieveResponse;
    if (!res.ok || body.errors) {
      console.error(
        `\n[${plan.label}] failed — ${res.status}`,
        JSON.stringify(body.errors ?? body, null, 2),
      );
      hadError = true;
      continue;
    }

    const variations = (body.related_objects ?? []).filter(
      (o) => o.type === "SUBSCRIPTION_PLAN_VARIATION",
    );
    if (variations.length === 0) {
      console.error(
        `\n[${plan.label}] no SUBSCRIPTION_PLAN_VARIATION objects in related_objects — plan ${plan.planId} may be empty.`,
      );
      hadError = true;
      continue;
    }

    console.log(`\n[${plan.label}] plan ${plan.planId}`);
    for (const v of variations) {
      const name = v.subscription_plan_variation_data?.name ?? "(unnamed)";
      const cadence =
        v.subscription_plan_variation_data?.phases?.[0]?.cadence ?? "?";
      console.log(`  variation id: ${v.id}  — ${name} (${cadence})`);
    }

    // Take the first variation — most plans have exactly one.
    // If a plan has multiple, the log above shows them all so
    // the operator can pick the right one manually.
    const pick = variations[0];
    if (pick?.id) {
      lines.push(`${plan.label}=${pick.id}`);
    }
  }

  if (lines.length > 0) {
    console.log("\n── Paste these into Railway env vars ──────────────");
    for (const l of lines) console.log(l);
    console.log("───────────────────────────────────────────────────");
  }

  if (hadError) process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
