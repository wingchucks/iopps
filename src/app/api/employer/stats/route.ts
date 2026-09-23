import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  computeJobStats,
  visibleJobRecords,
  type JobStatRecord,
} from "@/lib/dashboard-stats";

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

    // Count jobs. Employer jobs live in BOTH the `jobs` collection and the
    // `posts` collection (type === "job") — /api/employer/dashboard and the
    // Jobs list merge both, so stats must too, or orgs whose jobs are stored
    // as posts see 0/0/0 here while their listings show jobs.
    const jobsSnap = await adminDb
      .collection("jobs")
      .where("employerId", "==", orgId)
      .get();

    let postDocs: Array<{ id: string; data: () => Record<string, unknown> }> = [];
    try {
      const postsSnap = await adminDb
        .collection("posts")
        .where("orgId", "==", orgId)
        .get();
      postDocs = postsSnap.docs.filter((d) => d.data()?.type === "job");
    } catch (err) {
      // Stats must not fail outright when the posts read is unavailable;
      // fall back to the jobs collection rather than returning nothing.
      console.error("[employer/stats] posts read failed, using jobs only:", err instanceof Error ? err.message : err);
    }

    const records: JobStatRecord[] = [
      ...jobsSnap.docs.map((d) => ({ ...(d.data() as Record<string, unknown>), id: d.id })),
      ...postDocs.map((d) => ({ ...d.data(), id: d.id })),
    ];
    const visibleJobs = visibleJobRecords(records);
    const { totalPosts, activePosts } = computeJobStats(records);

    // Count applications across all visible jobs. The per-job reads run in
    // parallel: the old sequential loop made this endpoint intermittently
    // slow enough to fail, which the dashboard then swallowed silently.
    const db = adminDb;
    const applicationCounts = await Promise.all(
      visibleJobs.map(async (job) => {
        try {
          const appsSnap = await db
            .collection("applications")
            .where("jobId", "==", job.id)
            .get();
          return appsSnap.size;
        } catch {
          return 0;
        }
      }),
    );
    const applications = applicationCounts.reduce((sum, n) => sum + n, 0);

    // Count profile views from subcollection
    let profileViews = 0;
    try {
      const viewsSnap = await adminDb
        .collection("organizations")
        .doc(orgId)
        .collection("views")
        .where("type", "==", "profile")
        .get();
      profileViews = viewsSnap.size;
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
