import { NextRequest, NextResponse } from "next/server";
import {
  getScholarships,
  type ScholarshipFilters,
} from "@/lib/firestore/scholarships";

/**
 * GET /api/education/scholarships
 *
 * Public endpoint. Returns a paginated list of active scholarships.
 *
 * Query params:
 *   - type        Scholarship type (Scholarship | Grant | Bursary)
 *   - level       Education level filter
 *   - region      Region filter
 *   - page        Page number (1-based, default 1)
 *   - limit       Page size (default 24, max 100)
 *   - includeExpired  "true" to include expired scholarships
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const type = searchParams.get("type") || undefined;
    const level = searchParams.get("level") || undefined;
    const region = searchParams.get("region") || undefined;
    const includeExpired = searchParams.get("includeExpired") === "true";

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "24", 10)),
    );

    const filters: ScholarshipFilters = {
      activeOnly: true,
      includeExpired,
      type,
      level,
      region,
    };

    // Fetch all matching scholarships (Firestore doesn't support offset natively,
    // so we paginate in-memory for public listings which are bounded in size)
    const allScholarships = await getScholarships(filters);

    const total = allScholarships.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const scholarships = allScholarships.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      scholarships,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error("[GET /api/education/scholarships] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scholarships" },
      { status: 500 },
    );
  }
}
