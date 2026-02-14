import { NextResponse, type NextRequest } from "next/server";
import { verifyIdToken } from "@/lib/auth";
import { getApplicationsByMember } from "@/lib/firestore/applications";

/**
 * GET /api/member/applications
 *
 * Authenticated endpoint -- returns all job applications submitted by the
 * currently authenticated member, ordered by most recent first.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyIdToken(request);
    if (!authResult.success) return authResult.response;

    const { uid } = authResult.decodedToken;
    const applications = await getApplicationsByMember(uid);

    return NextResponse.json({ applications });
  } catch (error) {
    console.error("[GET /api/member/applications] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch applications" },
      { status: 500 },
    );
  }
}
