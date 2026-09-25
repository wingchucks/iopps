import { NextResponse } from "next/server";
import { getPublicOpportunities } from "@/lib/server/public-opportunities";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json({ events: await getPublicOpportunities("events") }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { console.error("Events API:", error); return NextResponse.json({ error: "Events could not load. Please try again." }, { status: 500 }); }
}

// A maintenance secret must never merge arbitrary fields into public listings.
// Organization events use the authenticated employer events API.
export async function POST() {
  return Response.json(
    { error: "This legacy maintenance endpoint has been retired.", code: "ENDPOINT_RETIRED" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
