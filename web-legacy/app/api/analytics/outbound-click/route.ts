import { NextResponse } from "next/server";
import { trackOrganizationOutboundClick } from "@/lib/firestore/analytics";
import type { OutboundLinkType } from "@/lib/types";

const VALID_LINK_TYPES: OutboundLinkType[] = [
  "website",
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "booking",
  "phone",
  "email",
  "other",
];

// POST: Track an outbound link click
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { organizationId, linkType, targetUrl, slug, vendorId, offeringId } = body;

    if (!organizationId || !linkType || !targetUrl) {
      return NextResponse.json(
        { error: "organizationId, linkType, and targetUrl are required" },
        { status: 400 }
      );
    }

    // Validate link type
    if (!VALID_LINK_TYPES.includes(linkType)) {
      return NextResponse.json(
        { error: `Invalid linkType. Must be one of: ${VALID_LINK_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Extract metadata from request
    const referrer = request.headers.get("referer") || undefined;

    // Generate a simple visitor ID
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const visitorId = `${ip}-${Date.now()}`;

    await trackOrganizationOutboundClick({
      organizationId,
      linkType: linkType as OutboundLinkType,
      targetUrl,
      slug,
      vendorId,
      offeringId,
      visitorId,
      referrer,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Outbound click tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track click" },
      { status: 500 }
    );
  }
}
