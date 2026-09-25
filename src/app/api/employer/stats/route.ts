import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Resolve employer/org ID
    const memberDoc = await adminDb.collection("members").doc(uid).get();
    const memberOrgId = memberDoc.exists ? memberDoc.data()?.orgId : null;

    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();
    if (!memberOrgId && (!userData || userData.role !== "employer")) {
      return NextResponse.json({ error: "Not an employer" }, { status: 403 });
    }

    const orgId = memberOrgId || userData?.employerId;
    if (!orgId) {
      return NextResponse.json({ error: "No org found" }, { status: 403 });
    }

    // Count jobs
    const jobsSnap = await adminDb
      .collection("jobs")
      .where("employerId", "==", orgId)
      .get();

    // Job deletion is a tombstone, not a hard delete. Match the Jobs list.
    const visibleJobs = jobsSnap.docs.filter((d) => {
      const data = d.data();
      return data.status !== "deleted" && !data.deletedAt;
    });
    const totalPosts = visibleJobs.length;
    const activePosts = visibleJobs.filter((d) => {
      const data = d.data();
      return data.active === true || data.status === "active";
    }).length;

    // Count applications across all jobs
    let applications = 0;
    for (const jobDoc of visibleJobs) {
      const appsSnap = await adminDb
        .collection("applications")
        .where("jobId", "==", jobDoc.id)
        .get();
      applications += appsSnap.size;
    }

    // Count profile views from subcollection. An aggregate count costs one read
    // per 1,000 views instead of reading every view document.
    let profileViews = 0;
    try {
      const viewsSnap = await adminDb
        .collection("organizations")
        .doc(orgId)
        .collection("views")
        .where("type", "==", "profile")
        .count()
        .get();
      profileViews = viewsSnap.data().count;
    } catch {
      // subcollection may not exist yet
    }

    return NextResponse.json({
      totalPosts,
      activePosts,
      applications,
      profileViews,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[employer/stats]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
