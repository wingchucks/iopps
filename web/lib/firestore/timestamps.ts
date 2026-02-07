/**
 * Safely converts various timestamp formats to a JavaScript Date object.
 * Handles Firestore Timestamps, Cloud Functions timestamps, ISO strings, and Date objects.
 */
export function toDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp._seconds) return new Date(timestamp._seconds * 1000);
  if (timestamp.seconds) return new Date(timestamp.seconds * 1000);
  if (timestamp.toDate) return timestamp.toDate();
  if (typeof timestamp === "string") return new Date(timestamp);
  return null;
}
