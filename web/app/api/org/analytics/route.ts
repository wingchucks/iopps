import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/api-auth";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  const authResult = await verifyAuthToken(request);
  if (!authResult.success) return authResult.response;
  if (!adminDb) return NextResponse.json({ error: "DB not initialized" }, { status: 500 });

  // Find user's org
  const orgSnap = await adminDb.collection("organizations")
    .where("teamMemberIds", "array-contains", authResult.decodedToken.uid)
    .limit(1).get();
  if (orgSnap.empty) return NextResponse.json({ error: "No organization found" }, { status: 404 });

  const orgDoc = orgSnap.docs[0];
  const orgData = orgDoc.data();

  // Check tier access — only tier2 and school get analytics
  const tier = orgData.subscription?.tier;
  if (tier !== "tier2" && tier !== "school") {
    return NextResponse.json({ error: "Analytics requires Tier 2 or Education plan" }, { status: 403 });
  }

  // Get all org posts
  const postsSnap = await adminDb.collection("posts")
    .where("orgId", "==", orgDoc.id)
    .orderBy("viewCount", "desc")
    .limit(50)
    .get();

  let totalViews = 0;
  let totalApplications = 0;
  const topPosts: { id: string; title: string; views: number; applications: number }[] = [];

  postsSnap.docs.forEach((doc) => {
    const d = doc.data();
    const views = d.viewCount || 0;
    const apps = d.applicationCount || 0;
    totalViews += views;
    totalApplications += apps;
    topPosts.push({
      id: doc.id,
      title: d.title || "Untitled",
      views,
      applications: apps,
    });
  });

  // Sort by views descending and take top 10
  topPosts.sort((a, b) => b.views - a.views);

  return NextResponse.json({
    totalViews,
    totalApplications,
    viewsTrend: 0, // TODO: compute from historical data
    appsTrend: 0,
    topPosts: topPosts.slice(0, 10),
  });
}
