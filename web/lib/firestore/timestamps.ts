/**
 * Safely converts various timestamp formats to a JavaScript Date object.
 * Handles Firestore Timestamps, Cloud Functions timestamps, ISO strings, and Date objects.
 */
export function toDate(timestamp: unknown): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === "object" && timestamp !== null) {
    const ts = timestamp as Record<string, unknown>;
    if (ts._seconds) return new Date((ts._seconds as number) * 1000);
    if (ts.seconds) return new Date((ts.seconds as number) * 1000);
    if (typeof ts.toDate === "function") return (ts.toDate as () => Date)();
  }
  if (typeof timestamp === "string") return new Date(timestamp);
  return null;
}
