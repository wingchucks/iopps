import { NextResponse } from "next/server";
import { trackOrganizationProfileView } from "@/lib/firestore/analytics";

// POST: Track a profile view
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { organizationId, slug } = body;

    if (!organizationId || !slug) {
      return NextResponse.json(
        { error: "organizationId and slug are required" },
        { status: 400 }
      );
    }

    // Extract metadata from request
    const referrer = request.headers.get("referer") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    // Generate a simple visitor ID (in a real app, you'd use cookies or session)
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const visitorId = `${ip}-${Date.now()}`;

    await trackOrganizationProfileView({
      organizationId,
      slug,
      visitorId,
      referrer,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Profile view tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track view" },
      { status: 500 }
    );
  }
}
