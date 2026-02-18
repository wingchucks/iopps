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
