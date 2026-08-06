export const ANONYMOUS_MEMBER_NAME = "IOPPS Member";

const PUBLIC_ROLE_LABELS = {
  community: "Individual",
  employer: "Organization / Employer",
  moderator: "Moderator",
  admin: "Admin",
} as const;

export function getPublicAccountTypeLabel(role?: string, orgRole?: string): string {
  if (role === "admin") return PUBLIC_ROLE_LABELS.admin;
  if (role === "moderator") return PUBLIC_ROLE_LABELS.moderator;
  if (role === "employer") return PUBLIC_ROLE_LABELS.employer;
  if (orgRole === "owner" || orgRole === "admin") return "Organization";
  return PUBLIC_ROLE_LABELS.community;
}

export function getAdminRoleLabel(role: string): string {
  return PUBLIC_ROLE_LABELS[role as keyof typeof PUBLIC_ROLE_LABELS] || role;
}
