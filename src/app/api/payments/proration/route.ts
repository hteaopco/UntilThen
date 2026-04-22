import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { calculateProration } from "@/lib/proration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/proration?plan=MONTHLY|ANNUAL&type=new|addon
 *
 * Returns today's charge + next renewal info so the checkout UI
 * can render "Charged today" / "Renews on" without rolling its
 * own math. Auth-gated because the numbers are product-specific
 * — no need to let anonymous callers poke at pricing logic.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const planParam = req.nextUrl.searchParams.get("plan");
  const typeParam = req.nextUrl.searchParams.get("type");

  if (planParam !== "MONTHLY" && planParam !== "ANNUAL") {
    return NextResponse.json(
      { error: "plan must be MONTHLY or ANNUAL." },
      { status: 400 },
    );
  }
  if (typeParam !== "new" && typeParam !== "addon") {
    return NextResponse.json(
      { error: "type must be new or addon." },
      { status: 400 },
    );
  }

  const result = calculateProration({
    plan: planParam,
    type: typeParam,
  });

  return NextResponse.json({
    amountTodayCents: result.amountTodayCents,
    amountTodayDollars: (result.amountTodayCents / 100).toFixed(2),
    nextRenewalDate: result.nextRenewalDate,
    nextRenewalAmountCents: result.nextRenewalAmountCents,
    nextRenewalAmountDollars: (
      result.nextRenewalAmountCents / 100
    ).toFixed(2),
  });
}
