interface AccountDestination {
  admin?: boolean;
  hasMemberProfile: boolean;
  setupComplete?: boolean;
  signupIntent?: unknown;
  organization?: {
    authorized: boolean;
    organizationType?: string;
    profileReady?: boolean;
    missingProfileFields?: unknown;
  };
  /** The account's organization exists but can no longer be used (disabled, deleted or archived). */
  organizationUnavailable?: boolean;
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
  // A removed organization must not send its members back into organization signup.
  if (account.signupIntent === "organization" && !account.organizationUnavailable) return "/signup?resume=organization&type=employer";
  return (account.setupComplete || account.hasMemberProfile) ? "/feed" : "/setup";
}
