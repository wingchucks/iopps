import { apiRequest } from "./api";
import { applicationStatus } from "./jobs";
import { toDate } from "./dates";
import type { ApplicationStatus, EmployerApplication, EmployerJob } from "../types";

// Employer jobs and applications come from the website's employer APIs
// (src/app/api/employer), which check the organization role the same way for both.
// Reviewing applications needs an organization owner or admin; other team members
// get "Hiring manager access required" (403).

type Raw = Record<string, unknown>;

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const firstText = (...values: unknown[]) => values.map(text).find(Boolean) ?? "";
const record = (value: unknown): Raw => (value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : {});

/** Statuses an employer can set; only the applicant can withdraw. */
export const EMPLOYER_STATUSES: Exclude<ApplicationStatus, "withdrawn">[] = [
  "submitted",
  "reviewing",
  "shortlisted",
  "interview",
  "offered",
  "rejected",
];

/** The organization's jobs, drafts and closed jobs included, newest first. */
export async function listEmployerJobs(): Promise<EmployerJob[]> {
  const { jobs } = await apiRequest<{ jobs?: unknown }>("/api/employer/jobs", { signedIn: true });
  return (Array.isArray(jobs) ? jobs : []).map((item) => {
    const job = record(item);
    const status = text(job.status) || (job.active === false ? "closed" : "active");
    return {
      id: text(job.id),
      title: text(job.title),
      location: text(job.location),
      employmentType: text(job.employmentType),
      salary: text(job.salary),
      status,
      active: status === "active",
      featured: job.featured === true,
      closingDate: text(job.closingDate),
      createdAt: job.createdAt ?? null,
      applicationCount: typeof job.applicationCount === "number" ? job.applicationCount : 0,
    };
  });
}

function toEmployerApplication(application: Raw, profiles: Raw, jobs: Raw): EmployerApplication {
  const applicantId = text(application.userId);
  // What the applicant shared when applying, then their current member profile.
  const snapshot = record(application.profileSnapshot);
  const profile = record(profiles[applicantId]);
  const jobId = firstText(application.postId, application.jobId);
  return {
    id: text(application.id),
    jobId,
    jobTitle: firstText(application.postTitle, record(jobs[jobId]).title),
    applicantId,
    applicantName: firstText(snapshot.displayName, profile.displayName),
    applicantEmail: firstText(snapshot.email, profile.email),
    applicantLocation: firstText(snapshot.location, profile.location),
    applicantHeadline: firstText(snapshot.headline, profile.headline),
    status: applicationStatus(application.status),
    resumeUrl: text(application.resumeUrl),
    resumeFileName: text(application.resumeFileName),
    coverLetter: text(application.coverLetter),
    references: text(application.references),
    appliedAt: application.appliedAt ?? null,
    updatedAt: application.updatedAt ?? null,
  };
}

export interface EmployerApplicationsPage {
  applications: EmployerApplication[];
  /** Pass to the next call for the following page; null on the last page. */
  nextCursor: string | null;
}

/** One page (up to 200) of applications to the organization's jobs. */
export async function listEmployerApplications(cursor?: string | null): Promise<EmployerApplicationsPage> {
  const data = await apiRequest<{ applications?: unknown; hasMore?: unknown; nextCursor?: unknown; profiles?: unknown; jobs?: unknown }>(
    `/api/employer/applications${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    { signedIn: true }
  );
  const profiles = record(data.profiles);
  const jobs = record(data.jobs);
  return {
    applications: (Array.isArray(data.applications) ? data.applications : []).map((item) =>
      toEmployerApplication(record(item), profiles, jobs)
    ),
    nextCursor: data.hasMore === true && typeof data.nextCursor === "string" ? data.nextCursor : null,
  };
}

const MAX_PAGES = 10;

/** Every application to the organization's jobs (up to 2,000), newest first. */
export async function listAllEmployerApplications(): Promise<EmployerApplication[]> {
  const applications: EmployerApplication[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result: EmployerApplicationsPage = await listEmployerApplications(cursor);
    applications.push(...result.applications);
    if (!result.nextCursor) break;
    cursor = result.nextCursor;
  }
  const time = (value: unknown) => toDate(value)?.getTime() ?? 0;
  return applications.sort((a, b) => time(b.appliedAt) - time(a.appliedAt));
}

/** One application to the organization's jobs, or null. */
export async function getEmployerApplication(applicationId: string): Promise<EmployerApplication | null> {
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result: EmployerApplicationsPage = await listEmployerApplications(cursor);
    const found = result.applications.find((application) => application.id === applicationId);
    if (found || !result.nextCursor) return found ?? null;
    cursor = result.nextCursor;
  }
  return null;
}

export async function updateApplicationStatus(
  applicationId: string,
  status: Exclude<ApplicationStatus, "withdrawn">
): Promise<void> {
  await apiRequest("/api/employer/applications", { method: "PUT", signedIn: true, body: { appId: applicationId, status } });
}
