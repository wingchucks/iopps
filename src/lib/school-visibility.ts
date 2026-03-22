type UnknownRecord = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function recordFrom(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function normalizeVisibilityStatus(value: unknown): string {
  return text(value).toUpperCase();
}

export function isSchoolOrganization(value: unknown): boolean {
  const record = recordFrom(value);
  const type = text(record.type).toLowerCase();
  const tier = text(record.tier).toLowerCase();
  const plan = text(record.plan).toLowerCase();
  const ownerType = text(record.ownerType).toLowerCase();
  const partnerTier = text(record.partnerTier).toLowerCase();

  return [type, tier, plan, ownerType, partnerTier].includes("school");
}

export function isSchoolPubliclyVisible(value: unknown): boolean {
  const record = recordFrom(value);

  if (!isSchoolOrganization(record)) return true;

  const signals: boolean[] = [];

  const publicVisibility = normalizeVisibilityStatus(record.publicVisibility);
  if (publicVisibility) {
    signals.push(!(publicVisibility === "HIDDEN" || publicVisibility === "PRIVATE"));
  }

  if (typeof record.isPublished === "boolean") {
    signals.push(record.isPublished);
  }

  const publicationStatus = normalizeVisibilityStatus(record.publicationStatus);
  if (publicationStatus) {
    signals.push(publicationStatus === "PUBLISHED");
  }

  if (typeof record.directoryVisible === "boolean") {
    signals.push(record.directoryVisible);
  }

  if (typeof record.isDirectoryVisible === "boolean") {
    signals.push(record.isDirectoryVisible);
  }

  if (signals.some((signal) => signal === false)) return false;
  if (signals.length > 0) return true;

  return true;
}

export function buildSchoolVisibilityPatch(isPublished: boolean) {
  return {
    isPublished,
    publicationStatus: isPublished ? "PUBLISHED" : "DRAFT",
    directoryVisible: isPublished,
    isDirectoryVisible: isPublished,
    publicVisibility: isPublished ? "public" : "hidden",
  } as const;
}

export function getOrganizationPublicHref(value: unknown): string {
  const record = recordFrom(value);
  const publicKey = text(record.slug) || text(record.id);

  if (!publicKey) {
    return isSchoolOrganization(record) ? "/schools" : "/businesses";
  }

  return isSchoolOrganization(record) ? `/schools/${publicKey}` : `/org/${publicKey}`;
}
