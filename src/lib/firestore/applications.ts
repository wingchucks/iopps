import { auth } from "../firebase";

export type ApplicationStatus =
  | "submitted"
  | "reviewing"
  | "shortlisted"
  | "interview"
  | "offered"
  | "rejected"
  | "withdrawn";

export interface StatusHistoryEntry {
  status: ApplicationStatus;
  timestamp: unknown;
  note?: string;
}

export interface Application {
  coverLetter?: string;
  references?: string;
  resumeUrl?: string;
  profileSnapshot?: Partial<import("./members").MemberProfile> & { capturedAt?: string };
  id: string;
  userId: string;
  postId: string;
  postTitle: string;
  orgName: string;
  status: ApplicationStatus;
  statusHistory: StatusHistoryEntry[];
  reviewerNote?: string;
  appliedAt: unknown;
  updatedAt?: unknown;
}

async function requestApplications(path: string, method = "GET", body?: Record<string, unknown>) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to view applications");
  const response = await fetch(path, {
    method, headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
    cache: "no-store", ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Unable to update applications");
  return data;
}

export async function getApplications(userId: string): Promise<Application[]> {
  if (auth.currentUser?.uid !== userId) throw new Error("Sign in to view your applications");
  return (await requestApplications("/api/applications")).applications;
}

export async function getApplicationById(appId: string): Promise<Application | null> {
  return (await requestApplications("/api/applications?appId=" + encodeURIComponent(appId))).application;
}

export async function getApplicantReceipt(postId: string): Promise<Record<string, unknown> | null> {
  return (await requestApplications("/api/applications?postId=" + encodeURIComponent(postId))).application;
}

export async function getApplicationsByPost(postId: string): Promise<Application[]> {
  const result = await requestApplications("/api/employer/applications");
  return result.applications.filter((item: Application) => item.postId === postId);
}

export async function hasApplied(userId: string, postId: string): Promise<boolean> {
  if (auth.currentUser?.uid !== userId) return false;
  return Boolean(await getApplicantReceipt(postId));
}

export async function applyToPost(userId: string, postId: string, postTitle: string, orgName: string): Promise<void> {
  if (auth.currentUser?.uid !== userId) throw new Error("Sign in to apply");
  await requestApplications("/api/applications", "POST", { postId, postTitle, orgName });
}

export async function updateApplicationStatus(appId: string, status: ApplicationStatus, note?: string): Promise<void> {
  if (status === "withdrawn") return withdrawApplication(appId);
  await requestApplications("/api/employer/applications", "PUT", { appId, status, ...(note ? { reviewerNote: note } : {}) });
}

export async function withdrawApplication(appId: string): Promise<void> {
  await requestApplications("/api/applications", "PATCH", { appId, action: "withdraw" });
}

export async function updateApplicationNote(appId: string, reviewerNote: string): Promise<void> {
  await requestApplications("/api/employer/applications", "PUT", { appId, reviewerNote });
}
