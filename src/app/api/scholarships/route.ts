import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getPublicOpportunities } from "@/lib/server/public-opportunities";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json({ scholarships: await getPublicOpportunities("scholarships") }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { console.error("Scholarships API:", error); return NextResponse.json({ error: "Funding opportunities could not load. Please try again." }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const auth = request.headers.get("authorization");
    
    if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status: newStatus, fromStatus } = body;

    if (!newStatus || !fromStatus) {
      return NextResponse.json({ error: "status and fromStatus required" }, { status: 400 });
    }

    const db = getAdminDb();
    const snap = await db.collection("scholarships")
      .where("status", "==", fromStatus)
      .get();

    if (snap.empty) {
      return NextResponse.json({ updated: 0, message: `No scholarships with status '${fromStatus}'` });
    }

    const batch = db.batch();
    snap.docs.forEach(doc => batch.update(doc.ref, { status: newStatus }));
    await batch.commit();

    return NextResponse.json({ updated: snap.size, message: `Updated ${snap.size} from '${fromStatus}' to '${newStatus}'` });
  } catch (err) {
    console.error("Scholarships PATCH error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
