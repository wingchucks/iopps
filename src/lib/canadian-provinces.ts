export const CANADIAN_PROVINCES = [
  ["AB", "Alberta"], ["BC", "British Columbia"], ["MB", "Manitoba"],
  ["NB", "New Brunswick"], ["NL", "Newfoundland and Labrador"], ["NT", "Northwest Territories"],
  ["NS", "Nova Scotia"], ["NU", "Nunavut"], ["ON", "Ontario"], ["PE", "Prince Edward Island"],
  ["QC", "Quebec"], ["SK", "Saskatchewan"], ["YT", "Yukon"],
] as const;

export function provinceCode(value: unknown): string {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toLowerCase();
  return CANADIAN_PROVINCES.find(([code, name]) => code.toLowerCase() === normalized || name.toLowerCase() === normalized)?.[0] ?? "";
}
