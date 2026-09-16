import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getPublicOpportunities } from "@/lib/server/public-opportunities";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json({ events: await getPublicOpportunities("events") }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { console.error("Events API:", error); return NextResponse.json({ error: "Events could not load. Please try again." }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const db = getAdminDb();
    const data = await request.json();
    const { id, ...rest } = data;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await db.collection("events").doc(id).set({ id, ...rest }, { merge: true });
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("Events POST error:", err);
    return NextResponse.json({ error: "Failed to save event" }, { status: 500 });
  }
}
