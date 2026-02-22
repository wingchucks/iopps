import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    // Verify auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    // Get user profile
    const userDoc = await adminDb.collection("users").doc(uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== "employer" || !userData.employerId) {
      return NextResponse.json({ error: "Not an employer" }, { status: 403 });
    }

    const employerId = userData.employerId;

    // Get employer data
    const empDoc = await adminDb.collection("employers").doc(employerId).get();
    const empData = empDoc.exists ? empDoc.data() : null;

    // Try organizations collection first, then build from employer
    let orgData = null;
    const orgDoc = await adminDb.collection("organizations").doc(employerId).get();
    if (orgDoc.exists) {
      orgData = { id: orgDoc.id, ...orgDoc.data() };
    } else if (empData) {
      orgData = {
        id: employerId,
        name: empData.companyName || empData.name || "My Organization",
        slug: (empData.companyName || "org").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: empData.description || "",
        logoUrl: empData.logoUrl || "",
        website: empData.website || "",
        email: empData.email || "",
        phone: empData.phone || "",
        location: empData.location || "",
        type: "employer",
        status: empData.status || "approved",
        verified: empData.verified || false,
      };
    }

    // Get jobs for this employer
    const jobsSnap = await adminDb
      .collection("jobs")
      .where("employerId", "==", employerId)
      .orderBy("createdAt", "desc")
      .get();

    const jobs = jobsSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title || "",
        slug: d.slug || doc.id,
        type: "job",
        description: (d.description || "").substring(0, 200),
        location: d.location || "",
        salary: d.salary || d.salaryRange || "",
        status: d.status || "active",
        orgId: employerId,
        orgName: d.employerName || d.company || (orgData as Record<string, unknown>)?.name || "",
        authorId: uid,
        authorName: userData.displayName || "",
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString(),
        applicationCount: 0, // TODO: count from applications collection
      };
    });

    // Get application counts per job
    for (const job of jobs) {
      try {
        const appsSnap = await adminDb
          .collection("applications")
          .where("jobId", "==", job.id)
          .get();
        job.applicationCount = appsSnap.size;
      } catch {
        // ignore
      }
    }

    // Also check for org posts (non-job)
    const postsSnap = await adminDb
      .collection("posts")
      .where("orgId", "==", employerId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const posts = postsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      applicationCount: 0,
    }));

    return NextResponse.json({
      org: orgData,
      jobs,
      posts,
      profile: {
        uid,
        email: userData.email,
        displayName: userData.displayName,
        orgId: employerId,
        orgRole: "owner",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[employer/dashboard]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
