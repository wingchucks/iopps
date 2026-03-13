import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  EmployerApiError,
  requireEmployerContext,
  requireEmployerPublishingContext,
} from "@/lib/server/employer-auth";
import {
  buildFeaturedJobSummary,
  evaluateFeaturedActivation,
} from "@/lib/server/featured-job-entitlements";

export const runtime = "nodejs";

type JobStatus = "active" | "draft" | "closed";

interface EmployerJobInput {
  title?: string;
  slug?: string;
  department?: string;
  category?: string;
  employmentType?: string;
  workLocation?: string;
  location?: string;
  salary?: string;
  salaryRange?: Record<string, unknown>;
  closingDate?: string;
  externalApplyUrl?: string;
  applicationUrl?: string;
  description?: string;
  responsibilities?: string[];
  qualifications?: string[];
  benefits?: string[];
  indigenousPreference?: boolean;
  indigenousPreferenceLevel?: string;
  communityTags?: string[];
  willTrain?: boolean;
  driversLicense?: boolean;
  featured?: boolean;
  requiresResume?: boolean;
  requiresCoverLetter?: boolean;
  requiresReferences?: boolean;
  status?: JobStatus;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .replace(/-{2,}/g, "-");
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as T;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
  return normalized.length ? normalized : [];
}

function normalizeStatus(value: unknown): JobStatus {
  return value === "active" || value === "closed" ? value : "draft";
}

function isActiveFeaturedJob(data: Record<string, unknown>): boolean {
  return Boolean(data.featured) && (data.active === true || data.status === "active");
}

function buildJobPayload(input: EmployerJobInput, authorContext: { uid: string; employerId: string; orgId: string; orgName?: string; orgShort?: string }) {
  const status = normalizeStatus(input.status);
  const featured = Boolean(input.featured);

  const payload = stripUndefined({
    title: normalizeString(input.title),
    slug: normalizeString(input.slug),
    department: normalizeString(input.department),
    category: normalizeString(input.category),
    employmentType: normalizeString(input.employmentType),
    jobType: normalizeString(input.employmentType),
    workLocation: normalizeString(input.workLocation),
    location: normalizeString(input.location),
    salary: normalizeString(input.salary),
    salaryRange: input.salaryRange,
    closingDate: normalizeString(input.closingDate),
    externalApplyUrl: normalizeString(input.externalApplyUrl ?? input.applicationUrl),
    applicationUrl: normalizeString(input.applicationUrl ?? input.externalApplyUrl),
    description: normalizeString(input.description),
    responsibilities: normalizeStringArray(input.responsibilities),
    qualifications: normalizeStringArray(input.qualifications),
    benefits: normalizeStringArray(input.benefits),
    indigenousPreference: Boolean(input.indigenousPreference),
    indigenousPreferenceLevel: normalizeString(input.indigenousPreferenceLevel),
    communityTags: normalizeStringArray(input.communityTags),
    willTrain: Boolean(input.willTrain),
    driversLicense: Boolean(input.driversLicense),
    featured,
    requiresResume: input.requiresResume !== false,
    requiresCoverLetter: Boolean(input.requiresCoverLetter),
    requiresReferences: Boolean(input.requiresReferences),
    status,
    active: status === "active",
    employerId: authorContext.employerId,
    orgId: authorContext.orgId,
    orgName: authorContext.orgName,
    orgShort: authorContext.orgShort,
    authorId: authorContext.uid,
    source: "employer",
    managedBy: "employer",
  });

  return { payload, status, featured };
}

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).toDate === "function") {
    return ((value as Record<string, unknown>).toDate as () => Date)().toISOString();
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serialize(v)])
    );
  }
  return value;
}

export async function GET(req: NextRequest) {
  try {
    const context = await requireEmployerContext(req);
    const db = getAdminDb();

    // Query both employerId and orgId matches
    const jobsByEmployer = await db
      .collection("jobs")
      .where("employerId", "==", context.employerId)
      .orderBy("createdAt", "desc")
      .get();

    const jobIds = new Set(jobsByEmployer.docs.map((doc) => doc.id));
    const allDocs = [...jobsByEmployer.docs];

    if (context.orgId && context.orgId !== context.employerId) {
      const jobsByOrg = await db
        .collection("jobs")
        .where("orgId", "==", context.orgId)
        .orderBy("createdAt", "desc")
        .get();
      for (const doc of jobsByOrg.docs) {
        if (!jobIds.has(doc.id)) {
          allDocs.push(doc);
          jobIds.add(doc.id);
        }
      }
    }

    // Sort combined by createdAt desc
    allDocs.sort((a, b) => {
      const aTime = a.data().createdAt?.toMillis?.() ?? 0;
      const bTime = b.data().createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });

    // Build response with application counts
    const jobs = await Promise.all(
      allDocs.map(async (doc) => {
        const d = doc.data();
        let applicationCount = 0;
        try {
          const appsSnap = await db
            .collection("applications")
            .where("jobId", "==", doc.id)
            .get();
          applicationCount = appsSnap.size;
        } catch { /* ignore */ }

        return serialize({
          id: doc.id,
          title: d.title || "",
          slug: d.slug || doc.id,
          location: d.location || "",
          employmentType: d.employmentType || d.jobType || "",
          salary: d.salary || "",
          status: d.status || "active",
          active: d.active ?? true,
          featured: Boolean(d.featured),
          closingDate: d.closingDate || null,
          createdAt: d.createdAt || null,
          applicationCount,
          employerName: d.employerName || d.orgName || "",
        });
      })
    );

    return NextResponse.json({ jobs });
  } catch (error) {
    const status = error instanceof EmployerApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to load jobs.";
    console.error("[api/employer/jobs][GET]", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireEmployerPublishingContext(req);
    const body = (await req.json()) as EmployerJobInput;
    const title = normalizeString(body.title);

    if (!title) {
      return NextResponse.json({ error: "Job title is required." }, { status: 400 });
    }

    const db = getAdminDb();
    const baseSlug = normalizeString(body.slug) || `${slugify(title)}-${Date.now().toString(36)}`;
    const employerRef = db.collection("employers").doc(context.employerId);
    const jobRef = db.collection("jobs").doc(baseSlug);

    const { payload, status, featured } = buildJobPayload(body, {
      uid: context.uid,
      employerId: context.employerId,
      orgId: context.orgId,
      orgName: (context.organizationData.name as string) || (context.employerData.name as string) || (context.employerData.orgName as string),
      orgShort: (context.organizationData.shortName as string) || (context.organizationData.short as string) || undefined,
    });

    let nextFeaturedSummary = null;

    await db.runTransaction(async (transaction) => {
      const [employerSnap, jobsSnap, postsSnap] = await Promise.all([
        transaction.get(employerRef),
        transaction.get(db.collection("jobs").where("employerId", "==", context.employerId)),
        transaction.get(db.collection("posts").where("orgId", "==", context.employerId)),
      ]);

      const employerData = employerSnap.data() ?? {};
      const activeFeaturedCount = [
        ...jobsSnap.docs.map((doc) => doc.data()),
        ...postsSnap.docs.map((doc) => doc.data()).filter((doc) => doc.type === "job"),
      ].filter((doc) => isActiveFeaturedJob(doc as Record<string, unknown>)).length;

      const featuredSummary = buildFeaturedJobSummary({
        plan: employerData.plan as string | undefined,
        subscriptionTier: employerData.subscriptionTier as string | undefined,
        featuredJobsUsed: activeFeaturedCount,
        featuredPostCredits: employerData.featuredPostCredits as number | undefined,
      });

      const decision = evaluateFeaturedActivation({
        requestedActiveFeatured: featured && status === "active",
        existingActiveFeatured: false,
        existingFeaturedCreditConsumed: false,
        activeFeaturedCountExcludingCurrent: activeFeaturedCount,
        summary: featuredSummary,
      });

      if (!decision.allowed) {
        throw new EmployerApiError(400, decision.reason || "This job cannot be featured.");
      }

      if (decision.consumeCredit) {
        const currentCredits = Math.max(0, Number(employerData.featuredPostCredits ?? 0) || 0);
        transaction.set(employerRef, {
          featuredPostCredits: currentCredits - 1,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      transaction.set(jobRef, stripUndefined({
        ...payload,
        slug: baseSlug,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        postedAt: status === "active" ? FieldValue.serverTimestamp() : null,
        featuredCreditConsumed: decision.consumeCredit,
        featuredCreditConsumedAt: decision.consumeCredit ? FieldValue.serverTimestamp() : undefined,
      }));

      nextFeaturedSummary = buildFeaturedJobSummary({
        plan: employerData.plan as string | undefined,
        subscriptionTier: employerData.subscriptionTier as string | undefined,
        featuredJobsUsed: activeFeaturedCount + (featured && status === "active" ? 1 : 0),
        featuredPostCredits: (Number(employerData.featuredPostCredits ?? 0) || 0) - (decision.consumeCredit ? 1 : 0),
      });
    });

    return NextResponse.json({
      success: true,
      jobId: baseSlug,
      featuredSummary: nextFeaturedSummary,
    });
  } catch (error) {
    const status = error instanceof EmployerApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to create job.";
    console.error("[api/employer/jobs][POST]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
