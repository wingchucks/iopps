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

/**
 * Converts a timestamp to an ISO string for serialization.
 * Returns null if the timestamp is invalid.
 */
export function toISOString(timestamp: unknown): string | null {
  const date = toDate(timestamp);
  return date ? date.toISOString() : null;
}

/**
 * Check if a value looks like a Firestore timestamp object
 */
function isTimestampLike(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    ("seconds" in obj && "nanoseconds" in obj) ||
    ("_seconds" in obj && "_nanoseconds" in obj) ||
    typeof obj.toDate === "function"
  );
}

/**
 * Recursively serializes an object, converting all Firestore timestamps to ISO strings.
 * Safe to pass to Client Components from Server Components.
 */
export function serializeTimestamps<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => serializeTimestamps(item)) as T;
  }
  
  // Handle objects
  if (typeof obj === "object") {
    // Check if this object is a timestamp
    if (isTimestampLike(obj)) {
      return toISOString(obj) as T;
    }
    
    // Recursively process object properties
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeTimestamps(value);
    }
    return result as T;
  }
  
  return obj;
}
