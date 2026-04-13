function toNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export interface LinkedOrganizationSources {
  memberOrgId?: unknown;
  userOrgId?: unknown;
  userEmployerId?: unknown;
  claimOrgId?: unknown;
  claimEmployerId?: unknown;
}

export function resolveLinkedOrganizationId(
  sources: LinkedOrganizationSources,
): string | null {
  return (
    toNonEmptyString(sources.memberOrgId) ||
    toNonEmptyString(sources.userOrgId) ||
    toNonEmptyString(sources.userEmployerId) ||
    toNonEmptyString(sources.claimOrgId) ||
    toNonEmptyString(sources.claimEmployerId) ||
    null
  );
}

export function hasLinkedOrganization(
  sources: LinkedOrganizationSources,
): boolean {
  return resolveLinkedOrganizationId(sources) !== null;
}
