import type { ApplicationStatus } from "../types";

// Labels and colours for the website's application statuses (src/app/applications/page.tsx).
export const APPLICATION_STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bg: string }> = {
  submitted: { label: "Submitted", color: "#3B82F6", bg: "#3B82F620" },
  reviewing: { label: "Reviewing", color: "#F59E0B", bg: "#F59E0B20" },
  shortlisted: { label: "Shortlisted", color: "#10B981", bg: "#10B98120" },
  interview: { label: "Interview", color: "#8B5CF6", bg: "#8B5CF620" },
  offered: { label: "Offered", color: "#22C55E", bg: "#22C55E20" },
  rejected: { label: "Not Selected", color: "#EF4444", bg: "#EF444420" },
  withdrawn: { label: "Withdrawn", color: "#64748B", bg: "#64748B20" },
};

/** Applications still in progress; the rest have an outcome. */
export const ACTIVE_APPLICATION_STATUSES: ApplicationStatus[] = ["submitted", "reviewing", "shortlisted", "interview"];
