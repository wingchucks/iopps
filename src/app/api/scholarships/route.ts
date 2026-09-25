import { NextResponse } from "next/server";
import { getPublicOpportunities } from "@/lib/server/public-opportunities";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json({ scholarships: await getPublicOpportunities("scholarships") }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { console.error("Scholarships API:", error); return NextResponse.json({ error: "Funding opportunities could not load. Please try again." }, { status: 500 }); }
}

// A maintenance secret must never bulk-change the review status of public listings.
// Organization scholarships use the authenticated employer scholarships API.
export async function PATCH() {
  return Response.json(
    { error: "This legacy maintenance endpoint has been retired.", code: "ENDPOINT_RETIRED" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
