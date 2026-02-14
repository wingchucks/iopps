// Saved Searches - Allow users to save and re-run their favorite searches
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  checkFirebase,
} from "./shared";

// ============================================
// TYPES
// ============================================

export interface SearchFilters {
  query?: string;
  categories?: string[]; // "jobs", "scholarships", "events", "training", "businesses"
  location?: string;
  remoteOnly?: boolean;
  indigenousOnly?: boolean;
  dateRange?: {
    start?: string;
    end?: string;
  };
  salaryRange?: {
    min?: number;
    max?: number;
  };
  employmentTypes?: string[]; // "full-time", "part-time", "contract", etc.
  experienceLevels?: string[]; // "entry", "mid", "senior"
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: SearchFilters;
  alertEnabled: boolean; // Send notifications for new matches
  alertFrequency?: "instant" | "daily" | "weekly";
  lastRun?: Timestamp | null;
  resultCount?: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface SearchHistory {
  id: string;
  userId: string;
  query: string;
  filters: SearchFilters;
  resultCount: number;
  searchedAt: Timestamp | null;
}

// ============================================
// SAVED SEARCHES
// ============================================

/**
 * Save a search for later use
 */
export async function saveSearch(
  userId: string,
  name: string,
  filters: SearchFilters,
  alertEnabled: boolean = false,
  alertFrequency?: "instant" | "daily" | "weekly"
): Promise<string> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not initialized");

  const searchRef = doc(collection(firestore, "savedSearches"));
  const searchData: Omit<SavedSearch, "id"> = {
    userId,
    name,
    filters,
    alertEnabled,
    alertFrequency: alertEnabled ? (alertFrequency || "daily") : undefined,
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };

  await setDoc(searchRef, searchData);
  return searchRef.id;
}

/**
 * Get all saved searches for a user
 */
export async function getSavedSearches(userId: string): Promise<SavedSearch[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    const searchesQuery = query(
      collection(firestore, "savedSearches"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(searchesQuery);
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as SavedSearch));
  } catch (error) {
    console.error("Error getting saved searches:", error);
    return [];
  }
}

/**
 * Get a single saved search
 */
export async function getSavedSearch(searchId: string): Promise<SavedSearch | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  try {
    const searchRef = doc(firestore, "savedSearches", searchId);
    const snap = await getDoc(searchRef);

    if (!snap.exists()) return null;

    return {
      id: snap.id,
      ...snap.data(),
    } as SavedSearch;
  } catch (error) {
    console.error("Error getting saved search:", error);
    return null;
  }
}

/**
 * Update a saved search
 */
export async function updateSavedSearch(
  searchId: string,
  updates: Partial<Omit<SavedSearch, "id" | "userId" | "createdAt">>
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not initialized");

  const searchRef = doc(firestore, "savedSearches", searchId);
  await setDoc(
    searchRef,
    {
      ...updates,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Delete a saved search
 */
export async function deleteSavedSearch(searchId: string): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not initialized");

  await deleteDoc(doc(firestore, "savedSearches", searchId));
}

/**
 * Update saved search with last run info
 */
export async function markSearchRun(searchId: string, resultCount: number): Promise<void> {
  await updateSavedSearch(searchId, {
    lastRun: serverTimestamp() as unknown as Timestamp,
    resultCount,
  });
}

/**
 * Toggle alert for saved search
 */
export async function toggleSearchAlert(
  searchId: string,
  enabled: boolean,
  frequency?: "instant" | "daily" | "weekly"
): Promise<void> {
  await updateSavedSearch(searchId, {
    alertEnabled: enabled,
    alertFrequency: enabled ? (frequency || "daily") : undefined,
  });
}

// ============================================
// SEARCH HISTORY
// ============================================

/**
 * Record a search in history
 */
export async function recordSearch(
  userId: string,
  searchQuery: string,
  filters: SearchFilters,
  resultCount: number
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) return;

  try {
    const historyRef = doc(collection(firestore, "searchHistory"));
    await setDoc(historyRef, {
      userId,
      query: searchQuery,
      filters,
      resultCount,
      searchedAt: serverTimestamp(),
    });

    // Clean up old history (keep last 50)
    const oldHistoryQuery = query(
      collection(firestore, "searchHistory"),
      where("userId", "==", userId),
      orderBy("searchedAt", "desc"),
      limit(100)
    );

    const snap = await getDocs(oldHistoryQuery);
    const toDelete = snap.docs.slice(50);

    for (const docSnap of toDelete) {
      await deleteDoc(docSnap.ref);
    }
  } catch (error) {
    console.error("Error recording search:", error);
  }
}

/**
 * Get recent search history
 */
export async function getSearchHistory(
  userId: string,
  maxResults: number = 10
): Promise<SearchHistory[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  try {
    const historyQuery = query(
      collection(firestore, "searchHistory"),
      where("userId", "==", userId),
      orderBy("searchedAt", "desc"),
      limit(maxResults)
    );

    const snap = await getDocs(historyQuery);
    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as SearchHistory));
  } catch (error) {
    console.error("Error getting search history:", error);
    return [];
  }
}

/**
 * Clear search history
 */
export async function clearSearchHistory(userId: string): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) return;

  try {
    const historyQuery = query(
      collection(firestore, "searchHistory"),
      where("userId", "==", userId)
    );

    const snap = await getDocs(historyQuery);
    for (const doc of snap.docs) {
      await deleteDoc(doc.ref);
    }
  } catch (error) {
    console.error("Error clearing search history:", error);
  }
}

/**
 * Get popular/suggested searches (based on community trends)
 */
export async function getSuggestedSearches(): Promise<string[]> {
  // Return some common search terms
  // In a production system, this would be based on aggregated search data
  return [
    "Remote jobs",
    "Indigenous scholarships",
    "Technology careers",
    "Healthcare jobs",
    "Business grants",
    "Training programs",
    "Pow wow events",
    "Construction jobs",
    "Government positions",
    "Non-profit opportunities",
  ];
}
