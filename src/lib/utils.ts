/** Safely convert a location field to a display string (may be string or object). */
export function displayLocation(loc: unknown): string {
  if (!loc) return "";
  if (typeof loc === "string") return loc;
  if (typeof loc === "object" && loc !== null) {
    const obj = loc as Record<string, unknown>;
    const parts = [obj.city, obj.province].filter(Boolean).map(String);
    if (obj.remote) parts.unshift("Remote");
    return parts.join(", ");
  }
  return String(loc);
}

function formatAmountScalar(value: string | number): string {
  if (typeof value === "number") {
    return `$${value.toLocaleString("en-CA", { maximumFractionDigits: 2 })}`;
  }

  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[+-]?\d+(?:[.,]\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed.replace(/,/g, ""));
    if (!Number.isNaN(numeric)) {
      return `$${numeric.toLocaleString("en-CA", { maximumFractionDigits: 2 })}`;
    }
  }
  return trimmed;
}

/** Safely convert flexible cost/amount fields (including { value, unit } objects) into a display string. */
export function displayAmount(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string" || typeof value === "number") {
    return formatAmountScalar(value);
  }

  if (typeof value !== "object") return String(value);

  const record = value as Record<string, unknown>;
  const explicitLabel =
    (typeof record.label === "string" && record.label.trim()) ||
    (typeof record.display === "string" && record.display.trim()) ||
    (typeof record.text === "string" && record.text.trim()) ||
    "";

  if (explicitLabel) return explicitLabel;

  const primary = record.value ?? record.amount ?? record.price ?? record.cost ?? record.min ?? record.minimum ?? null;
  const secondary = record.max ?? record.maximum ?? null;
  const rawUnit =
    (typeof record.unit === "string" && record.unit.trim()) ||
    (typeof record.period === "string" && record.period.trim()) ||
    (typeof record.frequency === "string" && record.frequency.trim()) ||
    (typeof record.interval === "string" && record.interval.trim()) ||
    "";

  const unitLower = rawUnit.toLowerCase();
  const unitSuffix =
    rawUnit && !["cad", "usd", "dollar", "dollars"].includes(unitLower) ? ` / ${rawUnit}` : "";

  const primaryText =
    typeof primary === "string" || typeof primary === "number" ? formatAmountScalar(primary) : "";
  const secondaryText =
    typeof secondary === "string" || typeof secondary === "number" ? formatAmountScalar(secondary) : "";

  if (primaryText && secondaryText) {
    return `${primaryText} - ${secondaryText}${unitSuffix}`;
  }
  if (primaryText) {
    return `${primaryText}${unitSuffix}`;
  }

  return Object.values(record)
    .filter((entry): entry is string | number => typeof entry === "string" || typeof entry === "number")
    .map((entry) => (typeof entry === "string" ? entry.trim() : String(entry)))
    .filter(Boolean)
    .join(" · ");
}

const EXTERNAL_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const EMAIL_LIKE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_LIKE_RE = /^(?:www\.)?[^\s/]+\.[^\s/]{2,}(?:[/?#].*)?$/i;

export function normalizeExternalHref(value: unknown): string {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  if (
    EXTERNAL_SCHEME_RE.test(trimmed)
    || trimmed.startsWith("//")
    || trimmed.startsWith("/")
    || trimmed.startsWith("#")
  ) {
    return trimmed;
  }

  if (EMAIL_LIKE_RE.test(trimmed)) {
    return `mailto:${trimmed}`;
  }

  if (DOMAIN_LIKE_RE.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

export function isMailtoHref(value: unknown): boolean {
  return typeof value === "string" && value.trim().toLowerCase().startsWith("mailto:");
}

/** Safely convert a tags field to a string array. */
export function ensureTagsArray(tags: unknown): string[] {
  if (Array.isArray(tags)) return tags.map(String);
  return [];
}

/** Merge class names, filtering out falsy values. */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
