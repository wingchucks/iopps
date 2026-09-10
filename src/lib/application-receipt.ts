export function buildApplicationReceipt(application: Record<string, unknown>) {
  const time = application.appliedAt as { seconds?: number; toDate?: () => Date } | string | undefined;
  const date = typeof time === "string" ? new Date(time) : time?.toDate ? time.toDate() : typeof time?.seconds === "number" ? new Date(time.seconds * 1000) : null;
  return {
    id: String(application.id || ""), postId: String(application.postId || ""),
    title: String(application.postTitle || "Application"), employer: String(application.orgName || "Employer"),
    submittedAt: date && Number.isFinite(date.getTime()) ? date.toISOString() : null,
    documents: [application.resumeUrl ? String(application.resumeFileName || "Resume") : null,
      application.profileSnapshot ? "IOPPS profile snapshot" : null,
      application.coverLetter ? "Cover letter" : null, application.references ? "References" : null].filter((value): value is string => !!value),
  };
}
export type ApplicationReceipt = ReturnType<typeof buildApplicationReceipt>;
/** Applicant-safe projection; employer notes/contact routing must never leak on repeats. */
export function applicationReceiptRecord(application: Record<string, unknown>) {
  const delivery = application.delivery as Record<string, unknown> | undefined;
  return {
    ...Object.fromEntries(["id", "postId", "postTitle", "orgName", "appliedAt", "resumeFileName", "resumeUrl", "coverLetter", "references"].map(key => [key, application[key] ?? null])),
    profileSnapshot: application.profileSnapshot ? {} : null,
    delivery: {employerNotificationStatus: delivery?.employerNotificationStatus ?? null},
  };
}
