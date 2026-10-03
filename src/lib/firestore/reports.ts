// Content reports are submitted through /api/reports. The server validates them,
// rate-limits and de-duplicates per member, and writes the moderation queue
// (contentFlags) that /admin/moderation reads. Browsers never write reports directly.
// The API route shares these limits, so keep this module free of Firebase SDK imports.

export const REPORT_TARGET_TYPES = ["post", "member", "message", "conversation"] as const;
export const REPORT_REASONS = ["spam", "harassment", "inappropriate", "misinformation", "other"] as const;
export const REPORT_DETAILS_MAX_LENGTH = 2000;
export const REPORT_TITLE_MAX_LENGTH = 300;
export const REPORT_TARGET_ID_MAX_LENGTH = 300;

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface ContentReport {
  targetType: ReportTargetType;
  targetId: string;
  targetTitle?: string;
  reason: ReportReason;
  details?: string;
}

export type ReportSubmissionResult = { duplicate: boolean };

export class ReportSubmissionError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ReportSubmissionError";
    this.status = status;
  }
}

export async function submitReport(
  reporter: { getIdToken(): Promise<string> },
  report: ContentReport,
): Promise<ReportSubmissionResult> {
  // Optional text is omitted rather than sent as undefined or an empty string.
  const title = report.targetTitle?.trim().slice(0, REPORT_TITLE_MAX_LENGTH);
  const details = report.details?.trim();
  const response = await fetch("/api/reports", {
    method: "POST",
    headers: { Authorization: `Bearer ${await reporter.getIdToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      ...(title ? { targetTitle: title } : {}),
      ...(details ? { details } : {}),
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ReportSubmissionError(typeof result.error === "string" ? result.error : "Unable to submit report", response.status);
  }
  return { duplicate: result.duplicate === true };
}
