import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getPublicOpportunity } from "@/lib/server/public-opportunities";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Individual RSVPs are private; only the aggregate "going" count is public.
async function countGoing(eventId: string): Promise<number> {
  try {
    const snapshot = await getAdminDb().collection("event_rsvps")
      .where("postId", "==", eventId).where("status", "==", "going").count().get();
    return snapshot.data().count;
  } catch (error) {
    console.error("event going count:", error instanceof Error ? error.name : "Error");
    return 0;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await getPublicOpportunity("events", id);
    const event = item ? { ...item, goingCount: await countGoing(String(item.id ?? id)) } : item;
    return NextResponse.json({ event }, { status: item ? 200 : 404, headers: { "Cache-Control": "no-store" } });
  } catch (error) { console.error("event detail:", error); return NextResponse.json({ error: "Could not load this listing. Please try again." }, { status: 500 }); }
}
