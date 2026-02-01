/**
 * Server-side member profile queries using Firebase Admin SDK
 * 
 * Use this for Server Components (pages, layouts) that need to fetch
 * member data during SSR/RSC rendering.
 */
import { db as adminDb } from "@/lib/firebase-admin";
import type { MemberProfile } from "@/lib/types";

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

    // Convert Firestore Timestamps to serializable format
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    } as MemberProfile;
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
        result.set(doc.id, {
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        } as MemberProfile);
      });
    }

    return result;
  } catch (error) {
    console.error("Error fetching member profiles server-side:", error);
    return result;
  }
}
