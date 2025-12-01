/**
 * Shop Indigenous Nation Operations
 *
 * Operations for managing nations in the Shop Indigenous marketplace.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  Timestamp,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Nation {
  id: string;
  name: string;
  slug: string;
  alternateNames: string[];
  region: string;
  country: string;
  vendorCount: number;
  isActive: boolean;
  description?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface NationsByRegion {
  region: string;
  nations: Nation[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const NATIONS_COLLECTION = "nations";

export const REGIONS = [
  "Pacific Northwest",
  "Southwest",
  "Plains",
  "Great Lakes",
  "Southeast",
  "Northeast",
  "Alaska",
  "Canada",
] as const;

export type Region = (typeof REGIONS)[number];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function checkFirebase() {
  if (!db) {
    throw new Error("Firebase not initialized");
  }
  return db;
}

// ============================================================================
// NATION OPERATIONS
// ============================================================================

/**
 * Get all nations grouped by region
 */
export async function getNations(): Promise<NationsByRegion[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, NATIONS_COLLECTION);

    const q = query(
      ref,
      where("isActive", "==", true),
      orderBy("region", "asc"),
      orderBy("name", "asc")
    );

    const snap = await getDocs(q);

    const allNations = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Nation[];

    // Group by region
    const byRegion = new Map<string, Nation[]>();

    for (const nation of allNations) {
      const existing = byRegion.get(nation.region) || [];
      existing.push(nation);
      byRegion.set(nation.region, existing);
    }

    // Convert to array in preferred order
    const result: NationsByRegion[] = [];

    for (const region of REGIONS) {
      const nations = byRegion.get(region);
      if (nations && nations.length > 0) {
        result.push({
          region,
          nations: nations.sort((a, b) => a.name.localeCompare(b.name)),
        });
      }
    }

    return result;
  } catch (error) {
    console.error("Error getting nations:", error);
    return [];
  }
}

/**
 * Get all nations as a flat list
 */
export async function getAllNationsFlat(): Promise<Nation[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, NATIONS_COLLECTION);

    const q = query(
      ref,
      where("isActive", "==", true),
      orderBy("name", "asc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Nation[];
  } catch (error) {
    console.error("Error getting all nations:", error);
    return [];
  }
}

/**
 * Get a nation by slug
 */
export async function getNationBySlug(slug: string): Promise<Nation | null> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, NATIONS_COLLECTION);

    const q = query(
      ref,
      where("slug", "==", slug),
      where("isActive", "==", true)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      return null;
    }

    return {
      id: snap.docs[0].id,
      ...snap.docs[0].data(),
    } as Nation;
  } catch (error) {
    console.error("Error getting nation by slug:", error);
    return null;
  }
}

/**
 * Get a nation by ID
 */
export async function getNationById(id: string): Promise<Nation | null> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, NATIONS_COLLECTION, id);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return null;
    }

    return {
      id: snap.id,
      ...snap.data(),
    } as Nation;
  } catch (error) {
    console.error("Error getting nation by ID:", error);
    return null;
  }
}

/**
 * Get nations by region
 */
export async function getNationsByRegion(region: string): Promise<Nation[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, NATIONS_COLLECTION);

    const q = query(
      ref,
      where("region", "==", region),
      where("isActive", "==", true),
      orderBy("name", "asc")
    );

    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Nation[];
  } catch (error) {
    console.error("Error getting nations by region:", error);
    return [];
  }
}

/**
 * Search nations by name or alternate names
 */
export async function searchNations(
  queryStr: string,
  limit: number = 10
): Promise<Nation[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, NATIONS_COLLECTION);

    const normalizedQuery = queryStr.toLowerCase().trim();

    if (!normalizedQuery) {
      return [];
    }

    // Fetch all active nations and filter client-side
    // This handles alternate names search which Firestore can't do natively
    const q = query(ref, where("isActive", "==", true));

    const snap = await getDocs(q);

    return snap.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      .filter((nation: any) => {
        // Check main name
        const nameMatch = nation.name.toLowerCase().includes(normalizedQuery);

        // Check alternate names
        const altNameMatch = nation.alternateNames?.some((altName: string) =>
          altName.toLowerCase().includes(normalizedQuery)
        );

        return nameMatch || altNameMatch;
      })
      .sort((a: any, b: any) => {
        // Prioritize exact matches at the start
        const aExact = a.name.toLowerCase().startsWith(normalizedQuery);
        const bExact = b.name.toLowerCase().startsWith(normalizedQuery);

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        return a.name.localeCompare(b.name);
      })
      .slice(0, limit) as Nation[];
  } catch (error) {
    console.error("Error searching nations:", error);
    return [];
  }
}

/**
 * Update vendor count for a nation (admin/internal use)
 */
export async function updateNationVendorCount(
  nationId: string,
  count: number
): Promise<void> {
  try {
    const firestore = checkFirebase();
    const ref = doc(firestore, NATIONS_COLLECTION, nationId);

    await updateDoc(ref, {
      vendorCount: count,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating nation vendor count:", error);
    throw error;
  }
}

/**
 * Get nations with vendors (non-zero vendor count)
 */
export async function getNationsWithVendors(): Promise<NationsByRegion[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, NATIONS_COLLECTION);

    const q = query(
      ref,
      where("isActive", "==", true),
      where("vendorCount", ">", 0),
      orderBy("vendorCount", "desc")
    );

    const snap = await getDocs(q);

    const allNations = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Nation[];

    // Group by region
    const byRegion = new Map<string, Nation[]>();

    for (const nation of allNations) {
      const existing = byRegion.get(nation.region) || [];
      existing.push(nation);
      byRegion.set(nation.region, existing);
    }

    // Convert to array in preferred order
    const result: NationsByRegion[] = [];

    for (const region of REGIONS) {
      const nations = byRegion.get(region);
      if (nations && nations.length > 0) {
        result.push({
          region,
          nations: nations.sort((a, b) => b.vendorCount - a.vendorCount),
        });
      }
    }

    return result;
  } catch (error) {
    console.error("Error getting nations with vendors:", error);
    return [];
  }
}

/**
 * Get top nations by vendor count
 */
export async function getTopNations(limit: number = 10): Promise<Nation[]> {
  try {
    const firestore = checkFirebase();
    const ref = collection(firestore, NATIONS_COLLECTION);

    const q = query(
      ref,
      where("isActive", "==", true),
      where("vendorCount", ">", 0),
      orderBy("vendorCount", "desc")
    );

    const snap = await getDocs(q);

    return snap.docs
      .slice(0, limit)
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Nation[];
  } catch (error) {
    console.error("Error getting top nations:", error);
    return [];
  }
}

/**
 * Find nation by name (including alternate names)
 */
export async function findNationByName(name: string): Promise<Nation | null> {
  try {
    const normalizedName = name.toLowerCase().trim();
    const nations = await getAllNationsFlat();

    for (const nation of nations) {
      if (nation.name.toLowerCase() === normalizedName) {
        return nation;
      }

      if (
        nation.alternateNames?.some(
          (alt) => alt.toLowerCase() === normalizedName
        )
      ) {
        return nation;
      }
    }

    return null;
  } catch (error) {
    console.error("Error finding nation by name:", error);
    return null;
  }
}

/**
 * Get region display info
 */
export function getRegionInfo(region: Region): {
  name: string;
  description: string;
} {
  const regionInfo: Record<Region, { name: string; description: string }> = {
    "Pacific Northwest": {
      name: "Pacific Northwest",
      description:
        "Nations of the Pacific Northwest coast and inland regions of Washington, Oregon, and Idaho.",
    },
    Southwest: {
      name: "Southwest",
      description:
        "Nations of the American Southwest including Arizona, New Mexico, and surrounding areas.",
    },
    Plains: {
      name: "Great Plains",
      description:
        "Nations of the Great Plains region stretching from the Dakotas to Oklahoma and Texas.",
    },
    "Great Lakes": {
      name: "Great Lakes",
      description:
        "Nations of the Great Lakes region including Wisconsin, Michigan, Minnesota, and surrounding areas.",
    },
    Southeast: {
      name: "Southeast",
      description:
        "Nations originally from the Southeastern United States, many now in Oklahoma.",
    },
    Northeast: {
      name: "Northeast",
      description:
        "Nations of the Northeastern United States including the Haudenosaunee Confederacy.",
    },
    Alaska: {
      name: "Alaska",
      description:
        "Alaska Native peoples including Tlingit, Haida, Yup'ik, Inupiat, and others.",
    },
    Canada: {
      name: "Canada",
      description:
        "First Nations, Métis, and Inuit peoples of Canada.",
    },
  };

  return regionInfo[region] || { name: region, description: "" };
}
