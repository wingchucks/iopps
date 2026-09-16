interface AccountDestination {
  admin?: boolean;
  hasMemberProfile: boolean;
  organization?: {
    authorized: boolean;
    organizationType?: string;
    profileReady?: boolean;
    missingProfileFields?: unknown;
  };
}

/** Destination only; every protected page/API still enforces its own authorization. */
export function accountDestination(account: AccountDestination): string {
  if (account.admin) return "/admin";
  const org = account.organization;
  if (org?.authorized) {
    if (org.organizationType !== "school" && org.profileReady === false) {
      const params = new URLSearchParams({ reason: "incomplete-profile" });
      if (Array.isArray(org.missingProfileFields)) {
        const fields = org.missingProfileFields.filter((field): field is string => typeof field === "string" && field.trim().length > 0);
        if (fields.length) params.set("required", fields.join(","));
      }
      return `/org/onboarding?${params}`;
    }
    return "/org/dashboard";
  }
  return account.hasMemberProfile ? "/feed" : "/setup";
}
