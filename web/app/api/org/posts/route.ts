import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  // Find user's org
  const orgSnap = await adminDb.collection("organizations")
    .where("teamMemberIds", "array-contains", authResult.decodedToken.uid).limit(1).get();
  if (orgSnap.empty) return NextResponse.json({ error: "No organization found" }, { status: 404 });

  const orgId = orgSnap.docs[0].id;

  // Get all posts for this org (all statuses)
  const postsSnap = await adminDb.collection("posts")
    .where("orgId", "==", orgId)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const posts = postsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ posts });
}
