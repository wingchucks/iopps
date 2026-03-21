import { getOrganizationPublicHref, isSchoolOrganization } from "@/lib/school-visibility";

export interface AccountProfileDestinationOptions {
  hasOrg: boolean;
  orgId?: string | null;
  orgSlug?: string | null;
  orgType?: string | null;
  orgPlan?: string | null;
  orgTier?: string | null;
}

export function getAccountProfileHref(options: AccountProfileDestinationOptions): string {
  const publicOrgKey = options.orgSlug || options.orgId;

  if (options.hasOrg && publicOrgKey) {
    return getOrganizationPublicHref({
      id: options.orgId,
      slug: options.orgSlug,
      type: options.orgType,
      plan: options.orgPlan,
      tier: options.orgTier,
    });
  }

  return "/profile";
}

export function getAccountProfileLabel(options: Pick<AccountProfileDestinationOptions, "hasOrg" | "orgType"> & {
  orgPlan?: string | null;
  orgTier?: string | null;
}) : string {
  if (!options.hasOrg) return "My Profile";
  if (isSchoolOrganization({ type: options.orgType, plan: options.orgPlan, tier: options.orgTier })) {
    return "My School Profile";
  }
  return "My Business Profile";
}
