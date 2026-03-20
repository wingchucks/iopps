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
  department?: string;
  category?: string;
  employmentType?: string;
  workLocation?: string;
  location?: string;
  salary?: string;
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

function isActiveFeaturedJob(data: Record<string, unknown>): boolean {
  return Boolean(data.featured) && (data.active === true || data.status === "active");
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
    if (!isJobOwnedByEmployer(data, context.employerId, context.orgId)) {
      throw new EmployerApiError(404, "Job not found.");
    }
    return { ref: jobSnap.ref, data, source: "jobs" as const };
  }

  const postSnap = await db.collection("posts").doc(id).get();
  if (postSnap.exists) {
    const data = (postSnap.data() ?? {}) as Record<string, unknown>;
    if (data.type !== "job" || !isJobOwnedByEmployer(data, context.employerId, context.orgId)) {
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

    const [jobsSnap, postsSnap] = await Promise.all([
      db.collection("jobs").where("employerId", "==", context.employerId).get(),
      db.collection("posts").where("orgId", "==", context.employerId).get(),
    ]);

    const activeFeaturedCount = [
      ...jobsSnap.docs.map((doc) => doc.data()),
      ...postsSnap.docs.map((doc) => doc.data()).filter((doc) => doc.type === "job"),
    ].filter((doc) => isActiveFeaturedJob(doc as Record<string, unknown>)).length;

    const featuredSummary = buildFeaturedJobSummary({
      plan: context.employerData.plan as string | undefined,
      subscriptionTier: context.employerData.subscriptionTier as string | undefined,
      featuredJobsUsed: activeFeaturedCount,
      featuredPostCredits: context.employerData.featuredPostCredits as number | undefined,
    });

    return NextResponse.json({
      job: serialize({ id, ...job.data, _source: job.source }),
      readOnly: !isEditableEmployerJob(job.source, job.data, context.uid),
      featuredSummary,
    });
  } catch (error) {
    const status = error instanceof EmployerApiError ? error.status : 500;
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

    await db.runTransaction(async (transaction) => {
      const jobRef = db.collection("jobs").doc(id);
      const postRef = db.collection("posts").doc(id);
      const [jobSnap, postSnap, employerSnap, jobsSnap, postsSnap] = await Promise.all([
        transaction.get(jobRef),
        transaction.get(postRef),
        transaction.get(employerRef),
        transaction.get(db.collection("jobs").where("employerId", "==", context.employerId)),
        transaction.get(db.collection("posts").where("orgId", "==", context.employerId)),
      ]);

      const current = jobSnap.exists
        ? { ref: jobRef, data: (jobSnap.data() ?? {}) as Record<string, unknown>, source: "jobs" as const }
        : postSnap.exists
          ? { ref: postRef, data: (postSnap.data() ?? {}) as Record<string, unknown>, source: "posts" as const }
          : null;

      if (!current || !isJobOwnedByEmployer(current.data, context.employerId, context.orgId)) {
        throw new EmployerApiError(404, "Job not found.");
      }

      if (current.source === "posts" && current.data.type !== "job") {
        throw new EmployerApiError(404, "Job not found.");
      }

      if (!isEditableEmployerJob(current.source, current.data, context.uid)) {
        throw new EmployerApiError(403, "This job is managed by an external source and cannot be edited here.");
      }

      const employerData = employerSnap.data() ?? {};
      const activeFeaturedJobs = [
        ...jobsSnap.docs.map((doc) => ({ id: doc.id, source: "jobs" as const, data: doc.data() })),
        ...postsSnap.docs
          .map((doc) => ({ id: doc.id, source: "posts" as const, data: doc.data() }))
          .filter((doc) => doc.data.type === "job"),
      ].filter((doc) => isActiveFeaturedJob(doc.data as Record<string, unknown>));

      const activeFeaturedCountExcludingCurrent = activeFeaturedJobs.filter(
        (doc) => !(doc.id === id && doc.source === current.source)
      ).length;

      const featuredSummary = buildFeaturedJobSummary({
        plan: employerData.plan as string | undefined,
        subscriptionTier: employerData.subscriptionTier as string | undefined,
        featuredJobsUsed: activeFeaturedJobs.length,
        featuredPostCredits: employerData.featuredPostCredits as number | undefined,
      });

      const requestedStatus = normalizeStatus(body.status ?? current.data.status);
      const requestedFeatured = typeof body.featured === "boolean" ? body.featured : Boolean(current.data.featured);
      const existingActiveFeatured = isActiveFeaturedJob(current.data);

      const decision = evaluateFeaturedActivation({
        requestedActiveFeatured: requestedFeatured && requestedStatus === "active",
        existingActiveFeatured,
        existingFeaturedCreditConsumed: Boolean(current.data.featuredCreditConsumed),
        activeFeaturedCountExcludingCurrent,
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

      const updates = stripUndefined({
        title: normalizeString(body.title),
        department: normalizeString(body.department),
        category: normalizeString(body.category),
        employmentType: normalizeString(body.employmentType),
        jobType: normalizeString(body.employmentType) ?? normalizeString(body.employmentType ?? current.data.jobType),
        workLocation: normalizeString(body.workLocation),
        location: normalizeString(body.location),
        salary: normalizeString(body.salary),
        closingDate: normalizeString(body.closingDate),
        externalApplyUrl: normalizeString(body.externalApplyUrl ?? body.applicationUrl),
        applicationUrl: normalizeString(body.applicationUrl ?? body.externalApplyUrl),
        description: normalizeString(body.description),
        qualifications: normalizeStringArray(body.qualifications),
        responsibilities: normalizeStringArray(body.responsibilities),
        benefits: normalizeStringArray(body.benefits),
        badges: normalizeStringArray(body.badges),
        featured: requestedFeatured,
        status: requestedStatus,
        active: requestedStatus === "active",
        updatedAt: FieldValue.serverTimestamp(),
        postedAt: requestedStatus === "active" && !current.data.postedAt ? FieldValue.serverTimestamp() : current.data.postedAt,
        featuredCreditConsumed: Boolean(current.data.featuredCreditConsumed) || decision.consumeCredit,
        featuredCreditConsumedAt: !current.data.featuredCreditConsumed && decision.consumeCredit
          ? FieldValue.serverTimestamp()
          : current.data.featuredCreditConsumedAt,
      });

      transaction.set(current.ref, updates, { merge: true });

      const nextFeaturedCount = activeFeaturedCountExcludingCurrent + (requestedFeatured && requestedStatus === "active" ? 1 : 0);
      nextFeaturedSummary = buildFeaturedJobSummary({
        plan: employerData.plan as string | undefined,
        subscriptionTier: employerData.subscriptionTier as string | undefined,
        featuredJobsUsed: nextFeaturedCount,
        featuredPostCredits: (Number(employerData.featuredPostCredits ?? 0) || 0) - (decision.consumeCredit ? 1 : 0),
      });
    });

    return NextResponse.json({ success: true, featuredSummary: nextFeaturedSummary });
  } catch (error) {
    const status = error instanceof EmployerApiError ? error.status : 500;
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

    await job.ref.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    const status = error instanceof EmployerApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Failed to delete job.";
    console.error("[api/employer/jobs/:id][DELETE]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
