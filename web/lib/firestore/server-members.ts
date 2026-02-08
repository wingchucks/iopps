/**
 * Server-side member profile queries using Firebase Admin SDK
 *
 * Use this for Server Components (pages, layouts) that need to fetch
 * member data during SSR/RSC rendering.
 */
import { db as adminDb } from "@/lib/firebase-admin";
import type { MemberProfile } from "@/lib/types";

/**
 * Recursively convert all Firestore Timestamps (and other non-serializable
 * types) in a document to plain JSON-safe values. This is required because
 * React Server Components cannot serialize Firestore Timestamp objects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeFirestoreData(obj: any): any {
  if (obj == null) return obj;

  // Firestore Timestamp — has toDate()
  if (typeof obj.toDate === "function") {
    return obj.toDate().toISOString();
  }

  // Firestore GeoPoint — has latitude/longitude
  if (typeof obj.latitude === "number" && typeof obj.longitude === "number" && obj.constructor?.name === "GeoPoint") {
    return { latitude: obj.latitude, longitude: obj.longitude };
  }

  // Array
  if (Array.isArray(obj)) {
    return obj.map(serializeFirestoreData);
  }

  // Plain object
  if (typeof obj === "object" && obj.constructor === Object) {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      out[key] = serializeFirestoreData(value);
    }
    return out;
  }

  // Primitives (string, number, boolean) pass through
  return obj;
}

/**
 * Get a member profile by user ID (server-side)
 * Uses Firebase Admin SDK for server-side rendering
 */
export async function getMemberProfileServer(
  userId: string
): Promise<MemberProfile | null> {
  if (!adminDb) {
    console.error("Firebase Admin not initialized - cannot fetch member profile server-side");
    return null;
  }

  try {
    const docRef = adminDb.collection("memberProfiles").doc(userId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return null;
    }

    const data = snap.data();
    if (!data) return null;

    // Recursively convert all Firestore Timestamps/GeoPoints to plain values
    return serializeFirestoreData(data) as MemberProfile;
  } catch (error) {
    console.error("Error fetching member profile server-side:", error);
    throw error;
  }
}

/**
 * Get multiple member profiles by user IDs (server-side)
 */
export async function getMemberProfilesServer(
  userIds: string[]
): Promise<Map<string, MemberProfile>> {
  const result = new Map<string, MemberProfile>();
  
  if (!adminDb || userIds.length === 0) {
    return result;
  }

  try {
    // Firestore 'in' queries are limited to 30 items
    const chunks = [];
    for (let i = 0; i < userIds.length; i += 30) {
      chunks.push(userIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const snapshot = await adminDb
        .collection("memberProfiles")
        .where("userId", "in", chunk)
        .get();

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        result.set(doc.id, serializeFirestoreData(data) as MemberProfile);
      });
    }

    return result;
  } catch (error) {
    console.error("Error fetching member profiles server-side:", error);
    return result;
  }
}
