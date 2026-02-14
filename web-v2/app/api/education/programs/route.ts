import { NextRequest, NextResponse } from "next/server";
import {
  getEducationPrograms,
  type EducationProgramFilters,
  type ProgramCategory,
  type ProgramLevel,
  type ProgramDelivery,
} from "@/lib/firestore/educationPrograms";

/**
 * GET /api/education/programs
 *
 * Public endpoint. Returns a paginated list of published education programs.
 *
 * Query params:
 *   - category        Program category
 *   - level           Academic level (Certificate, Diploma, etc.)
 *   - deliveryMethod  Delivery method (in-person | online | hybrid)
 *   - schoolId        Filter by specific school
 *   - indigenousFocused  "true" for indigenous-focused programs only
 *   - search          Text search against name/description/category
 *   - page            Page number (1-based, default 1)
 *   - limit           Page size (default 24, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const category = (searchParams.get("category") || undefined) as
      | ProgramCategory
      | undefined;
    const level = (searchParams.get("level") || undefined) as
      | ProgramLevel
      | undefined;
    const deliveryMethod = (searchParams.get("deliveryMethod") || undefined) as
      | ProgramDelivery
      | undefined;
    const schoolId = searchParams.get("schoolId") || undefined;
    const indigenousFocused =
      searchParams.get("indigenousFocused") === "true" ? true : undefined;
    const search = searchParams.get("search") || undefined;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "24", 10)),
    );

    const filters: EducationProgramFilters = {
      publishedOnly: true,
      category,
      level,
      deliveryMethod,
      schoolId,
      indigenousFocused,
      search,
    };

    const allPrograms = await getEducationPrograms(filters);

    const total = allPrograms.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const programs = allPrograms.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      programs,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error("[GET /api/education/programs] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch education programs" },
      { status: 500 },
    );
  }
}
