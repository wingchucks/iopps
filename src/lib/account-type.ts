export type SignupRole = "" | "community" | "organization";
export type SignupOrganizationType = "" | "employer" | "school";
export type StoredAccountType = "community" | "employer" | "school";

export function getStoredAccountType(
  role: SignupRole,
  organizationType: SignupOrganizationType,
): StoredAccountType {
  if (role === "community") return "community";
  return organizationType === "school" ? "school" : "employer";
}

export function shouldAllowAccountTypeRecovery(memberProfileExists: unknown): boolean {
  return memberProfileExists === false;
}
