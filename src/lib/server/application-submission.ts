import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { validateApplicationSubmission } from "../application-validation.ts";
import { buildApplicationDeliveryDocId } from "../application-notification-delivery.ts";
import { buildApplicationProfileSnapshot } from "../application-snapshot.ts";

export interface ApplicantIdentity {
  /** Email from the verified ID token; preferred over the stored profile email. */
  email?: string | null;
}

/** The resume a new application attaches, before the server copies it for the employer. */
export interface ApplicationResumeSource {
  /** "profile" is the saved resume on the applicant's stored member profile, read here. */
  resumeType: "profile" | "file";
  /** Download URL of the source object, or "" when the application has no resume. */
  resumeUrl: string;
}

/**
 * Runs for a new submission only, before the receipt is written. It may return the URL of a
 * server-made copy, which is stored instead of the source.
 */
export type VerifyApplicationDocuments = (resume: ApplicationResumeSource) => Promise<string | void>;

const trimmed = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export async function submitApplication(db: Firestore, uid: string, input: Record<string, unknown>, verifyDocuments: VerifyApplicationDocuments = async () => {}, identity: ApplicantIdentity = {}) {
  const postId = typeof input.postId === "string" ? input.postId : "";
  if (!postId || postId.includes("/") || postId.length > 300) throw new Error("Invalid job identifier.");
  const id = buildApplicationDeliveryDocId(uid, postId);
  const applicationRef = db.collection("applications").doc(id);
  return db.runTransaction(async transaction => {
    const existing = await transaction.get(applicationRef);
    // Repeats never replace the original documents, timestamp, or employer status.
    if (existing.exists) {
      const data = existing.data()!;
      if (data.userId !== uid) throw new Error("Application ownership mismatch.");
      return { created: false, application: { ...data, id } };
    }
    const post = await transaction.get(db.collection("posts").doc(postId));
    const importedJob = await transaction.get(db.collection("jobs").doc(postId));
    const job = importedJob.exists ? importedJob : post;
    if (!job.exists) throw new Error("This job is no longer accepting applications.");
    // The applicant identity shown to employers comes from the stored profile and
    // verified sign-in email, never from client-supplied snapshot fields.
    const [memberDoc, userDoc] = await Promise.all([
      transaction.get(db.collection("members").doc(uid)),
      transaction.get(db.collection("users").doc(uid)),
    ]);
    const member: Record<string, unknown> = (memberDoc.exists ? memberDoc.data() : undefined) ?? {};
    const storedProfile = { ...(userDoc.exists ? userDoc.data() : {}), ...member };
    const record = job.data()!;
    // "Use my IOPPS profile" attaches the resume saved on the member profile as stored now. The
    // browser never downloads it, and a client-supplied URL cannot stand in for it.
    const resume: ApplicationResumeSource = input.resumeType === "profile"
      ? { resumeType: "profile", resumeUrl: trimmed(member.resumeUrl) }
      : { resumeType: "file", resumeUrl: typeof input.resumeUrl === "string" ? input.resumeUrl : "" };
    const error = validateApplicationSubmission(record, { ...input, resumeUrl: resume.resumeUrl });
    if (error) throw new Error(error);
    const storedResumeUrl = await verifyDocuments(resume);
    const resumeFileName = resume.resumeType === "file" ? input.resumeFileName
      : resume.resumeUrl ? trimmed(member.resumeFileName) || null : null;
    const now = Timestamp.now();
    const application = {
      userId: uid, postId, jobId: postId,
      postTitle: String(record.title || ""), orgName: String(record.orgName || record.employerName || ""),
      orgId: String(record.orgId || record.employerId || ""), employerId: String(record.employerId || record.orgId || ""),
      status: "submitted", statusHistory: [{ status: "submitted", timestamp: now }],
      resumeUrl: typeof storedResumeUrl === "string" ? storedResumeUrl : resume.resumeUrl,
      resumeType: resume.resumeType,
      resumeFileName: typeof resumeFileName === "string" ? resumeFileName.slice(0, 255) : null,
      profileSnapshot: buildApplicationProfileSnapshot(
        { ...storedProfile, email: identity.email || (typeof storedProfile.email === "string" ? storedProfile.email : "") },
        now.toDate().toISOString(),
      ),
      coverLetter: typeof input.coverLetter === "string" ? input.coverLetter.trim().slice(0, 20000) : "",
      references: typeof input.references === "string" ? input.references.trim().slice(0, 10000) : "",
      appliedAt: now, updatedAt: now,
    };
    transaction.create(applicationRef, application);
    return { created: true, application: { ...application, id } };
  });
}
