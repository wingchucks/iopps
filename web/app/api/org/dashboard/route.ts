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

  const orgDoc = orgSnap.docs[0];
  const org = { id: orgDoc.id, ...orgDoc.data() };

  // Get active posts count & total views
  const postsSnap = await adminDb.collection("posts")
    .where("orgId", "==", orgDoc.id)
    .where("status", "==", "active")
    .get();

  let totalViews = 0;
  let totalAppCount = 0;
  postsSnap.docs.forEach((doc) => {
    const d = doc.data();
    totalViews += d.viewCount || 0;
    totalAppCount += d.applicationCount || 0;
  });

  // Recent applications for this org's posts
  const appsSnap = await adminDb.collection("applications")
    .where("orgId", "==", orgDoc.id)
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  const recentApplications = appsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({
    org,
    stats: {
      activePosts: postsSnap.size,
      totalApps: totalAppCount,
      views: totalViews,
    },
    recentApplications,
  });
}
