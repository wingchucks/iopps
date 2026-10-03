import { apiRequest, ApiError } from "./api";
import type { ApplicationStatus, JobPosting, MemberApplication } from "../types";

// Jobs and applications are server-only under firestore.rules, so the app uses the
// website's APIs (src/app/api/jobs and src/app/api/applications), as the site does.

type Raw = Record<string, unknown>;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const record = (value: unknown): Raw => (value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : {});
const firstText = (...values: unknown[]) => values.map(text).find(Boolean) ?? "";
const list = (value: unknown): string[] | undefined => {
  const items = Array.isArray(value)
    ? value.map(text)
    : typeof value === "string"
    ? value.split(/\r?\n/).map((line) => line.replace(/^[-•*]\s*/, "").trim())
    : [];
  const kept = items.filter(Boolean);
  return kept.length ? kept : undefined;
};

export type ApplicationDestination =
  | { kind: "internal" }
  | { kind: "external"; href: string }
  | { kind: "email"; email: string }
  | { kind: "unavailable" };

const EMAIL = /^[^\s@?]+@[^\s@?]+\.[^\s@?]+$/;
const DOMAIN_LIKE = /^(?:www\.)?[^\s/]+\.[^\s/]{2,}(?:[/?#].*)?$/i;

/**
 * Where a job takes applications, with the website's rules (resolveApplicationDestination in
 * src/lib/application-destination.ts): no link, or an email link on an employer's job,
 * means an IOPPS application.
 */
export function applicationDestination(job: Raw): ApplicationDestination {
  const raw = firstText(job.applicationUrl, job.applicationLink, job.externalUrl, job.externalApplyUrl);
  if (!raw) return { kind: "internal" };
  const href = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw
    : EMAIL.test(raw) ? `mailto:${raw}`
    : DOMAIN_LIKE.test(raw) ? `https://${raw}`
    : raw;
  const mail = /^mailto:([^?]+)(?:\?.*)?$/i.exec(href);
  if (mail && EMAIL.test(mail[1])) {
    return job.orgId || job.employerId ? { kind: "internal" } : { kind: "email", email: mail[1] };
  }
  try {
    const url = new URL(href);
    if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname && !url.username && !url.password) {
      return { kind: "external", href: url.href };
    }
  } catch {
    // An invalid destination is unavailable, never an IOPPS application.
  }
  return { kind: "unavailable" };
}

/** The website's salary label (e.g. "$23.00–$27.75 / hour"), else the stored range. */
function salaryOf(job: Raw): JobPosting["salaryRange"] {
  const label = text(job.salary);
  if (label) return label;
  const range = job.salaryRange;
  if (range && typeof range === "object" && !Array.isArray(range)) {
    const { min, max, currency, disclosed } = range as Raw;
    if (disclosed === false) return { disclosed: false };
    if (typeof min === "number" || typeof max === "number") {
      return {
        ...(typeof min === "number" ? { min } : {}),
        ...(typeof max === "number" ? { max } : {}),
        ...(typeof currency === "string" ? { currency } : {}),
      };
    }
  }
  return text(range) || undefined;
}

/** A job from the website's API in the shape the app's screens show. */
export function toJobPosting(job: Raw): JobPosting {
  const destination = applicationDestination(job);
  const workLocation = text(job.workLocation).toLowerCase();
  return {
    id: text(job.id),
    employerId: firstText(job.employerId, job.orgId) || undefined,
    employerName: firstText(job.employerName, job.orgName, job.companyName),
    title: text(job.title),
    location: text(job.location),
    employmentType: firstText(job.employmentType, job.jobType),
    remoteFlag: job.remoteFlag === true || job.remote === true || workLocation === "remote",
    indigenousPreference: job.indigenousPreference === true,
    quickApplyEnabled: destination.kind === "internal",
    salaryRange: salaryOf(job),
    closingDate: firstText(job.closingDate, job.deadline) || undefined,
    description: text(job.description),
    responsibilities: list(job.responsibilities),
    qualifications: list(job.qualifications) ?? list(job.requirements),
    applicationLink: destination.kind === "external" ? destination.href : undefined,
    applicationEmail: destination.kind === "email" ? destination.email : undefined,
    requiresResume: job.requiresResume === true,
    requiresCoverLetter: job.requiresCoverLetter === true,
    requiresReferences: job.requiresReferences === true,
    active: true,
    featured: job.featured === true,
    createdAt: firstText(job.createdAt, job.publishedAt, job.postedAt) || null,
  };
}

/** Open jobs, newest first. */
export async function listJobs(limit = 200): Promise<JobPosting[]> {
  const { jobs } = await apiRequest<{ jobs?: unknown }>(`/api/jobs?limit=${limit}`);
  return (Array.isArray(jobs) ? jobs : [])
    .map((job) => toJobPosting(record(job)))
    .filter((job) => job.id && job.title);
}

/** One job by ID or slug, closed jobs included (active: false); null when it is gone. */
export async function getJob(id: string): Promise<JobPosting | null> {
  try {
    const { job, closed } = await apiRequest<{ job?: Raw; closed?: unknown }>(`/api/jobs/${encodeURIComponent(id)}`);
    return job ? { ...toJobPosting(job), active: !closed } : null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

const STATUSES: ApplicationStatus[] = ["submitted", "reviewing", "shortlisted", "interview", "offered", "rejected", "withdrawn"];

export function applicationStatus(value: unknown): ApplicationStatus {
  return STATUSES.includes(value as ApplicationStatus) ? (value as ApplicationStatus) : "submitted";
}

/** The signed-in member's applications, newest first. */
export async function listMyApplications(): Promise<MemberApplication[]> {
  const { applications } = await apiRequest<{ applications?: unknown }>("/api/applications", { signedIn: true });
  return (Array.isArray(applications) ? applications : []).map((item) => {
    const application = record(item);
    return {
      id: text(application.id),
      jobId: text(application.postId),
      jobTitle: text(application.postTitle),
      employerName: text(application.orgName),
      status: applicationStatus(application.status),
      appliedAt: application.appliedAt ?? null,
      updatedAt: application.updatedAt ?? null,
    };
  });
}

export interface ApplyInput {
  /** Attach the resume saved on the member's IOPPS profile. */
  useProfileResume: boolean;
  coverLetter: string;
  references: string;
}

/**
 * Applies to a job as the signed-in member. Applying again returns the original
 * application with created: false. Failures throw ApiError with the website's message.
 */
export async function applyToJob(jobId: string, input: ApplyInput): Promise<{ created: boolean }> {
  const result = await apiRequest<{ created?: unknown }>("/api/applications", {
    method: "POST",
    signedIn: true,
    body: {
      postId: jobId,
      resumeType: input.useProfileResume ? "profile" : "file",
      resumeUrl: "",
      coverLetter: input.coverLetter,
      references: input.references,
    },
  });
  if (result.created === true) {
    // As on the website, the employer is emailed by a separate request; the application
    // is saved either way.
    await apiRequest("/api/applications/notify", { method: "POST", signedIn: true, body: { postId: jobId } }).catch(
      () => undefined
    );
  }
  return { created: result.created === true };
}
