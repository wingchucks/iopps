export type AdminEmployerStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "disabled"
  | "incomplete";

export type AdminEmployerAccountType = "business" | "school";

export interface AdminEmployerRow {
  id: string;
  displayName: string;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  accountType: AdminEmployerAccountType;
  status: AdminEmployerStatus;
  createdAt: string;
  slug: string;
  publicHref: string;
  planLabel?: string;
  verificationSummary?: string;
}

export interface AdminCounts {
  users: number;
  jobs: { total: number; active: number };
  employers: { total: number; pending: number };
  conferences: number;
  scholarships: number;
  applications: number;
  vendors?: number;
  contentFlags?: number;
  pendingVerifications?: number;
  verificationRequests?: { pending: number };
  unreadNotifications?: number;
}

export interface AdminUserRow {
  id: string;
  displayName: string;
  email: string;
  role: "community" | "employer" | "moderator" | "admin";
  createdAt: string;
  photoURL?: string;
}
