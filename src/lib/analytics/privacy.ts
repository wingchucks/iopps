/** Coarse, fixed-cardinality routes only: IDs, searches and URL tokens are private. */
export function anonymousVisitorId(value: unknown): string | undefined {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase() : undefined;
}

export function analyticsPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/other";
  const path = value.split(/[?#]/, 1)[0];
  if (path === "/") return "/";
  const section = path.split("/")[1];
  return ["jobs", "scholarships", "events", "training", "businesses", "schools", "search", "pricing", "about", "contact"].includes(section)
    ? `/${section}` : "/other";
}
