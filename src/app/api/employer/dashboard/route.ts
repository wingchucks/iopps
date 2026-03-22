import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildFeaturedJobSummary } from "@/lib/server/featured-job-entitlements";
import { EmployerApiError, requireEmployerContext } from "@/lib/server/employer-auth";
import { normalizeOrganizationRecord } from "@/lib/organization-profile";
import { isSchoolOrganization } from "@/lib/school-visibility";

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).toDate === "function"
  ) {
    return ((value as Record<string, unknown>).toDate as () => Date)().toISOString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = serialize(entry);
    }
    return result;
  }
  return value;
}

function inferOrganizationType(
  orgData: Record<string, unknown> | null,
  employerData: Record<string, unknown> | null,
): string {
  if (isSchoolOrganization(orgData) || isSchoolOrganization(employerData)) {
    return "school";
  }

  const explicitType = text(orgData?.type) || text(employerData?.type) || text(employerData?.orgType);
  return explicitType || "employer";
}

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
        type: inferOrganizationType(null, empData),
        status: typeof empData.status === "string" ? empData.status : "approved",
        verified: empData.verified === true,
      };
    }

    if (orgData) {
      orgData.type = inferOrganizationType(orgData, empData);
      orgData = normalizeOrganizationRecord(orgData);
    }

    const isSchoolDashboard = isSchoolOrganization(orgData);

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

    const schoolPrograms = posts
      .filter((post) => post.type === "program" && post.status !== "closed")
      .map((post) => serialize(post) as Record<string, unknown>);

    let studentInquiries: Array<Record<string, unknown>> = [];

    if (isSchoolDashboard) {
      const ownerIds = Array.from(new Set([context.orgId, employerId, memberOrgId].filter(Boolean))) as string[];
      const inquiryCollections = ["student_inquiries", "school_inquiries"];

      const inquirySnapshots = await Promise.all(
        inquiryCollections.map(async (collectionName) => {
          try {
            return await adminDb.collection(collectionName).limit(200).get();
          } catch {
            return null;
          }
        }),
      );

      const seenInquiryIds = new Set<string>();
      studentInquiries = inquirySnapshots
        .flatMap((snap) => (snap ? snap.docs : []))
        .map((doc) => serialize({ id: doc.id, ...doc.data() }) as Record<string, unknown>)
        .filter((inquiry) => {
          const inquiryId = text(inquiry.id);
          if (!inquiryId || seenInquiryIds.has(inquiryId)) return false;

          const linkedIds = [
            text(inquiry.schoolId),
            text(inquiry.orgId),
            text(inquiry.organizationId),
            text(inquiry.employerId),
          ].filter(Boolean);

          const matchesOwner = linkedIds.some((linkedId) => ownerIds.includes(linkedId));
          if (!matchesOwner) return false;

          seenInquiryIds.add(inquiryId);
          return true;
        })
        .sort((left, right) => {
          const rightDate = Date.parse(text(right.createdAt) || text(right.updatedAt) || "");
          const leftDate = Date.parse(text(left.createdAt) || text(left.updatedAt) || "");
          return (Number.isNaN(rightDate) ? 0 : rightDate) - (Number.isNaN(leftDate) ? 0 : leftDate);
        });
    }

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
      schoolPrograms,
      studentInquiries,
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
