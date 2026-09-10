import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { validateApplicationSubmission } from "../application-validation.ts";
import { buildApplicationDeliveryDocId } from "../application-notification-delivery.ts";
import { buildApplicationProfileSnapshot } from "../application-snapshot.ts";

export async function submitApplication(db: Firestore, uid: string, input: Record<string, unknown>, verifyDocuments: () => Promise<void> = async () => {}) {
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
    const record = job.data()!;
    const error = validateApplicationSubmission(record, input);
    if (error) throw new Error(error);
    await verifyDocuments();
    const now = Timestamp.now();
    const application = {
      userId: uid, postId, jobId: postId,
      postTitle: String(record.title || ""), orgName: String(record.orgName || record.employerName || ""),
      orgId: String(record.orgId || record.employerId || ""), employerId: String(record.employerId || record.orgId || ""),
      status: "submitted", statusHistory: [{ status: "submitted", timestamp: now }],
      resumeUrl: typeof input.resumeUrl === "string" ? input.resumeUrl : "",
      resumeType: input.resumeType === "profile" ? "profile" : "file",
      resumeFileName: typeof input.resumeFileName === "string" ? input.resumeFileName.slice(0, 255) : null,
      profileSnapshot: input.profileSnapshot && typeof input.profileSnapshot === "object"
        ? buildApplicationProfileSnapshot(input.profileSnapshot, now.toDate().toISOString()) : null,
      coverLetter: typeof input.coverLetter === "string" ? input.coverLetter.trim().slice(0, 20000) : "",
      references: typeof input.references === "string" ? input.references.trim().slice(0, 10000) : "",
      appliedAt: now, updatedAt: now,
    };
    transaction.create(applicationRef, application);
    return { created: true, application: { ...application, id } };
  });
}
