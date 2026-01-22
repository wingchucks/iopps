// Directory Index - Firestore operations for fast directory queries
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  db,
  employerCollection,
  directoryIndexCollection,
  jobsCollection,
  educationProgramsCollection,
  servicesCollection,
  vendorsCollection,
  conferencesCollection,
  powwowsCollection,
  businessGrantsCollection,
  scholarshipsCollection,
  checkFirebase,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "./shared";
import type {
  DirectoryEntry,
  DirectoryFilters,
  DirectoryResults,
  DirectorySortOption,
  OrganizationProfile,
  OrganizationModule,
  OrgType,
} from "@/lib/types";
import { computePrimaryCTAType } from "./organizations";

// ============================================
// DIRECTORY INDEX CRUD
// ============================================

/**
 * Build directory entry from organization profile
 */
export async function buildDirectoryEntry(
  profile: OrganizationProfile
): Promise<DirectoryEntry> {
  const firestore = checkFirebase();

  // Count content for each module
  const counts = {
    jobsCount: 0,
    programsCount: 0,
    scholarshipsCount: 0,
    offeringsCount: 0,
    eventsCount: 0,
    fundingCount: 0,
  };

  if (firestore) {
    const orgId = profile.id;

    // Count jobs
    try {
      const jobsQuery = query(
        collection(firestore, jobsCollection),
        where("employerId", "==", orgId),
        where("active", "==", true)
      );
      const jobsSnap = await getDocs(jobsQuery);
      counts.jobsCount = jobsSnap.size;
    } catch {
      // Ignore errors, just keep count at 0
    }

    // Count programs (education)
    try {
      const programsQuery = query(
        collection(firestore, educationProgramsCollection),
        where("schoolId", "==", profile.moduleSettings?.educate?.schoolId || orgId),
        where("isPublished", "==", true)
      );
      const programsSnap = await getDocs(programsQuery);
      counts.programsCount = programsSnap.size;
    } catch {
      // Ignore errors
    }

    // Count scholarships
    try {
      const scholarshipsQuery = query(
        collection(firestore, scholarshipsCollection),
        where("employerId", "==", orgId),
        where("active", "==", true)
      );
      const scholarshipsSnap = await getDocs(scholarshipsQuery);
      counts.scholarshipsCount = scholarshipsSnap.size;
    } catch {
      // Ignore errors
    }

    // Count offerings (vendors + services)
    try {
      const vendorId = profile.moduleSettings?.sell?.vendorId;
      if (vendorId) {
        // Count products from vendor (using vendors collection for product count)
        // For now, count as 1 if vendor exists
        counts.offeringsCount = 1;
      }

      const servicesQuery = query(
        collection(firestore, servicesCollection),
        where("userId", "==", orgId),
        where("status", "==", "active")
      );
      const servicesSnap = await getDocs(servicesQuery);
      counts.offeringsCount += servicesSnap.size;
    } catch {
      // Ignore errors
    }

    // Count events (conferences + powwows)
    try {
      const conferencesQuery = query(
        collection(firestore, conferencesCollection),
        where("employerId", "==", orgId),
        where("active", "==", true)
      );
      const conferencesSnap = await getDocs(conferencesQuery);
      counts.eventsCount = conferencesSnap.size;

      const powwowsQuery = query(
        collection(firestore, powwowsCollection),
        where("employerId", "==", orgId),
        where("active", "==", true)
      );
      const powwowsSnap = await getDocs(powwowsQuery);
      counts.eventsCount += powwowsSnap.size;
    } catch {
      // Ignore errors
    }

    // Count funding opportunities
    try {
      const fundingQuery = query(
        collection(firestore, businessGrantsCollection),
        where("createdBy", "==", orgId),
        where("status", "==", "active")
      );
      const fundingSnap = await getDocs(fundingQuery);
      counts.fundingCount = fundingSnap.size;
    } catch {
      // Ignore errors
    }
  }

  const enabledModules = profile.enabledModules || [];
  const primaryCTAType = computePrimaryCTAType(enabledModules, counts);

  // Determine if Indigenous-owned
  const isIndigenousOwned =
    profile.orgType === "INDIGENOUS_BUSINESS" ||
    profile.indigenousVerification?.isIndigenousOwned ||
    profile.trcAlignment?.isIndigenousOwned ||
    false;

  return {
    id: profile.id,
    orgId: profile.id,
    name: profile.organizationName,
    slug: profile.slug,
    orgType: profile.orgType || "EMPLOYER",
    tagline: profile.tagline || profile.description?.substring(0, 120),
    province: profile.province,
    city: profile.city,
    categories: profile.categories || [],
    tags: profile.tags || [],
    enabledModules,
    primaryCTAType,
    logoUrl: profile.logoUrl,
    isIndigenousOwned,
    nation: profile.nation || profile.indigenousVerification?.nationAffiliation,
    counts,
    directoryVisible: profile.directoryVisible ?? true,
    createdAt: profile.createdAt || null,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };
}

/**
 * Update or create directory index entry for an organization
 */
export async function upsertDirectoryEntry(profile: OrganizationProfile): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  // Only index published, visible, and non-deleted profiles
  const isDeleted = profile.status === "deleted" || !!profile.deletedAt;
  if (profile.publicationStatus !== "PUBLISHED" || !profile.directoryVisible || isDeleted) {
    // Remove from index if exists
    await removeDirectoryEntry(profile.id);
    return;
  }

  const entry = await buildDirectoryEntry(profile);
  const ref = doc(firestore, directoryIndexCollection, profile.id);
  await setDoc(ref, entry);
}

/**
 * Remove directory entry
 */
export async function removeDirectoryEntry(orgId: string): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) return;

  const ref = doc(firestore, directoryIndexCollection, orgId);
  try {
    await deleteDoc(ref);
  } catch {
    // Entry may not exist, ignore errors
  }
}

/**
 * Get directory entry by ID
 */
export async function getDirectoryEntry(orgId: string): Promise<DirectoryEntry | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  const ref = doc(firestore, directoryIndexCollection, orgId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return snap.data() as DirectoryEntry;
}

/**
 * Get directory entry by slug
 */
export async function getDirectoryEntryBySlug(slug: string): Promise<DirectoryEntry | null> {
  const firestore = checkFirebase();
  if (!firestore) return null;

  const q = query(
    collection(firestore, directoryIndexCollection),
    where("slug", "==", slug),
    where("directoryVisible", "==", true),
    limit(1)
  );
  const snap = await getDocs(q);

  if (snap.empty) return null;
  return snap.docs[0].data() as DirectoryEntry;
}

// ============================================
// DIRECTORY LISTING WITH FILTERS
// ============================================

/**
 * Query directory entries with filters
 */
export async function queryDirectory(
  filters: DirectoryFilters = {},
  sort: DirectorySortOption = "name_asc",
  page: number = 1,
  pageSize: number = 24,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<DirectoryResults> {
  const firestore = checkFirebase();
  if (!firestore) {
    return {
      entries: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
    };
  }

  // Build query constraints
  const constraints: any[] = [where("directoryVisible", "==", true)];

  // Filter by org type
  if (filters.orgType) {
    if (Array.isArray(filters.orgType)) {
      if (filters.orgType.length > 0) {
        constraints.push(where("orgType", "in", filters.orgType));
      }
    } else {
      constraints.push(where("orgType", "==", filters.orgType));
    }
  }

  // Filter by province
  if (filters.province) {
    constraints.push(where("province", "==", filters.province));
  }

  // Filter by Indigenous-owned
  if (filters.isIndigenousOwned !== undefined) {
    constraints.push(where("isIndigenousOwned", "==", filters.isIndigenousOwned));
  }

  // Sort order
  switch (sort) {
    case "name_desc":
      constraints.push(orderBy("name", "desc"));
      break;
    case "newest":
      constraints.push(orderBy("createdAt", "desc"));
      break;
    case "oldest":
      constraints.push(orderBy("createdAt", "asc"));
      break;
    case "name_asc":
    default:
      constraints.push(orderBy("name", "asc"));
      break;
  }

  // Pagination
  constraints.push(limit(pageSize + 1)); // Fetch one extra to check if there's more

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(firestore, directoryIndexCollection), ...constraints);
  const snap = await getDocs(q);

  let entries = snap.docs.map((docSnap) => docSnap.data() as DirectoryEntry);

  // Client-side filtering for complex queries Firestore can't handle
  // Filter by modules
  if (filters.modules && filters.modules.length > 0) {
    entries = entries.filter((entry) =>
      filters.modules!.some((m) => entry.enabledModules.includes(m))
    );
  }

  // Filter by categories
  if (filters.categories && filters.categories.length > 0) {
    entries = entries.filter((entry) =>
      filters.categories!.some(
        (c) => entry.categories?.includes(c) || entry.tags?.includes(c)
      )
    );
  }

  // Filter by search (name, tagline)
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    entries = entries.filter(
      (entry) =>
        entry.name.toLowerCase().includes(searchLower) ||
        entry.tagline?.toLowerCase().includes(searchLower) ||
        entry.tags?.some((t) => t.toLowerCase().includes(searchLower)) ||
        entry.categories?.some((c) => c.toLowerCase().includes(searchLower))
    );
  }

  // Filter by city (case-insensitive partial match)
  if (filters.city) {
    const cityLower = filters.city.toLowerCase();
    entries = entries.filter((entry) =>
      entry.city?.toLowerCase().includes(cityLower)
    );
  }

  // Check if there are more results
  const hasMore = entries.length > pageSize;
  if (hasMore) {
    entries = entries.slice(0, pageSize);
  }

  return {
    entries,
    total: entries.length, // Note: This is approximate for filtered queries
    page,
    pageSize,
    hasMore,
  };
}

/**
 * Simple directory listing for homepage/featured section
 */
export async function listDirectoryEntries(
  limitCount: number = 24,
  orgTypes?: OrgType[]
): Promise<DirectoryEntry[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  const constraints: any[] = [where("directoryVisible", "==", true)];

  if (orgTypes && orgTypes.length > 0) {
    constraints.push(where("orgType", "in", orgTypes));
  }

  constraints.push(orderBy("name", "asc"));
  constraints.push(limit(limitCount));

  const q = query(collection(firestore, directoryIndexCollection), ...constraints);
  const snap = await getDocs(q);

  return snap.docs.map((docSnap) => docSnap.data() as DirectoryEntry);
}

/**
 * Get featured/highlighted directory entries
 */
export async function getFeaturedDirectoryEntries(
  limitCount: number = 6
): Promise<DirectoryEntry[]> {
  const firestore = checkFirebase();
  if (!firestore) return [];

  // For now, just get Indigenous-owned businesses first, then others
  const q = query(
    collection(firestore, directoryIndexCollection),
    where("directoryVisible", "==", true),
    where("isIndigenousOwned", "==", true),
    orderBy("name", "asc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);

  let entries = snap.docs.map((docSnap) => docSnap.data() as DirectoryEntry);

  // If we don't have enough Indigenous-owned, get more
  if (entries.length < limitCount) {
    const remaining = limitCount - entries.length;
    const additionalQ = query(
      collection(firestore, directoryIndexCollection),
      where("directoryVisible", "==", true),
      orderBy("name", "asc"),
      limit(remaining + entries.length)
    );
    const additionalSnap = await getDocs(additionalQ);
    const additionalEntries = additionalSnap.docs
      .map((docSnap) => docSnap.data() as DirectoryEntry)
      .filter((e) => !entries.some((existing) => existing.id === e.id));

    entries = [...entries, ...additionalEntries.slice(0, remaining)];
  }

  return entries;
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Rebuild entire directory index from employers collection
 */
export async function rebuildDirectoryIndex(): Promise<{
  processed: number;
  indexed: number;
  errors: string[];
}> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const result = { processed: 0, indexed: 0, errors: [] as string[] };

  // Get all employers
  const snap = await getDocs(collection(firestore, employerCollection));

  for (const docSnap of snap.docs) {
    result.processed++;
    try {
      const profile = { id: docSnap.id, ...docSnap.data() } as OrganizationProfile;

      // Check if profile is deleted
      const isDeleted = profile.status === "deleted" || !!profile.deletedAt;

      // Only index published, visible, and non-deleted profiles
      if (profile.publicationStatus === "PUBLISHED" && profile.directoryVisible && !isDeleted) {
        await upsertDirectoryEntry(profile);
        result.indexed++;
      } else {
        // Remove from index if not publishable or deleted
        await removeDirectoryEntry(profile.id);
      }
    } catch (err) {
      result.errors.push(`${docSnap.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return result;
}

/**
 * Update content counts for a specific organization
 */
export async function refreshDirectoryEntryCounts(orgId: string): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  // Get current profile
  const profileRef = doc(firestore, employerCollection, orgId);
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) return;

  const profile = { id: profileSnap.id, ...profileSnap.data() } as OrganizationProfile;

  // Only update if published
  if (profile.publicationStatus === "PUBLISHED" && profile.directoryVisible) {
    await upsertDirectoryEntry(profile);
  }
}
