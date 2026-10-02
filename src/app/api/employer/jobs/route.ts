import { loadEmployerJobRows } from "@/lib/server/employer-job-list";
import { normalizeHiringDetails } from "@/lib/job-hiring-details";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  EmployerApiError,
  assertOrganizationCanPublish,
  requireEmployerContext,
  requireEmployerPublishingContext,
} from "@/lib/server/employer-auth";
import {
  buildFeaturedJobSummary,
} from "@/lib/server/featured-job-entitlements";
import { preparePaidPublication } from "@/lib/server/paid-job-publication-reader";
import { firestorePublicationReader } from "@/lib/server/paid-job-publication-firestore";
import { PublicationError } from "@/lib/server/paid-job-publication";
import { jobInputLimitError } from "@/lib/server/job-input-limits";
import { isSchoolOrganization } from "@/lib/school-visibility";
import { sendAdminContentPosted } from "@/lib/email";
import { isClosingDateBeforeToday, PAST_CLOSING_DATE_MESSAGE } from "@/lib/job-closing-date";
import { refreshPublicJobs } from "@/lib/employer-job-cache";

export const runtime = "nodejs";

// The backend can invalidate a contention-aborted transaction with code 3,
// which the SDK does not retry. Restart only that exact closed-transaction case;
// business denials and all other invalid-argument errors must propagate unchanged.
async function runCreateTransaction<T>(db: Firestore, action: (tx: Transaction) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.runTransaction(action);
    } catch (error) {
      const failure = error as { code?: number; message?: string };
      if (attempt >= 2 || failure?.code !== 3 ||
        !failure.message?.includes("Transaction is invalid or closed.")) throw error;
    }
  }
}

type JobStatus = "active" | "draft" | "closed";

interface EmployerJobInput {
  durationDays?: unknown;
  hiringDetails?: unknown;
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
    hiringDetails: normalizeHiringDetails(input.hiringDetails, input),
    willTrain: normalizeHiringDetails(input.hiringDetails, input).willTrain,
    driversLicense: normalizeHiringDetails(input.hiringDetails, input).driversLicense,
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

/**
 * Expected denials (payment, placement, validation, access) are part of normal
 * use: answer them with their code and log a warning, not a runtime error.
 */
function failureResponse(error: unknown, label: string, fallback: string) {
  const status = error instanceof PublicationError ? (error.code === "payment_required" ? 402 : 409) : error instanceof EmployerApiError ? error.status : 500;
  const code = error instanceof PublicationError || error instanceof EmployerApiError ? error.code : undefined;
  const message = error instanceof Error ? error.message : fallback;
  if (status >= 500) console.error(label, error);
  else console.warn(label, status, code ?? "", message);
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });
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

    const allDocs = await loadEmployerJobRows(db, context);

    // Sort combined by createdAt desc
    allDocs.sort((a, b) => {
      const aTime = Date.parse(String(serialize(a.data.createdAt) || "")) || 0;
      const bTime = Date.parse(String(serialize(b.data.createdAt) || "")) || 0;
      return bTime - aTime;
    });

    // Build response with application counts
    const jobs = await Promise.all(
      allDocs.map(async (doc) => {
        const d = doc.data;
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

    const orgType = isSchoolOrganization(context.organizationData) || isSchoolOrganization(context.employerData)
      ? "school"
      : String(
          context.organizationData.type ||
          context.employerData.type ||
          context.employerData.orgType ||
          "employer"
        );

    return NextResponse.json({
      jobs,
      orgName:
        String(context.organizationData.name || context.employerData.name || context.employerData.companyName || ""),
      orgSlug:
        Object.keys(context.organizationData).length
          ? String(context.organizationData.slug || context.orgId)
          : String(context.employerData.slug || context.employerId),
      orgLogo:
        String(context.organizationData.logoUrl || context.organizationData.logo || context.employerData.logoUrl || ""),
      orgType,
      orgPlan: (context.organizationData.plan as string | undefined) || (context.employerData.plan as string | undefined),
      orgTier: (context.organizationData.tier as string | undefined) || (context.employerData.tier as string | undefined),
    });
  } catch (error) {
    return failureResponse(error, "[api/employer/jobs][GET]", "Failed to load jobs.");
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
    const tooLong = jobInputLimitError(body as Record<string, unknown>);
    if (tooLong) {
      return NextResponse.json({ error: `The job ${tooLong} is too long.`, field: tooLong }, { status: 400 });
    }
    // A job published with a past closing date is never visible yet would still use a paid credit.
    if (normalizeStatus(body.status) === "active" && isClosingDateBeforeToday(body.closingDate)) {
      return NextResponse.json({ error: PAST_CLOSING_DATE_MESSAGE, code: "closing_date_passed", field: "closingDate" }, { status: 400 });
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

    // Refuse publishing before any payment logic runs; drafts are always allowed.
    if (status === "active") assertOrganizationCanPublish(context);

    let nextFeaturedSummary = null;
    const publicationNow = new Date();

    await runCreateTransaction(db, async (transaction) => {

      // Client-selected slugs are not authorization to replace an existing job.
      // Read the target in the transaction so concurrent creates also conflict.
      const [existingJob, existingPost] = await Promise.all([
        transaction.get(jobRef),
        transaction.get(db.collection("posts").doc(baseSlug)),
      ]);
      if (existingJob.exists || existingPost.exists) {
        throw new EmployerApiError(409, "A job with this identifier already exists.");
      }
      const paid = await preparePaidPublication(firestorePublicationReader(db, transaction), {
        employerId: context.employerId, organizationId: context.orgId, jobId: baseSlug,
        current: null, status, featured, durationDays: body.durationDays, now: publicationNow,
      });
      if (status === 'active') transaction.set(employerRef, {
        ...paid.employerPatch, updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.create(jobRef, stripUndefined({
        ...payload,
        slug: baseSlug,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        postedAt: null,
        ...paid.jobPatch,
      }));
      nextFeaturedSummary = buildFeaturedJobSummary({
        plan: paid.paidTerm?.tier ?? 'free',
        featuredJobsUsed: paid.includedFeaturedUsed + (paid.jobPatch.featuredEntitlement === 'included_slot' ? 1 : 0),
        featuredPostCredits: Number(paid.employerPatch.featuredPostCredits ?? paid.employer.featuredPostCredits ?? 0),
      });
    });

    sendAdminContentPosted({
      contentType: "job",
      title,
      status,
      orgName: (context.organizationData.name as string) || (context.employerData.name as string) || (context.employerData.orgName as string) || null,
      authorName: (context.userData.displayName as string) || (context.memberData.displayName as string) || null,
      authorEmail: (context.userData.email as string) || (context.memberData.email as string) || (context.employerData.contactEmail as string) || null,
      id: baseSlug,
      // The employer editor is closed to admins of other organizations; drafts are reviewed in admin Jobs.
      urlPath: status === "active" ? `/jobs/${baseSlug}` : `/admin/jobs?${new URLSearchParams({ search: title })}`,
    }).catch((error) => {
      console.error("[api/employer/jobs][POST] Admin content email failed:", error);
    });
    if (status === "active") refreshPublicJobs();

    return NextResponse.json({
      success: true,
      jobId: baseSlug,
      featuredSummary: nextFeaturedSummary,
    });
  } catch (error) {
    return failureResponse(error, "[api/employer/jobs][POST]", "Failed to create job.");
  }
}
