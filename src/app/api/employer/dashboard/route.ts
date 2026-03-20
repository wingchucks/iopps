import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildFeaturedJobSummary } from "@/lib/server/featured-job-entitlements";
import { EmployerApiError, requireEmployerContext } from "@/lib/server/employer-auth";

export async function GET(req: NextRequest) {
  try {
    const context = await requireEmployerContext(req);
    const adminDb = getAdminDb();

    const uid = context.uid;
    const userData = context.userData;
    const employerId = context.employerId;
    const memberOrgId = context.orgId;
    const empData = Object.keys(context.employerData).length ? context.employerData : null;

    let orgData: Record<string, unknown> | null =
      Object.keys(context.organizationData).length
        ? { id: context.orgId, ...context.organizationData }
        : null;

    if (!orgData && empData) {
      const companyName =
        typeof empData.companyName === "string" && empData.companyName
          ? empData.companyName
          : typeof empData.name === "string" && empData.name
            ? empData.name
            : "My Organization";

      orgData = {
        id: employerId,
        name: companyName,
        slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: typeof empData.description === "string" ? empData.description : "",
        logoUrl: typeof empData.logoUrl === "string" ? empData.logoUrl : "",
        website: typeof empData.website === "string" ? empData.website : "",
        email: typeof empData.email === "string" ? empData.email : "",
        phone: typeof empData.phone === "string" ? empData.phone : "",
        location: typeof empData.location === "string" ? empData.location : "",
        type: "employer",
        status: typeof empData.status === "string" ? empData.status : "approved",
        verified: empData.verified === true,
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
        featured: Boolean(d.featured),
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

    const posts: Array<Record<string, unknown> & { id: string; applicationCount: number }> = postsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      applicationCount: 0,
    }));

    const activeFeaturedCount =
      jobs.filter((job) => job.status === "active" && job.featured).length +
      posts.filter((post) => post.type === "job" && post.status === "active" && post.featured).length;

    const orgPlan =
      orgData && typeof (orgData as Record<string, unknown>).plan === "string"
        ? ((orgData as Record<string, unknown>).plan as string)
        : undefined;

    const featuredSummary = buildFeaturedJobSummary({
      plan: (empData?.plan as string | undefined) || orgPlan,
      subscriptionTier: empData?.subscriptionTier as string | undefined,
      featuredJobsUsed: activeFeaturedCount,
      featuredPostCredits: empData?.featuredPostCredits as number | undefined,
    });

    return NextResponse.json({
      org: orgData,
      employer: empData ? { id: employerId, ...empData, featuredSummary } : { id: employerId, featuredSummary },
      jobs,
      posts,
      featuredSummary,
      profile: {
        uid,
        email: userData.email,
        displayName: userData.displayName,
        orgId: memberOrgId || employerId,
        orgRole: context.orgRole,
      },
    });
  } catch (err: unknown) {
    const status = err instanceof EmployerApiError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[employer/dashboard]", message);
    return NextResponse.json({ error: message }, { status });
  }
}
