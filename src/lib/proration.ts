/**
 * Proration + pricing math for the Time Capsule subscription.
 *
 * Monthly plans are prorated to the 1st of next month. A signup
 * on the 15th of a 30-day month charges (30-15+1)/30 = 16/30 of
 * the full month's price, then the full price kicks in on the
 * 1st and every month after.
 *
 * Annual plans do NOT prorate — per Square's limitation on
 * annual cadences we charge the full price upfront on the
 * signup day, and Square renews on that same calendar date
 * each following year. Annual add-ons likewise charge full
 * price at purchase time.
 *
 * Amounts below are in US cents to match Square's integer
 * money model.
 */

export const MONTHLY_BASE_CENTS = 499;
export const ANNUAL_BASE_CENTS = 3599;
export const MONTHLY_ADDON_CENTS = 99;
export const ANNUAL_ADDON_CENTS = 600;

/**
 * Days remaining in the current calendar month, inclusive of
 * today. Used as the numerator in the monthly proration ratio.
 */
function daysRemainingThisMonth(now: Date): number {
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();
  return daysInMonth - now.getDate() + 1;
}

function daysInMonth(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

/** 1st of next month, used as the monthly subscription start date.
 *  Anchored to noon UTC so the ISO string renders as the intended
 *  calendar day in every US timezone (midnight UTC drifts back to
 *  the previous day in CT/MT/PT). */
export function nextFirstOfMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 12));
}

/** Same calendar date one year out, used as the annual renewal.
 *  Same noon-UTC trick as nextFirstOfMonth. */
export function oneYearLater(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear() + 1, now.getUTCMonth(), now.getUTCDate(), 12),
  );
}

/**
 * Prorate a monthly amount from today → the 1st of next month,
 * rounded to whole cents.
 *
 *   today = Apr 15, price = $4.99  →  $2.66
 *   today = Apr 30, price = $4.99  →  $0.17
 *   today = Apr  1, price = $4.99  →  $4.99  (full month)
 */
export function prorateMonthlyCents(priceCents: number, now: Date): number {
  const remaining = daysRemainingThisMonth(now);
  const total = daysInMonth(now);
  return Math.round((priceCents * remaining) / total);
}

export type ProrationContext =
  | { plan: "MONTHLY"; type: "new" | "addon" }
  | { plan: "ANNUAL"; type: "new" | "addon" };

/**
 * Compute the upfront charge + next-renewal summary for a given
 * plan/type combo. The API route hands this to the UI so the
 * checkout card can render "Charged today: $X.XX · Renews
 * [date]" without the client doing any math.
 *
 * For monthly, proration kicks in; for annual, the full price
 * is the charge and renewal slides to the same day next year.
 */
export type ProrationResult = {
  amountTodayCents: number;
  nextRenewalDate: string; // ISO
  nextRenewalAmountCents: number;
};

export function calculateProration(
  ctx: ProrationContext,
  now: Date = new Date(),
): ProrationResult {
  if (ctx.plan === "MONTHLY") {
    const fullCents =
      ctx.type === "new" ? MONTHLY_BASE_CENTS : MONTHLY_ADDON_CENTS;
    return {
      amountTodayCents: prorateMonthlyCents(fullCents, now),
      nextRenewalDate: nextFirstOfMonth(now).toISOString(),
      nextRenewalAmountCents: fullCents,
    };
  }
  // Annual — no proration, full price today, renew same date next year.
  const fullCents =
    ctx.type === "new" ? ANNUAL_BASE_CENTS : ANNUAL_ADDON_CENTS;
  return {
    amountTodayCents: fullCents,
    nextRenewalDate: oneYearLater(now).toISOString(),
    nextRenewalAmountCents: fullCents,
  };
}
