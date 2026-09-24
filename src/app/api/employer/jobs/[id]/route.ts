import { normalizeHiringDetails } from "@/lib/job-hiring-details";
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
} from "@/lib/server/featured-job-entitlements";
import { preparePaidPublication, readPaidFeaturedSummary } from "@/lib/server/paid-job-publication-reader";
import { firestorePublicationReader } from "@/lib/server/paid-job-publication-firestore";
import { PublicationError } from "@/lib/server/paid-job-publication";

export const runtime = "nodejs";

type JobStatus = "active" | "draft" | "closed";

interface EmployerJobInput {
  durationDays?: unknown;
  hiringDetails?: unknown;
  title?: string;
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
  qualifications?: string[];
  responsibilities?: string[];
  benefits?: string[];
  badges?: string[];
  status?: JobStatus;
  featured?: boolean;
  requiresResume?: boolean;
  requiresCoverLetter?: boolean;
  requiresReferences?: boolean;
}

function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "object" && value !== null && typeof (value as Record<string, unknown>).toDate === "function") {
    return ((value as Record<string, unknown>).toDate as () => Date)().toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(serialize);
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, field]) => [key, serialize(field)])
    );
  }
  return value;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

// An explicit empty value clears optional fields; omitted fields stay unchanged.
function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as T;
}

function normalizeStatus(value: unknown): JobStatus {
  return value === "active" || value === "closed" ? value : "draft";
}



function isJobOwnedByEmployer(data: Record<string, unknown>, employerId: string, orgId: string): boolean {
  return data.employerId === employerId || data.orgId === employerId || data.orgId === orgId;
}

function isEditableEmployerJob(
  source: "jobs" | "posts",
  data: Record<string, unknown>,
  uid: string
): boolean {
  if (source === "posts") return true;
  if (data.authorId === uid) return true;
  if (data.managedBy === "employer") return true;
  if (data.source === "employer" || data.source === "dashboard") return true;
  return false;
}

async function getOwnedJobOrThrow(id: string, context: Awaited<ReturnType<typeof requireEmployerContext>>) {
  const db = getAdminDb();
  const jobSnap = await db.collection("jobs").doc(id).get();
  if (jobSnap.exists) {
    const data = (jobSnap.data() ?? {}) as Record<string, unknown>;
    if (data.status === 'deleted' || data.deletedAt || !isJobOwnedByEmployer(data, context.employerId, context.orgId)) {
      throw new EmployerApiError(404, "Job not found.");
    }
    return { ref: jobSnap.ref, data, source: "jobs" as const };
  }

  const postSnap = await db.collection("posts").doc(id).get();
  if (postSnap.exists) {
    const data = (postSnap.data() ?? {}) as Record<string, unknown>;
    if (data.status === 'deleted' || data.deletedAt || data.type !== "job" || !isJobOwnedByEmployer(data, context.employerId, context.orgId)) {
      throw new EmployerApiError(404, "Job not found.");
    }
    return { ref: postSnap.ref, data, source: "posts" as const };
  }

  throw new EmployerApiError(404, "Job not found.");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireEmployerContext(req);
    const { id } = await params;
    const db = getAdminDb();
    const job = await getOwnedJobOrThrow(id, context);

    const summaryNow=new Date();
    const featuredSummary = await db.runTransaction(tx => readPaidFeaturedSummary(firestorePublicationReader(db,tx), {employerId:context.employerId,organizationId:context.orgId,now:summaryNow}));

    return NextResponse.json({
      job: serialize({ id, ...job.data, _source: job.source }),
      readOnly: !isEditableEmployerJob(job.source, job.data, context.uid),
      featuredSummary,
    });
  } catch (error) {
    const status = error instanceof PublicationError ? (error.code === 'payment_required' ? 402 : 409) : error instanceof EmployerApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to load job.";
    console.error("[api/employer/jobs/:id][GET]", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireEmployerPublishingContext(req);
    const { id } = await params;
    const body = (await req.json()) as EmployerJobInput;
    const db = getAdminDb();
    const employerRef = db.collection("employers").doc(context.employerId);

    let nextFeaturedSummary = null;
    const publicationNow = new Date();

    await db.runTransaction(async (transaction) => {
      const jobRef = db.collection("jobs").doc(id);
      const postRef = db.collection("posts").doc(id);
      const [jobSnap, postSnap] = await Promise.all([
        transaction.get(jobRef),
        transaction.get(postRef),
      ]);

      const current = jobSnap.exists
        ? { ref: jobRef, data: (jobSnap.data() ?? {}) as Record<string, unknown>, source: "jobs" as const }
        : postSnap.exists
          ? { ref: postRef, data: (postSnap.data() ?? {}) as Record<string, unknown>, source: "posts" as const }
          : null;

      if (!current || current.data.status === 'deleted' || current.data.deletedAt || !isJobOwnedByEmployer(current.data, context.employerId, context.orgId)) {
        throw new EmployerApiError(404, "Job not found.");
      }

      if (current.source === "posts" && current.data.type !== "job") {
        throw new EmployerApiError(404, "Job not found.");
      }

      if (!isEditableEmployerJob(current.source, current.data, context.uid)) {
        throw new EmployerApiError(403, "This job is managed by an external source and cannot be edited here.");
      }


      const mirror = current.source === 'jobs' && postSnap.exists && postSnap.data()?.type === 'job' ? postSnap.data()! : null;
      if (mirror) {
        if (!isJobOwnedByEmployer(mirror, context.employerId, context.orgId)) {
          throw new EmployerApiError(409, 'Conflicting job mirror ownership requires review.');
        }
        for (const field of ['featured', 'featuredCreditConsumed']) {
          if ((mirror[field] === true) !== (current.data[field] === true)) {
            throw new EmployerApiError(409, 'Conflicting job placement mirrors require review.');
          }
        }
      }
      const requestedStatus = normalizeStatus(body.status ?? current.data.status);
      const requestedFeatured = typeof body.featured === "boolean" ? body.featured : Boolean(current.data.featured);
      const paid = await preparePaidPublication(firestorePublicationReader(db, transaction), {
        employerId: context.employerId, organizationId: context.orgId, jobId: id,
        current: current.data, status: requestedStatus, featured: requestedFeatured,
        durationDays: body.durationDays, now: publicationNow,
      });
      if (requestedStatus === 'active') transaction.set(employerRef, {
        ...paid.employerPatch, updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      const hiringDetails = body.hiringDetails === undefined ? undefined : normalizeHiringDetails(body.hiringDetails, current.data);
      const updates = stripUndefined({
        hiringDetails,
        willTrain: hiringDetails?.willTrain,
        driversLicense: hiringDetails?.driversLicense,
        title: normalizeString(body.title),
        department: normalizeString(body.department),
        category: normalizeString(body.category),
        employmentType: normalizeString(body.employmentType),
        jobType: normalizeString(body.employmentType) ?? normalizeString(body.employmentType ?? current.data.jobType),
        workLocation: normalizeString(body.workLocation),
        location: normalizeString(body.location),
        salary: normalizeString(body.salary),
        salaryRange: body.salaryRange,
        closingDate: normalizeOptionalString(body.closingDate),
        externalApplyUrl: normalizeOptionalString(body.externalApplyUrl ?? body.applicationUrl),
        applicationUrl: normalizeOptionalString(body.applicationUrl ?? body.externalApplyUrl),
        requiresResume: typeof body.requiresResume === "boolean" ? body.requiresResume : undefined,
        requiresCoverLetter: typeof body.requiresCoverLetter === "boolean" ? body.requiresCoverLetter : undefined,
        requiresReferences: typeof body.requiresReferences === "boolean" ? body.requiresReferences : undefined,
        description: normalizeString(body.description),
        qualifications: normalizeStringArray(body.qualifications),
        responsibilities: normalizeStringArray(body.responsibilities),
        benefits: normalizeStringArray(body.benefits),
        badges: normalizeStringArray(body.badges),
        featured: requestedFeatured,
        status: requestedStatus,
        active: requestedStatus === "active",
        updatedAt: FieldValue.serverTimestamp(),
        ...paid.jobPatch,
      });

      transaction.set(current.ref, updates, { merge: true });
      if (mirror) transaction.set(postRef, updates, { merge: true });

      nextFeaturedSummary = buildFeaturedJobSummary({
        plan: paid.paidTerm?.tier ?? 'free',
        featuredJobsUsed: paid.includedFeaturedUsed + (requestedStatus === 'active' && requestedFeatured && (paid.jobPatch.featuredEntitlement ?? current.data.featuredEntitlement) === 'included_slot' ? 1 : 0),
        featuredPostCredits: Number(paid.employerPatch.featuredPostCredits ?? paid.employer.featuredPostCredits ?? 0),
      });
    });

    return NextResponse.json({ success: true, featuredSummary: nextFeaturedSummary });
  } catch (error) {
    const status = error instanceof PublicationError ? (error.code === 'payment_required' ? 402 : 409) : error instanceof EmployerApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to update job.";
    console.error("[api/employer/jobs/:id][PUT]", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireEmployerPublishingContext(req);
    const { id } = await params;
    const job = await getOwnedJobOrThrow(id, context);

    if (!isEditableEmployerJob(job.source, job.data, context.uid)) {
      return NextResponse.json(
        { error: "This job is managed by an external source and cannot be deleted here." },
        { status: 403 }
      );
    }

    const db = getAdminDb();
    await db.runTransaction(async transaction => {
      const jobRef = db.collection('jobs').doc(id);
      const postRef = db.collection('posts').doc(id);
      const [canonical, mirror] = await Promise.all([transaction.get(jobRef), transaction.get(postRef)]);
      const current = canonical.exists ? canonical : mirror;
      const data = current.data();
      const source = canonical.exists ? 'jobs' : 'posts';
      if (!data || data.status === 'deleted' || data.deletedAt || (source === 'posts' && data.type !== 'job') || !isJobOwnedByEmployer(data,context.employerId,context.orgId)) throw new EmployerApiError(404,'Job not found.');
      if (!isEditableEmployerJob(source,data,context.uid)) throw new EmployerApiError(403,'This job cannot be deleted here.');
      const patch = {active:false,status:'deleted',deletedAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()};
      if (canonical.exists) transaction.update(jobRef,patch);
      else transaction.create(jobRef,{...patch,employerId:context.employerId,orgId:context.orgId,createdAt:FieldValue.serverTimestamp()});
      if (mirror.exists && mirror.data()?.type === 'job' && isJobOwnedByEmployer(mirror.data()!,context.employerId,context.orgId)) transaction.update(postRef,patch);
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const status = error instanceof PublicationError ? (error.code === 'payment_required' ? 402 : 409) : error instanceof EmployerApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to delete job.";
    console.error("[api/employer/jobs/:id][DELETE]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
