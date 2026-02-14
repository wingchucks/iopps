import { NextRequest, NextResponse } from "next/server";
import { auth, db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/fix-employer-jobs
 *
 * Fixes jobs from employers who don't have approved profiles:
 * - Sets active: false for jobs from unapproved employers
 * - Adds pendingReason field to track why the job was deactivated
 *
 * Body: { employerId?: string, dryRun?: boolean }
 * - employerId: Optional specific employer to fix (if not provided, fixes all)
 * - dryRun: If true, just returns what would be changed without making changes
 */
export async function POST(request: NextRequest) {
  // Check if Firebase Admin is initialized
  if (!auth || !db) {
    console.error("Firebase Admin not initialized");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 503 }
    );
  }

  // Verify authentication - only admins can use this endpoint
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await auth.verifyIdToken(idToken);

    // Check if the user is an admin
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
  } catch (authError) {
    console.error("Auth verification error:", authError);
    return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { employerId, dryRun = false } = body;

    const results: {
      checked: number;
      deactivated: number;
      jobs: Array<{ id: string; title: string; employerId: string; reason: string }>;
    } = {
      checked: 0,
      deactivated: 0,
      jobs: [],
    };

    // Get all active jobs (or filter by employer if specified)
    let jobsQuery = db.collection("jobs").where("active", "==", true);
    if (employerId) {
      jobsQuery = jobsQuery.where("employerId", "==", employerId);
    }

    const jobsSnapshot = await jobsQuery.get();
    results.checked = jobsSnapshot.size;

    // Check each job's employer status
    for (const jobDoc of jobsSnapshot.docs) {
      const job = jobDoc.data();
      const jobEmployerId = job.employerId;

      // Get employer profile
      const employerDoc = await db.collection("employers").doc(jobEmployerId).get();
      const employer = employerDoc.data();

      let reason: string | null = null;

      if (!employer) {
        reason = "employer_profile_missing";
      } else if (employer.status !== "approved") {
        reason = `employer_status_${employer.status || "pending"}`;
      }

      // If there's a reason to deactivate, do it
      if (reason) {
        if (!dryRun) {
          await db.collection("jobs").doc(jobDoc.id).update({
            active: false,
            pendingReason: reason,
            deactivatedAt: new Date(),
            deactivatedBy: "admin_fix_script",
          });
        }

        results.deactivated++;
        results.jobs.push({
          id: jobDoc.id,
          title: job.title,
          employerId: jobEmployerId,
          reason,
        });
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      message: dryRun
        ? `Dry run complete. Would deactivate ${results.deactivated} of ${results.checked} jobs.`
        : `Fixed ${results.deactivated} of ${results.checked} jobs.`,
      ...results,
    });
  } catch (error) {
    console.error("Error fixing employer jobs:", error);
    return NextResponse.json(
      { error: "Failed to fix jobs" },
      { status: 500 }
    );
  }
}
