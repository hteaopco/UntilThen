import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { requireOrgRole } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/orgs/[id]/employees/template
 *
 * Returns the CSV template the org admin uploads back through the
 * import flow. Header order is the canonical schema; the sample
 * rows demonstrate what each column accepts (incl. quoted commas
 * for departments that contain a comma like "Engineering, Platform").
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId: clerkId } = auth();
  if (!clerkId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id: organizationId } = await ctx.params;
  const orgCtx = await requireOrgRole(clerkId, organizationId, "ADMIN");
  if (!orgCtx)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const csv =
    "firstName,lastName,email,phone,department,subTeam\n" +
    'Jane,Smith,jane.smith@example.com,555-0100,Engineering,Platform\n' +
    'John,Doe,john.doe@example.com,555-0101,Sales,Enterprise\n' +
    'Avery,Lin,avery.lin@example.com,,"People & Culture",Recruiting\n';

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="employees-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
