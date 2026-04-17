export interface OrganizationLocation {
  city: string;
  province: string;
  remote?: boolean;
}

export interface OrganizationSocialLinks {
  facebook?: string;
  linkedin?: string;
  instagram?: string;
  twitter?: string;
}

export interface OrganizationHoursDay {
  open: string;
  close: string;
  isOpen: boolean;
  label?: string;
}

export type OrganizationHours = Record<string, OrganizationHoursDay>;

export interface OrganizationProfilePatchResult {
  updates: Record<string, unknown>;
  touchedFields: string[];
}

export interface BusinessProfileReadiness {
  isReady: boolean;
  missingFields: string[];
}

export interface NormalizedPartnerDirectorySettings {
  enabled?: boolean;
  visibleAt?: string;
  sectionOverride?: "premium" | "education" | "visibility";
  spotlight?: boolean;
}

const HOURS_DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: unknown): string | undefined {
  const normalized = normalizeString(value);
  return normalized || undefined;
}

function normalizePartnerDirectorySettings(value: unknown): NormalizedPartnerDirectorySettings | undefined {
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const visibleAt = normalizeOptionalString(record.visibleAt);
  const sectionOverride = normalizeOptionalString(record.sectionOverride)?.toLowerCase();
  const normalized: NormalizedPartnerDirectorySettings = {};

  if (typeof record.enabled === "boolean") normalized.enabled = record.enabled;
  if (visibleAt) normalized.visibleAt = visibleAt;
  if (sectionOverride === "premium" || sectionOverride === "education" || sectionOverride === "visibility") {
    normalized.sectionOverride = sectionOverride;
  }
  if (typeof record.spotlight === "boolean") normalized.spotlight = record.spotlight;

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeNumericYear(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const entry of value) {
    const next = normalizeString(entry);
    const key = next.toLowerCase();
    if (!next || seen.has(key)) continue;
    seen.add(key);
    normalized.push(next);
  }

  return normalized;
}

export function normalizeOrganizationLocation(value: unknown): OrganizationLocation | undefined {
  if (!value) return undefined;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const parts = trimmed
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) return undefined;
    if (parts.length === 1) return { city: parts[0], province: "" };

    return {
      city: parts[0],
      province: parts.slice(1).join(", "),
    };
  }

  if (typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const city = normalizeString(record.city);
  const province = normalizeString(record.province);
  const remote = record.remote === true;

  if (!city && !province && !remote) return undefined;

  return {
    city,
    province,
    ...(remote ? { remote: true } : {}),
  };
}

export function normalizeOrganizationSocialLinks(value: unknown): OrganizationSocialLinks | undefined {
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const normalized: OrganizationSocialLinks = {};

  const facebook = normalizeOptionalString(record.facebook);
  const linkedin = normalizeOptionalString(record.linkedin);
  const instagram = normalizeOptionalString(record.instagram);
  const twitter = normalizeOptionalString(record.twitter);

  if (facebook) normalized.facebook = facebook;
  if (linkedin) normalized.linkedin = linkedin;
  if (instagram) normalized.instagram = instagram;
  if (twitter) normalized.twitter = twitter;

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function normalizeOrganizationHours(value: unknown): OrganizationHours | undefined {
  if (!value || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const normalized: OrganizationHours = {};

  for (const day of HOURS_DAY_KEYS) {
    const entry = record[day];
    if (entry === undefined || entry === null) continue;

    if (typeof entry === "string") {
      const label = entry.trim();
      normalized[day] = label && !/^closed$/i.test(label)
        ? { open: "", close: "", isOpen: true, label }
        : { open: "", close: "", isOpen: false };
      continue;
    }

    if (typeof entry !== "object") continue;

    const hours = entry as Record<string, unknown>;
    const open = normalizeString(hours.open);
    const close = normalizeString(hours.close);
    const label = normalizeOptionalString(hours.label);
    const explicitClosed = hours.isOpen === false;
    const explicitOpen = hours.isOpen === true;
    const inferredOpen = explicitOpen || Boolean(open || close || label);
    const isOpen = explicitClosed ? false : inferredOpen;

    normalized[day] = {
      open: isOpen ? open : "",
      close: isOpen ? close : "",
      isOpen,
      ...(label ? { label } : {}),
    };
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function formatOrganizationHoursDay(value: unknown): string {
  if (!value) return "Closed";

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || "Closed";
  }

  if (typeof value !== "object") return "Closed";

  const hours = value as Partial<OrganizationHoursDay>;
  if (hours.isOpen === false) return "Closed";

  if (typeof hours.label === "string" && hours.label.trim()) {
    return hours.label.trim();
  }

  const open = normalizeString(hours.open);
  const close = normalizeString(hours.close);

  if (open && close) return `${open} - ${close}`;
  if (open) return open;
  if (close) return close;
  if (hours.isOpen === true) return "Open";

  return "Closed";
}

export function hasOrganizationIndigenousIdentity(org: {
  businessIdentity?: string;
  indigenousOwned?: boolean;
  indigenousGroups?: unknown;
  nation?: string;
  treatyTerritory?: string;
  tags?: unknown;
}): boolean {
  if (org.indigenousOwned === true) return true;
  if (org.businessIdentity === "indigenous") return true;
  if (normalizeString(org.nation)) return true;
  if (normalizeString(org.treatyTerritory)) return true;
  if (normalizeStringArray(org.indigenousGroups).length > 0) return true;

  return normalizeStringArray(org.tags).some((tag) => {
    const normalized = tag.toLowerCase();
    return normalized.includes("indigenous");
  });
}

export function getBusinessProfileReadiness(org: {
  type?: unknown;
  ownerType?: unknown;
  partnerTier?: unknown;
  plan?: unknown;
  logo?: unknown;
  logoUrl?: unknown;
  description?: unknown;
  tagline?: unknown;
  contactEmail?: unknown;
  phone?: unknown;
  website?: unknown;
}): BusinessProfileReadiness {
  const type = normalizeString(org.type).toLowerCase();
  const ownerType = normalizeString(org.ownerType).toLowerCase();
  const partnerTier = normalizeString(org.partnerTier).toLowerCase();
  const plan = normalizeString(org.plan).toLowerCase();

  if ([type, ownerType, partnerTier, plan].includes("school")) {
    return { isReady: true, missingFields: [] };
  }

  const missingFields: string[] = [];
  const hasLogo = Boolean(normalizeOptionalString(org.logoUrl) || normalizeOptionalString(org.logo));
  const hasStory = Boolean(normalizeString(org.description) || normalizeString(org.tagline));
  const hasContactMethod = Boolean(
    normalizeString(org.contactEmail) ||
    normalizeString(org.phone) ||
    normalizeString(org.website)
  );

  if (!hasLogo) missingFields.push("logo");
  if (!hasStory) missingFields.push("description");
  if (!hasContactMethod) missingFields.push("contact");

  return {
    isReady: missingFields.length === 0,
    missingFields,
  };
}

export function isOrganizationPubliclyVisible(org: {
  type?: unknown;
  ownerType?: unknown;
  partnerTier?: unknown;
  plan?: unknown;
  logo?: unknown;
  logoUrl?: unknown;
  description?: unknown;
  tagline?: unknown;
  contactEmail?: unknown;
  phone?: unknown;
  website?: unknown;
  onboardingComplete?: unknown;
  verified?: unknown;
  disabled?: unknown;
  status?: unknown;
  emailVerified?: unknown;
  publicVisibility?: unknown;
  isPublished?: unknown;
  publicationStatus?: unknown;
  directoryVisible?: unknown;
  isDirectoryVisible?: unknown;
}): boolean {
  if (hasOrganizationVisibilityBlock(org)) return false;
  const status = normalizeString(org.status).toLowerCase();

  const accepted =
    org.onboardingComplete === true ||
    org.verified === true ||
    status === "approved" ||
    org.emailVerified === true;

  if (!accepted) return false;

  return getBusinessProfileReadiness(org).isReady;
}

export function hasOrganizationVisibilityBlock(org: {
  disabled?: unknown;
  status?: unknown;
  publicVisibility?: unknown;
  isPublished?: unknown;
  publicationStatus?: unknown;
  directoryVisible?: unknown;
  isDirectoryVisible?: unknown;
}): boolean {
  if (org.disabled === true) return true;

  const status = normalizeString(org.status).toLowerCase();
  if (status === "disabled" || status === "rejected") return true;

  const visibilitySignals: boolean[] = [];
  const publicVisibility = normalizeString(org.publicVisibility).toLowerCase();
  if (publicVisibility) {
    visibilitySignals.push(!(publicVisibility === "hidden" || publicVisibility === "private"));
  }
  if (typeof org.isPublished === "boolean") {
    visibilitySignals.push(org.isPublished);
  }
  const publicationStatus = normalizeString(org.publicationStatus).toUpperCase();
  if (publicationStatus) {
    visibilitySignals.push(publicationStatus === "PUBLISHED");
  }
  if (typeof org.directoryVisible === "boolean") {
    visibilitySignals.push(org.directoryVisible);
  }
  if (typeof org.isDirectoryVisible === "boolean") {
    visibilitySignals.push(org.isDirectoryVisible);
  }

  return visibilitySignals.some((signal) => signal === false);
}

/**
 * Remove contact PII (email, phone) from an organization record before it
 * ships in a public LIST response. The per-org detail endpoint
 * (`/api/org/[slug]`) keeps the fields because the detail page intentionally
 * renders them — the employer filled them in so visitors could reach out.
 * Bulk exposure on the listing endpoint is what enables scraping, so we
 * scrub there.
 */
export function stripOrganizationContactPII<T extends object>(record: T): T {
  const source = record as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { contactEmail: _contactEmail, phone: _phone, ...rest } = source;
  return rest as T;
}

export function normalizeOrganizationRecord<T extends object>(record: T): T {
  const source = record as Record<string, unknown>;
  const next = { ...source } as Record<string, unknown>;

  const name = normalizeOptionalString(source.name);
  const tagline = normalizeOptionalString(source.tagline);
  const description = normalizeString(source.description);
  const industry = normalizeOptionalString(source.industry);
  const size = normalizeOptionalString(source.size);
  const address = normalizeOptionalString(source.address);
  const website = normalizeOptionalString(source.website);
  const phone = normalizeOptionalString(source.phone);
  const contactEmail = normalizeOptionalString(source.contactEmail);
  const nation = normalizeOptionalString(source.nation);
  const treatyTerritory = normalizeOptionalString(source.treatyTerritory);
  const communityAffiliation = normalizeOptionalString(source.communityAffiliation);
  const logoUrl = normalizeOptionalString(source.logoUrl) || normalizeOptionalString(source.logo);
  const bannerUrl = normalizeOptionalString(source.bannerUrl);
  const location = normalizeOrganizationLocation(source.location);
  const socialLinks = normalizeOrganizationSocialLinks(source.socialLinks);
  const gallery = normalizeStringArray(source.gallery);
  const tags = normalizeStringArray(source.tags);
  const services = normalizeStringArray(source.services);
  const indigenousGroups = normalizeStringArray(source.indigenousGroups);
  const hours = normalizeOrganizationHours(source.hours);
  const foundedYear = normalizeNumericYear(source.foundedYear);
  const publicationStatus = normalizeOptionalString(source.publicationStatus)?.toUpperCase();
  const areasOfStudy = normalizeStringArray(source.areasOfStudy);
  const previewHighlights = normalizeStringArray(source.previewHighlights);
  const sourceUrls = normalizeStringArray(source.sourceUrls);
  const profileMode = normalizeOptionalString(source.profileMode);
  const seedSource = normalizeOptionalString(source.seedSource);
  const careersUrl = normalizeOptionalString(source.careersUrl);
  const studentCount = normalizeOptionalString(source.studentCount);
  const graduationRate = normalizeOptionalString(source.graduationRate);
  const employmentRate = normalizeOptionalString(source.employmentRate);
  const showcaseRank =
    typeof source.showcaseRank === "number" && Number.isFinite(source.showcaseRank)
      ? source.showcaseRank
      : undefined;

  if (name) next.name = name;
  if (tagline) next.tagline = tagline;
  if (description || source.description !== undefined) next.description = description;
  if (industry) next.industry = industry;
  if (size) next.size = size;
  if (address) next.address = address;
  if (website) next.website = website;
  if (phone) next.phone = phone;
  if (contactEmail) next.contactEmail = contactEmail;
  if (nation) next.nation = nation;
  if (treatyTerritory) next.treatyTerritory = treatyTerritory;
  if (communityAffiliation) next.communityAffiliation = communityAffiliation;
  if (logoUrl) next.logoUrl = logoUrl;
  if (bannerUrl) next.bannerUrl = bannerUrl;
  if (location) next.location = location;
  if (socialLinks) next.socialLinks = socialLinks;
  if (gallery.length > 0) next.gallery = gallery;
  if (tags.length > 0) next.tags = tags;
  if (services.length > 0) next.services = services;
  if (areasOfStudy.length > 0) next.areasOfStudy = areasOfStudy;
  if (indigenousGroups.length > 0) next.indigenousGroups = indigenousGroups;
  if (previewHighlights.length > 0) next.previewHighlights = previewHighlights;
  if (sourceUrls.length > 0) next.sourceUrls = sourceUrls;
  if (hours) next.hours = hours;
  if (foundedYear !== null) next.foundedYear = foundedYear;
  if (profileMode) next.profileMode = profileMode;
  if (seedSource) next.seedSource = seedSource;
  if (careersUrl) next.careersUrl = careersUrl;
  if (studentCount) next.studentCount = studentCount;
  if (graduationRate) next.graduationRate = graduationRate;
  if (employmentRate) next.employmentRate = employmentRate;
  if (showcaseRank !== undefined) next.showcaseRank = showcaseRank;
  if (typeof source.claimable === "boolean") next.claimable = source.claimable;
  if (typeof source.isPublished === "boolean") next.isPublished = source.isPublished;
  if (publicationStatus) next.publicationStatus = publicationStatus;
  if (typeof source.directoryVisible === "boolean") next.directoryVisible = source.directoryVisible;
  if (typeof source.isDirectoryVisible === "boolean") next.isDirectoryVisible = source.isDirectoryVisible;
  const partnerDirectory = normalizePartnerDirectorySettings(source.partnerDirectory);
  if (partnerDirectory) next.partnerDirectory = partnerDirectory;

  return next as T;
}

export function normalizeOrganizationProfilePatch(body: Record<string, unknown>): OrganizationProfilePatchResult {
  const updates: Record<string, unknown> = {};
  const touchedFields: string[] = [];

  const setStringField = (key: string) => {
    if (body[key] === undefined) return;
    updates[key] = normalizeString(body[key]);
    touchedFields.push(key);
  };

  for (const key of [
    "name",
    "tagline",
    "description",
    "industry",
    "size",
    "address",
    "website",
    "phone",
    "contactEmail",
    "nation",
    "treatyTerritory",
  ]) {
    setStringField(key);
  }

  if (body.foundedYear !== undefined) {
    updates.foundedYear = normalizeNumericYear(body.foundedYear);
    touchedFields.push("foundedYear");
  }

  if (body.logoUrl !== undefined) {
    updates.logoUrl = normalizeString(body.logoUrl);
    touchedFields.push("logoUrl");
  }

  if (body.bannerUrl !== undefined) {
    updates.bannerUrl = normalizeString(body.bannerUrl);
    touchedFields.push("bannerUrl");
  }

  if (body.isPublished !== undefined) {
    updates.isPublished = body.isPublished === true;
    touchedFields.push("isPublished");
  }

  if (body.location !== undefined) {
    updates.location =
      normalizeOrganizationLocation(body.location) || { city: "", province: "" };
    touchedFields.push("location");
  }

  if (body.hours !== undefined) {
    updates.hours = normalizeOrganizationHours(body.hours) || {};
    touchedFields.push("hours");
  }

  if (body.gallery !== undefined) {
    updates.gallery = normalizeStringArray(body.gallery);
    touchedFields.push("gallery");
  }

  if (body.tags !== undefined) {
    updates.tags = normalizeStringArray(body.tags);
    touchedFields.push("tags");
  }

  if (body.services !== undefined) {
    updates.services = normalizeStringArray(body.services);
    touchedFields.push("services");
  }

  if (body.indigenousGroups !== undefined) {
    updates.indigenousGroups = normalizeStringArray(body.indigenousGroups);
    touchedFields.push("indigenousGroups");
  }

  if (body.socialLinks !== undefined) {
    updates.socialLinks = normalizeOrganizationSocialLinks(body.socialLinks) || {};
    touchedFields.push("socialLinks");
  }

  return { updates, touchedFields };
}
