type UnknownRecord = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const entry of value) {
    const normalized = text(entry);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function recordFrom(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

export function isClaimableSchoolPreview(value: unknown): boolean {
  const record = recordFrom(value);
  if (record.claimable === true) return true;
  return text(record.profileMode).toLowerCase() === "claimable-preview";
}

export function getSchoolPreviewHighlights(value: unknown): string[] {
  const record = recordFrom(value);
  return stringArray(record.previewHighlights);
}

export function getSchoolShowcaseRank(value: unknown): number {
  const record = recordFrom(value);
  const raw = record.showcaseRank;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : Number.MAX_SAFE_INTEGER;
}
