export interface AccountProfileDestinationOptions {
  hasOrg: boolean;
  orgId?: string | null;
  orgSlug?: string | null;
  orgType?: string | null;
}

export function getAccountProfileHref(options: AccountProfileDestinationOptions): string {
  const publicOrgKey = options.orgSlug || options.orgId;

  if (options.hasOrg && publicOrgKey) {
    return options.orgType === "school" ? `/schools/${publicOrgKey}` : `/org/${publicOrgKey}`;
  }

  return "/profile";
}

export function getAccountProfileLabel(options: Pick<AccountProfileDestinationOptions, "hasOrg" | "orgType">): string {
  if (!options.hasOrg) return "My Profile";
  if (options.orgType === "school") return "My School Profile";
  return "My Business Profile";
}
