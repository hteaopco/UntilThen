import { SquareClient, SquareEnvironment } from "square";

/**
 * Server-side Square client singleton.
 *
 * Credentials come from Railway env vars:
 *   - SQUARE_ACCESS_TOKEN    (production token)
 *   - SQUARE_APPLICATION_ID
 *   - SQUARE_LOCATION_ID
 *
 * We always run against Production — Sandbox is never used in a
 * deployed build per product decision. If the access token is
 * missing, `getSquareClient()` throws so the calling API route
 * can surface a clean 503 instead of a cryptic Square error.
 */
let _client: SquareClient | null = null;

export function getSquareClient(): SquareClient {
  if (_client) return _client;
  const token = process.env.SQUARE_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "SQUARE_ACCESS_TOKEN is not set. Payments are unavailable.",
    );
  }
  _client = new SquareClient({
    token,
    environment: SquareEnvironment.Production,
  });
  return _client;
}

export function squareIsConfigured(): boolean {
  return Boolean(
    process.env.SQUARE_ACCESS_TOKEN &&
      process.env.SQUARE_APPLICATION_ID &&
      process.env.SQUARE_LOCATION_ID,
  );
}

export const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID ?? "";

/**
 * Subscription plan IDs configured in the Square Dashboard under
 * Items & Orders → Subscriptions. Hardcoded per the launch brief
 * so a forgotten env var can't silently break subscribe/addon at
 * runtime. Env-var overrides stay supported for future staging /
 * sandbox environments.
 *
 * Pricing:
 *   Monthly base   — $4.99 / month   (3 capsules included, prorated to 1st)
 *   Annual base    — $35.99 / year   (full price upfront, no proration,
 *                                     renews on the same day next year)
 *   Monthly add-on — $0.99 / month   (per additional capsule, prorated)
 *   Annual add-on  — $6.00 / year    (per additional capsule)
 */
export const SQUARE_PLAN_IDS = {
  MONTHLY_BASE:
    process.env.SQUARE_PLAN_MONTHLY_BASE ?? "6D7TZDMBKPQSX7FUD46O5D2W",
  ANNUAL_BASE:
    process.env.SQUARE_PLAN_ANNUAL_BASE ?? "7SECOFJCZ6CUVPJIWG6UR4F3",
  MONTHLY_ADDON:
    process.env.SQUARE_PLAN_MONTHLY_ADDON ?? "532XDRT3DCHHH2HSFBY2S6KM",
  ANNUAL_ADDON:
    process.env.SQUARE_PLAN_ANNUAL_ADDON ?? "UOWOEMVRR7UZPYIDNKCHQ4BE",
};

/**
 * Order template IDs for each subscription tier. Our four plan
 * variations are configured with RELATIVE pricing but no linked
 * price source, so subscriptions.create requires passing a phases
 * array with order_template_id per phase — the template carries
 * the actual dollar amount.
 *
 * Created via the one-click admin setup at /admin/settings →
 * "Subscription order templates", which hits
 * POST /api/admin/square-setup-order-templates. Populate the
 * SQUARE_ORDER_TEMPLATE_* env vars with the returned IDs.
 */
export const SQUARE_ORDER_TEMPLATE_IDS = {
  MONTHLY_BASE: process.env.SQUARE_ORDER_TEMPLATE_MONTHLY_BASE ?? "",
  ANNUAL_BASE: process.env.SQUARE_ORDER_TEMPLATE_ANNUAL_BASE ?? "",
  MONTHLY_ADDON: process.env.SQUARE_ORDER_TEMPLATE_MONTHLY_ADDON ?? "",
  ANNUAL_ADDON: process.env.SQUARE_ORDER_TEMPLATE_ANNUAL_ADDON ?? "",
};

/** One-time Gift Capsule charge — does not use a subscription plan. */
export const GIFT_CAPSULE_PRICE_CENTS = 999;
