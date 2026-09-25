import { NextResponse } from "next/server";
import { getClosedScholarship, getPublicOpportunity } from "@/lib/server/public-opportunities";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Open or deadline-passed listings come first; an explicitly closed one keeps its page, marked closed.
    const item = await getPublicOpportunity("scholarships", id) ?? await getClosedScholarship(id);
    const headers: Record<string, string> = { "Cache-Control": "no-store" };
    if (item?.intakeClosed) headers["X-Robots-Tag"] = "noindex";
    return NextResponse.json({ scholarship: item }, { status: item ? 200 : 404, headers });
  } catch (error) { console.error("scholarship detail:", error); return NextResponse.json({ error: "Could not load this listing. Please try again." }, { status: 500 }); }
}
