import { NextResponse, type NextRequest } from "next/server";
import { getConferences, type ConferenceFilters } from "@/lib/firestore/conferences";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// GET /api/conferences
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Parse pagination
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10)),
    );

    // Parse filters
    const filters: ConferenceFilters = {
      activeOnly: true,
      includeExpired: false,
      includeDemoted: false,
    };

    const status = searchParams.get("status");
    if (status === "all") {
      filters.includeExpired = true;
      filters.includeDemoted = true;
    }

    const featured = searchParams.get("featured");
    // Featured filter is handled client-side after fetching since
    // the Firestore query already sorts featured first

    // Fetch all matching conferences
    const allConferences = await getConferences(filters);

    // Apply client-side featured filter if requested
    let filteredConferences = allConferences;
    if (featured === "true") {
      filteredConferences = allConferences.filter((c) => c.featured);
    }

    // Apply client-side pagination
    const total = filteredConferences.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const conferences = filteredConferences.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      conferences,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("[GET /api/conferences] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conferences" },
      { status: 500 },
    );
  }
}
