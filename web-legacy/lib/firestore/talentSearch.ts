// Talent Search - For employers to find Indigenous professionals
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  checkFirebase,
} from "./shared";
import type { MemberProfile } from "@/lib/types";

// ============================================
// TYPES
// ============================================

export interface TalentSearchFilters {
  query?: string;
  location?: string;
  skills?: string[];
  experience?: "entry" | "mid" | "senior" | "";
  availability?: "yes" | "maybe" | "no" | "";
  indigenousAffiliation?: string;
  hasResume?: boolean;
  openToRelocation?: boolean;
}

export interface TalentSearchResult {
  member: MemberProfile;
  matchScore?: number;
  matchReasons?: string[];
}

export interface SavedTalent {
  id: string;
  employerId: string;
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  notes?: string;
  tags?: string[];
  savedAt: Timestamp | null;
}

export interface TalentSearchOptions {
  filters: TalentSearchFilters;
  limit?: number;
  cursor?: unknown;
}

// ============================================
// SEARCH FUNCTIONS
// ============================================

/**
 * Search for talent matching the given filters
 * Only returns members who have made their profiles visible to employers
 */
export async function searchTalent(
  options: TalentSearchOptions
): Promise<{ results: TalentSearchResult[]; hasMore: boolean; cursor?: unknown }> {
  const firestore = checkFirebase();
  if (!firestore) {
    return { results: [], hasMore: false };
  }

  try {
    const { filters, limit: resultLimit = 20 } = options;
    const membersRef = collection(firestore, "members");
    const constraints: unknown[] = [];

    // Only get members with public/employer-visible profiles
    // Check memberSettings for profile visibility
    constraints.push(where("profileComplete", "==", true));

    // Filter by availability if specified
    if (filters.availability) {
      constraints.push(where("availableForInterviews", "==", filters.availability));
    } else {
      // Default to those open to opportunities
      constraints.push(where("availableForInterviews", "in", ["yes", "maybe"]));
    }

    // Filter by skills (up to 10)
    if (filters.skills && filters.skills.length > 0) {
      constraints.push(where("skills", "array-contains-any", filters.skills.slice(0, 10)));
    }

    // Add ordering and limit
    constraints.push(orderBy("updatedAt", "desc"));
    constraints.push(limit(resultLimit + 1));

    // Start after cursor if provided
    if (options.cursor) {
      constraints.push(startAfter(options.cursor));
    }

    const q = query(membersRef, ...(constraints as Parameters<typeof query>[1][]));
    const snap = await getDocs(q);

    let members = snap.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as MemberProfile[];

    // Check if there are more results
    const hasMore = members.length > resultLimit;
    if (hasMore) {
      members = members.slice(0, resultLimit);
    }

    // Get cursor for pagination
    const lastDoc = snap.docs[snap.docs.length - 1];

    // Client-side filtering for text search and location
    if (filters.query) {
      const searchLower = filters.query.toLowerCase();
      members = members.filter(
        (m) =>
          m.displayName?.toLowerCase().includes(searchLower) ||
          m.bio?.toLowerCase().includes(searchLower) ||
          m.tagline?.toLowerCase().includes(searchLower) ||
          m.indigenousAffiliation?.toLowerCase().includes(searchLower) ||
          m.skills?.some((s) => s.toLowerCase().includes(searchLower))
      );
    }

    if (filters.location) {
      const locationLower = filters.location.toLowerCase();
      members = members.filter((m) =>
        m.location?.toLowerCase().includes(locationLower)
      );
    }

    // Filter by experience level (based on experience array length as proxy)
    if (filters.experience) {
      members = members.filter((m) => {
        const experienceCount = m.experience?.length || 0;
        switch (filters.experience) {
          case "entry":
            return experienceCount <= 1;
          case "mid":
            return experienceCount >= 2 && experienceCount <= 3;
          case "senior":
            return experienceCount >= 4;
          default:
            return true;
        }
      });
    }

    // Filter by indigenous affiliation
    if (filters.indigenousAffiliation) {
      members = members.filter((m) =>
        m.indigenousAffiliation?.toLowerCase().includes(filters.indigenousAffiliation!.toLowerCase())
      );
    }

    // Filter by resume
    if (filters.hasResume) {
      members = members.filter((m) => m.resumeUrl && m.resumeUrl.length > 0);
    }

    // Remove members without display names
    members = members.filter((m) => m.displayName && m.displayName.trim().length > 0);

    // Calculate match scores based on filters
    const results: TalentSearchResult[] = members.map((member) => {
      const matchReasons: string[] = [];
      let matchScore = 50; // Base score

      // Skill matches
      if (filters.skills && filters.skills.length > 0) {
        const matchingSkills = member.skills?.filter((s) =>
          filters.skills!.some((fs) => s.toLowerCase().includes(fs.toLowerCase()))
        );
        if (matchingSkills && matchingSkills.length > 0) {
          matchScore += matchingSkills.length * 10;
          matchReasons.push(`${matchingSkills.length} matching skills`);
        }
      }

      // Location match
      if (filters.location && member.location?.toLowerCase().includes(filters.location.toLowerCase())) {
        matchScore += 15;
        matchReasons.push("Location match");
      }

      // Experience match
      if (filters.experience) {
        matchScore += 10;
        matchReasons.push("Experience level match");
      }

      // Has resume
      if (member.resumeUrl) {
        matchScore += 5;
      }

      // Active profile (updated recently)
      const updatedAt = member.updatedAt as Timestamp;
      if (updatedAt) {
        const daysSinceUpdate = (Date.now() - updatedAt.toMillis()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 7) {
          matchScore += 10;
          matchReasons.push("Recently active");
        } else if (daysSinceUpdate < 30) {
          matchScore += 5;
        }
      }

      // Cap score at 100
      matchScore = Math.min(100, matchScore);

      return { member, matchScore, matchReasons };
    });

    // Sort by match score
    results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return {
      results,
      hasMore,
      cursor: lastDoc,
    };
  } catch (error) {
    console.error("Error searching talent:", error);
    return { results: [], hasMore: false };
  }
}

// ============================================
// SAVED TALENT / TALENT POOL
// ============================================

/**
 * Save a talent to employer's talent pool
 */
export async function saveTalent(
  employerId: string,
  memberId: string,
  memberName: string,
  memberAvatar?: string,
  notes?: string,
  tags?: string[]
): Promise<string> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not initialized");

  const savedRef = doc(collection(firestore, "savedTalent"));
  await setDoc(savedRef, {
    employerId,
    memberId,
    memberName,
    memberAvatar: memberAvatar || null,
    notes: notes || null,
    tags: tags || [],
    savedAt: serverTimestamp(),
  });

  return savedRef.id;
}

/**
 * Remove talent from saved list
 */
export async function unsaveTalent(employerId: string, memberId: string): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) return;

  const q = query(
    collection(firestore, "savedTalent"),
    where("employerId", "==", employerId),
    where("memberId", "==", memberId)
  );
  const snap = await getDocs(q);

  for (const doc of snap.docs) {
    await deleteDoc(doc.ref);
  }
}

/**
 * Check if talent is saved
 */
export async function isTalentSaved(employerId: string, memberId: string): Promise<boolean> {
  const firestore = checkFirebase();
  if (!firestore) return false;

  const q = query(
    collection(firestore, "savedTalent"),
    where("employerId", "==", employerId),
    where("memberId", "==", memberId),
    limit(1)
  );
  const snap = await getDocs(q);

  return !snap.empty;
}

/**
 * Get all saved talent for an employer
 */
export async function getSavedTalent(employerId: string): Promise<SavedTalent[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    const q = query(
      collection(firestore, "savedTalent"),
      where("employerId", "==", employerId),
      orderBy("savedAt", "desc")
    );
    const snap = await getDocs(q);

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SavedTalent[];
  } catch (error) {
    console.error("Error getting saved talent:", error);
    return [];
  }
}

/**
 * Update notes/tags for saved talent
 */
export async function updateSavedTalent(
  savedId: string,
  updates: { notes?: string; tags?: string[] }
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not initialized");

  const docRef = doc(firestore, "savedTalent", savedId);
  await setDoc(docRef, updates, { merge: true });
}

// ============================================
// TALENT ANALYTICS
// ============================================

/**
 * Track when an employer views a talent profile
 */
export async function trackTalentView(employerId: string, memberId: string): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) return;

  try {
    await setDoc(doc(collection(firestore, "talentViews")), {
      employerId,
      memberId,
      viewedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error tracking talent view:", error);
  }
}

/**
 * Get popular skills in the talent pool
 */
export async function getPopularSkills(topN: number = 20): Promise<{ skill: string; count: number }[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    // Get a sample of members and aggregate skills
    const q = query(
      collection(firestore, "members"),
      where("availableForInterviews", "in", ["yes", "maybe"]),
      limit(100)
    );
    const snap = await getDocs(q);

    const skillCounts: Record<string, number> = {};
    snap.docs.forEach((doc) => {
      const skills = doc.data().skills as string[] | undefined;
      if (skills) {
        skills.forEach((skill) => {
          const normalized = skill.toLowerCase().trim();
          skillCounts[normalized] = (skillCounts[normalized] || 0) + 1;
        });
      }
    });

    return Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);
  } catch (error) {
    console.error("Error getting popular skills:", error);
    return [];
  }
}

/**
 * Get talent by location distribution
 */
export async function getTalentByLocation(): Promise<{ location: string; count: number }[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    const q = query(
      collection(firestore, "members"),
      where("availableForInterviews", "in", ["yes", "maybe"]),
      limit(200)
    );
    const snap = await getDocs(q);

    const locationCounts: Record<string, number> = {};
    snap.docs.forEach((doc) => {
      const location = (doc.data().province || doc.data().location || "Unknown") as string;
      const normalized = location.trim();
      if (normalized) {
        locationCounts[normalized] = (locationCounts[normalized] || 0) + 1;
      }
    });

    return Object.entries(locationCounts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error("Error getting talent by location:", error);
    return [];
  }
}
