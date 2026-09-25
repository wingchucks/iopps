import { CANADIAN_PROVINCES, provinceCode } from "./canadian-provinces";

// Agreed 2026-09-25: the scholarship location filter means where applicants may
// live or study (eligibility), not where the provider is. A blank or unclear
// statement is "not stated", never Canada-wide.
export type EligibilityScope =
  | { kind: "canada" }
  | { kind: "provinces"; provinces: string[] }
  | { kind: "unknown" };

/**
 * Where applicants must live or study. An explicit `eligibilityRegions` list
 * (["CANADA"] or province codes) wins; otherwise the curated eligibility note in
 * `province` is read conservatively: only its first clause states geography, and
 * later clauses (preferences, program details) never widen or narrow it.
 */
export function scholarshipEligibility(item: Record<string, unknown>): EligibilityScope {
  const explicit = Array.isArray(item.eligibilityRegions)
    ? item.eligibilityRegions.filter((value): value is string => typeof value === "string")
    : [];
  if (explicit.some(value => value.trim().toUpperCase() === "CANADA")) return { kind: "canada" };
  const explicitCodes = [...new Set(explicit.map(provinceCode).filter(Boolean))];
  if (explicitCodes.length) return { kind: "provinces", provinces: explicitCodes };

  const note = typeof item.province === "string" ? item.province.trim() : "";
  if (!note) return { kind: "unknown" };
  const lead = note.split(/[;.]/)[0].trim();
  if (/^canada\b/i.test(lead) || /^(?:students|applicants)\b.*\b(?:within|anywhere in|across) canada$/i.test(lead)) return { kind: "canada" };
  const provinces = provincesInProse(lead);
  return provinces.length ? { kind: "provinces", provinces } : { kind: "unknown" };
}

// Prose, unlike a location field, uses words like "on": codes count only in
// capitals ("BC", "ON"); full names count in any case.
function provincesInProse(text: string): string[] {
  const plain = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const lower = plain.toLowerCase();
  return CANADIAN_PROVINCES.filter(([code, name]) =>
    new RegExp(`(?:^|[^A-Za-z])${code}(?=$|[^A-Za-z])`).test(plain) ||
    new RegExp(`(?:^|[^a-z])${name.toLowerCase()}(?=$|[^a-z])`).test(lower),
  ).map(([code]) => code);
}

/** Whether a scholarship is open to someone in the given province (unknown is neither yes nor no). */
export function eligibleInProvince(scope: EligibilityScope, province: string): boolean | null {
  if (scope.kind === "unknown") return null;
  return scope.kind === "canada" || scope.provinces.includes(province);
}

export function eligibilityLabel(scope: EligibilityScope): string {
  if (scope.kind === "canada") return "Eligible across Canada";
  if (scope.kind === "unknown") return "Where applicants can live or study isn't stated";
  const names = scope.provinces.map(code => CANADIAN_PROVINCES.find(([province]) => province === code)?.[1] ?? code);
  return `Eligible in ${names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}` : names[0]}`;
}
