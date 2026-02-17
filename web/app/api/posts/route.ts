import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const types = searchParams.get("types")?.split(",").filter(Boolean);
  const after = searchParams.get("after");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  let query: FirebaseFirestore.Query = adminDb.collection("posts")
    .where("status", "==", "active")
    .orderBy("createdAt", "desc");

  if (types && types.length > 0) {
    query = query.where("type", "in", types);
  }

  if (after) {
    const afterDoc = await adminDb.collection("posts").doc(after).get();
    if (afterDoc.exists) {
      query = query.startAfter(afterDoc);
    }
  }

  // Fetch one extra to determine hasMore
  const snapshot = await query.limit(limit + 1).get();
  const hasMore = snapshot.docs.length > limit;
  const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;
  const posts = docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ posts, hasMore });
}
