export type ImportedMetadataAvailability = "available" | "not-imported";
export interface PublicImportSourceMetadata {
  salary: ImportedMetadataAvailability;
  closingDate: ImportedMetadataAvailability;
  employmentType: ImportedMetadataAvailability;
}

/** Availability in the imported record, NOT an assertion about the source site.
 * Includes raw aliases, not a display contract: UI missing guidance must use
 * its actual displayable values, even when this metadata says available.
 * Derive this projection rather than forwarding private/raw provider metadata.
 * Unknown origins and direct employer posts must not be relabelled as imports.
 */
export function publicImportSourceMetadata(record: Record<string, unknown>): PublicImportSourceMetadata | undefined {
  if (record.source !== "feed") return undefined;
  const hasText = (value: unknown) => typeof value === "string" && Boolean(value.trim());
  const hasSalary = (value: unknown): boolean => {
    if (hasText(value)) return true;
    if (!value || typeof value !== "object") return false;
    const range = value as Record<string, unknown>;
    return hasText(range.display) || [range.min, range.max].some(amount => typeof amount === "number" && Number.isFinite(amount) && amount > 0);
  };
  const availability = (present: boolean): ImportedMetadataAvailability => present ? "available" : "not-imported";
  return {
    salary: availability(hasSalary(record.salary) || hasSalary(record.salaryRange)),
    closingDate: availability([record.closingDate, record.deadline, record.applicationDeadline].some(hasText)),
    employmentType: availability([record.employmentType, record.jobType].some(hasText)),
  };
}
