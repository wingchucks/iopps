import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { verifyIdToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/org/dashboard
// ---------------------------------------------------------------------------

/**
 * Fetch dashboard data for the authenticated employer/school user.
 * Returns: org profile, jobs, stats, and recent activity.
 */
export async function GET(request: NextRequest) {
  const authResult = await verifyIdToken(request);
  if (!authResult.success) return authResult.response;

  const { uid } = authResult.decodedToken;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 },
    );
  }

  try {
    // 1. Find the user's org membership
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();
    const orgId = userData?.orgId || userData?.employerId;

    // 2. Fetch org profile from "employers" collection
    let org = null;
    if (orgId) {
      const orgDoc = await adminDb.collection("employers").doc(orgId).get();
      if (orgDoc.exists) {
        org = { id: orgDoc.id, ...orgDoc.data() };
      }
    }

    // Fallback: try to find org where userId matches
    if (!org) {
      const orgSnap = await adminDb
        .collection("employers")
        .where("userId", "==", uid)
        .limit(1)
        .get();
      if (!orgSnap.empty) {
        const doc = orgSnap.docs[0];
        org = { id: doc.id, ...doc.data() };
      }
    }

    // 3. Fetch jobs posted by this org
    const jobs: Record<string, unknown>[] = [];
    if (org) {
      const jobsSnap = await adminDb
        .collection("jobs")
        .where("employerId", "==", org.id)
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

      for (const doc of jobsSnap.docs) {
        const data = doc.data();
        // Count applications for each job
        const appsSnap = await adminDb
          .collection("applications")
          .where("jobId", "==", doc.id)
          .count()
          .get();
        const applicationCount = appsSnap.data().count || 0;

        jobs.push({
          id: doc.id,
          title: data.title,
          slug: data.slug,
          location: data.location,
          status: data.status,
          applicationCount,
          createdAt: data.createdAt,
        });
      }
    }

    // 4. Compute stats
    const activeJobs = jobs.filter(
      (j) => j.status === "active" || j.status === "published",
    ).length;
    const totalApplications = jobs.reduce(
      (sum, j) => sum + ((j.applicationCount as number) || 0),
      0,
    );

    // Profile views from subcollection (if exists)
    let profileViews = 0;
    if (org) {
      try {
        const viewsSnap = await adminDb
          .collection("employers")
          .doc((org as { id: string }).id)
          .collection("views")
          .count()
          .get();
        profileViews = viewsSnap.data().count || 0;
      } catch {
        // views subcollection may not exist yet
      }
    }

    // 5. Recent activity from subcollection
    const activity: Record<string, unknown>[] = [];
    if (org) {
      try {
        const actSnap = await adminDb
          .collection("employers")
          .doc((org as { id: string }).id)
          .collection("activity")
          .orderBy("timestamp", "desc")
          .limit(10)
          .get();

        for (const doc of actSnap.docs) {
          activity.push({ id: doc.id, ...doc.data() });
        }
      } catch {
        // activity subcollection may not exist yet
      }
    }

    return NextResponse.json({
      org,
      profile: userData,
      jobs,
      stats: {
        totalPosts: jobs.length,
        activePosts: activeJobs,
        applications: totalApplications,
        profileViews,
      },
      activity,
    });
  } catch (error) {
    console.error("[GET /api/org/dashboard] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/org/dashboard  (profile update)
// ---------------------------------------------------------------------------

/**
 * Update the organization profile fields.
 */
export async function PUT(request: NextRequest) {
  const authResult = await verifyIdToken(request);
  if (!authResult.success) return authResult.response;

  const { uid } = authResult.decodedToken;

  if (!adminDb) {
    return NextResponse.json(
      { error: "Firestore not initialized" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();

    // Find the user's org
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();
    const orgId = userData?.orgId || userData?.employerId;

    let resolvedOrgId = orgId;
    if (!resolvedOrgId) {
      const orgSnap = await adminDb
        .collection("employers")
        .where("userId", "==", uid)
        .limit(1)
        .get();
      if (!orgSnap.empty) {
        resolvedOrgId = orgSnap.docs[0].id;
      }
    }

    if (!resolvedOrgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    // Whitelist allowed fields
    const ALLOWED_FIELDS = new Set([
      "name",
      "organizationName",
      "tagline",
      "description",
      "location",
      "website",
      "contactEmail",
      "phone",
      "socialLinks",
      "hours",
      "gallery",
      "tags",
      "services",
      "indigenousGroups",
      "nation",
      "treatyTerritory",
    ]);

    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        update[key] = value;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    update.updatedAt = new Date();

    await adminDb.collection("employers").doc(resolvedOrgId).update(update);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PUT /api/org/dashboard] Error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}
