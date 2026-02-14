import { NextResponse, type NextRequest } from "next/server";
import { getJobs, type JobFilters } from "@/lib/firestore/jobs";

/**
 * GET /api/jobs
 *
 * Public endpoint -- lists active jobs with optional filtering and
 * cursor-based pagination.
 *
 * Query params:
 *   q         - search term (matched against title / description)
 *   category  - job category filter
 *   location  - location substring filter
 *   type      - employment type (e.g. "Full-time")
 *   remote    - "true" to filter remote-only jobs
 *   indigenous - "true" to filter indigenous-preference jobs
 *   limit     - page size (default 20, max 100)
 *   cursor    - Firestore doc ID to start after (cursor pagination)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const q = searchParams.get("q") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const location = searchParams.get("location") ?? undefined;
    const employmentType = searchParams.get("type") ?? undefined;
    const remoteOnly = searchParams.get("remote") === "true";
    const indigenousOnly = searchParams.get("indigenous") === "true";
    const cursor = searchParams.get("cursor") ?? undefined;

    const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);
    const pageSize = Math.min(Math.max(rawLimit, 1), 100);

    const filters: JobFilters = {
      search: q,
      category: category || undefined,
      location: location || undefined,
      employmentType: employmentType || undefined,
      remoteOnly: remoteOnly || undefined,
      indigenousOnly: indigenousOnly || undefined,
      pageSize,
      startAfterId: cursor || undefined,
      activeOnly: true,
    };

    const result = await getJobs(filters);

    return NextResponse.json({
      jobs: result.jobs,
      pagination: {
        cursor: result.lastDocId,
        hasMore: result.hasMore,
        pageSize,
      },
    });
  } catch (error) {
    console.error("[GET /api/jobs] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 },
    );
  }
}
