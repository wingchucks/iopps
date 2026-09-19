export const CANADIAN_PROVINCES = [
  ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"],
  ["NB", "New Brunswick"], ["NL", "Newfoundland and Labrador"], ["NT", "Northwest Territories"],
  ["NS", "Nova Scotia"], ["NU", "Nunavut"], ["ON", "Ontario"], ["PE", "Prince Edward Island"],
  ["QC", "Quebec"], ["SK", "Saskatchewan"], ["YT", "Yukon"],
] as const;

export function provinceCode(value: unknown): string {
  if (typeof value !== "string") return "";
  const normalized = value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return CANADIAN_PROVINCES.find(([code, name]) => code.toLowerCase() === normalized || name.toLowerCase() === normalized)?.[0] ?? "";
}

/** Whole tokens only: ON must never match Vernon or Moncton. */
export function locationProvinceCodes(value: unknown): string[] {
  const location = typeof value === "string" ? value : value && typeof value === "object"
    ? Object.values(value).filter(item => typeof item === "string").join(", ") : "";
  const normalized = location.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return CANADIAN_PROVINCES.filter(([code, name]) => new RegExp(`(?:^|[^a-z])(?:${code}|${name})(?=$|[^a-z])`, "i").test(normalized)).map(([code]) => code);
}

export function matchesCanadianLocation(value: unknown, query: string): boolean {
  const soughtProvince = provinceCode(query);
  if (soughtProvince) return locationProvinceCodes(value).includes(soughtProvince);
  const location = typeof value === "string" ? value : value && typeof value === "object" ? Object.values(value).filter(v => typeof v === "string").join(", ") : "";
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const canonical = (text: string) => CANADIAN_PROVINCES.reduce((result, [code, name]) => result.replace(new RegExp(`\\b${name.toLowerCase()}\\b`, "g"), code.toLowerCase()), normalize(text));
  const tokens = canonical(location).split(" ");
  return canonical(query).split(" ").filter(Boolean).every(token => {
    const code = provinceCode(token);
    return code ? locationProvinceCodes(value).includes(code) : tokens.some(part => part.startsWith(token));
  });
}
