import { getOrganizationAccessBlockReason } from "@/lib/access-state";
import { isOrganizationPubliclyVisible, normalizeOrganizationRecord } from "@/lib/organization-profile";
import { isSchoolOrganization, isSchoolPubliclyVisible } from "@/lib/school-visibility";
import { matchesOrgName, type JsonRecord } from "@/lib/server/public-ownership";
import { applyNormalizedSubscriptionState } from "@/lib/server/subscription-state";

/** The public gate of /api/org/[slug], without the owner's own preview. */
export function hasPublicOrganizationProfile(raw: JsonRecord): boolean {
  const org = normalizeOrganizationRecord(applyNormalizedSubscriptionState(raw)) as JsonRecord;
  if (getOrganizationAccessBlockReason(org) || String(org.status ?? "").trim().toLowerCase() === "suspended") return false;
  return isSchoolOrganization(org) ? isSchoolPubliclyVisible(org) : isOrganizationPubliclyVisible(org);
}

function nameKey(value: unknown): string {
  return typeof value === "string" ? value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim() : "";
}

/** "TD / AFOA Canada" names two organizations; each part must match a whole name. */
export function providerNameParts(name: unknown): string[] {
  return typeof name === "string" ? [...new Set(name.split("/").map(nameKey).filter(Boolean))] : [];
}

export interface ScholarshipProvider {
  /** The organization the listing names as its provider, when one is on file. */
  provider: JsonRecord | null;
  /** That provider, only when its profile is public and can be linked. */
  profile: JsonRecord | null;
  /** The posting account when it shares another provider's award and has a public profile. */
  listedBy: JsonRecord | null;
}

/**
 * The account that posted a scholarship is its provider only when the listing names it.
 * Curating accounts share other providers' awards, so their profile must never stand in
 * for the provider's.
 */
export function resolveScholarshipProvider(record: JsonRecord, organizations: JsonRecord[]): ScholarshipProvider {
  const providerName = String(record.orgName || "");
  const poster = record.orgId ? organizations.find(org => org.id === record.orgId) ?? null : null;
  const posterIsProvider = !!poster && matchesOrgName(providerName, String(poster.name || ""));
  const parts = providerNameParts(providerName);
  const provider = posterIsProvider ? poster : organizations.find(org => org !== poster
    && parts.some(part => part === nameKey(org.name) || part === nameKey(org.shortName))) ?? null;
  const listedBy = poster && !posterIsProvider && nameKey(poster.name) && hasPublicOrganizationProfile(poster) ? poster : null;
  return { provider, profile: provider && hasPublicOrganizationProfile(provider) ? provider : null, listedBy };
}
