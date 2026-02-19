import { NextRequest, NextResponse } from "next/server";
import { getSchools, type SchoolFilters } from "@/lib/firestore/schools";

/**
 * GET /api/education/schools
 *
 * Public endpoint. Returns a list of published schools.
 *
 * Query params:
 *   - type                 School type (university, college, polytechnic, etc.)
 *   - province             Province code (ON, BC, AB, etc.)
 *   - indigenousControlled "true" for indigenous-controlled institutions only
 *   - limit                Maximum results (default: no limit)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const type = searchParams.get("type") || undefined;
    const province = searchParams.get("province") || undefined;
    const indigenousControlled =
      searchParams.get("indigenousControlled") === "true" ? true : undefined;
    const limitCount = searchParams.get("limit")
      ? Math.min(200, Math.max(1, parseInt(searchParams.get("limit")!, 10)))
      : undefined;

    const filters: SchoolFilters = {
      publishedOnly: true,
      type,
      province,
      indigenousControlled,
      limitCount,
    };

    const schools = await getSchools(filters);

    return NextResponse.json({
      schools,
      total: schools.length,
    });
  } catch (error) {
    console.error("[GET /api/education/schools] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch schools" },
      { status: 500 },
    );
  }
}
