import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { getAdminDb } from "@/lib/firebase-admin";
import { listingState, type ListingState } from "@/lib/listing-lifecycle";
import { findJobRecordAnyState } from "@/lib/server/job-record-lookup";
import { getClosedScholarship, getPublicOpportunity } from "@/lib/server/public-opportunities";

export const runtime = "nodejs";

const MAX_ITEMS = 100;

function stripTypePrefix(postId: string, postType: string): string {
  return postId.startsWith(`${postType}-`) ? postId.slice(postType.length + 1) : postId;
}

/**
 * Lifecycle of the signed-in member's saved listings, so the saved page can mark
 * closed or removed items instead of sending people to a dead end. Returns only
 * open / closed / unavailable, never listing content.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAuthToken(req);
  if (!auth.success) return auth.response;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const items = (body as { items?: unknown })?.items;
  if (!Array.isArray(items) || items.length > MAX_ITEMS) return NextResponse.json({ error: "Send up to 100 saved items." }, { status: 400 });
  const db = getAdminDb();
  const statuses: Record<string, ListingState> = {};
  await Promise.all(items.map(async (entry) => {
    const postId = typeof entry?.postId === "string" ? entry.postId : "";
    const postType = typeof entry?.postType === "string" ? entry.postType : "";
    if (!postId || postId.length > 700 || postId.includes("/") || statuses[postId]) return;
    const id = stripTypePrefix(postId, postType);
    try {
      if (postType === "job") {
        const record = await findJobRecordAnyState(db, id);
        statuses[postId] = record ? listingState(record.data) : "unavailable";
      } else if (postType === "scholarship") {
        const open = await getPublicOpportunity("scholarships", id, db);
        statuses[postId] = open ? (open.intakeClosed ? "closed" : "open") : (await getClosedScholarship(id, db)) ? "closed" : "unavailable";
      } else if (postType === "event") {
        // A past event is no longer listed publicly but its record remains; treat it as ended.
        const open = await getPublicOpportunity("events", id, db);
        if (open) statuses[postId] = "open";
        else {
          const snapshot = await db.collection("events").doc(id).get();
          statuses[postId] = snapshot.exists ? (listingState(snapshot.data() ?? {}, new Date(), { ended: true }) === "unavailable" ? "unavailable" : "closed") : "unavailable";
        }
      }
    } catch (error) {
      console.error("[api/saved/status]", error);
    }
  }));
  return NextResponse.json({ statuses }, { headers: { "Cache-Control": "private, no-store" } });
}
