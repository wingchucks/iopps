import { getOrganizationPublicHref, isSchoolOrganization } from "@/lib/school-visibility";

/**
 * One login, two workspaces: the person's own profile is always available, and an
 * organization they own or manage is an additional workspace (like a Page created
 * from a personal account). Navigation shows both; it never grants access. Every
 * organization page and API still verifies membership on the server.
 */
export const PERSONAL_PROFILE_HREF = "/profile";
export const CREATE_ORGANIZATION_HREF = "/org/upgrade";
export const ORGANIZATION_DASHBOARD_HREF = "/org/dashboard";

export interface AccountWorkspaceOptions {
  hasOrg: boolean;
  orgId?: string | null;
  orgSlug?: string | null;
  orgName?: string | null;
  orgType?: string | null;
  orgPlan?: string | null;
  orgTier?: string | null;
}

export interface OrganizationWorkspaceLinks {
  name: string;
  dashboardHref: string;
  publicHref: string | null;
}

export type AccountWorkspace = "personal" | "organization";

export function getOrganizationWorkspaceLinks(options: AccountWorkspaceOptions): OrganizationWorkspaceLinks | null {
  if (!options.hasOrg) return null;
  const publicKey = options.orgSlug || options.orgId;
  // School/program directories are retired, so a school keeps its dashboard but has no public page link.
  const school = isSchoolOrganization({ type: options.orgType, plan: options.orgPlan, tier: options.orgTier });
  return {
    name: options.orgName?.trim() || "Your organization",
    dashboardHref: ORGANIZATION_DASHBOARD_HREF,
    publicHref: publicKey && !school
      ? getOrganizationPublicHref({ id: options.orgId, slug: options.orgSlug, type: options.orgType, plan: options.orgPlan, tier: options.orgTier })
      : null,
  };
}

/** Organization dashboard and setup pages act on behalf of the organization; everything else is personal. */
export function getWorkspaceForPath(pathname: string | null | undefined): AccountWorkspace {
  return /^\/org\/(dashboard|onboarding)(?:\/|$)/.test(pathname || "") ? "organization" : "personal";
}

export function describeWorkspace(workspace: AccountWorkspace, organization: OrganizationWorkspaceLinks | null): string {
  return workspace === "organization" && organization ? `Acting as ${organization.name}` : "Acting as yourself";
}
