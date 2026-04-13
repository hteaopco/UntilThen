import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape cells containing commas, quotes, or newlines.
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  // Middleware already guards /admin/** but API routes aren't under /admin,
  // so re-check auth here.
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not set." },
      { status: 500 },
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const entries = await prisma.waitlist.findMany({
      orderBy: { createdAt: "desc" },
    });

    const header =
      "First Name,Last Name,Email,Phone,Date of Birth,Children,Source,Signed Up";
    const rows = entries.map((e) =>
      [
        csvCell(e.firstName),
        csvCell(e.lastName),
        csvCell(e.email),
        csvCell(e.phone ?? ""),
        csvCell(e.dateOfBirth ? e.dateOfBirth.toISOString().split("T")[0] : ""),
        csvCell(e.numChildren),
        csvCell(e.hearAboutUs ?? ""),
        csvCell(e.createdAt.toISOString()),
      ].join(","),
    );
    const csv = [header, ...rows].join("\n");

    const filename = `untilthen-waitlist-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[admin/export] error:", err);
    return NextResponse.json(
      { error: "Failed to export waitlist." },
      { status: 500 },
    );
  }
}
