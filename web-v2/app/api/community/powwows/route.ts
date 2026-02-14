import { NextResponse, type NextRequest } from "next/server";
import { getPowwows, type PowwowFilters, type PowwowEventType } from "@/lib/firestore/powwows";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const VALID_EVENT_TYPES: PowwowEventType[] = [
  "Pow Wow",
  "Sports",
  "Career Fair",
  "Other",
];

// ---------------------------------------------------------------------------
// GET /api/community/powwows
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
    const filters: PowwowFilters = {
      activeOnly: true,
      includeExpired: false,
    };

    const region = searchParams.get("province") || searchParams.get("region");
    if (region) {
      filters.region = region;
    }

    const eventType = searchParams.get("eventType");
    if (eventType && VALID_EVENT_TYPES.includes(eventType as PowwowEventType)) {
      filters.eventType = eventType as PowwowEventType;
    }

    const status = searchParams.get("status");
    if (status === "all") {
      filters.includeExpired = true;
    }

    // Fetch all matching powwows (Firestore does not natively paginate by offset)
    const allPowwows = await getPowwows(filters);

    // Apply client-side pagination
    const total = allPowwows.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const powwows = allPowwows.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      powwows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("[GET /api/community/powwows] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pow wows" },
      { status: 500 },
    );
  }
}
