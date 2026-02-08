// Business Grants Firestore operations
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  db,
  businessGrantsCollection,
  checkFirebase,
} from "./shared";
import type { QueryConstraint } from "./shared";
import type { BusinessGrant, BusinessGrantStatus, BusinessGrantType, NorthAmericanRegion } from "@/lib/types";

// ============================================
// QUERY OPTIONS
// ============================================

export interface ListBusinessGrantsOptions {
  status?: BusinessGrantStatus | "all";
  grantType?: BusinessGrantType | "all";
  region?: NorthAmericanRegion | "all";
  indigenousOwned?: boolean;
  featured?: boolean;
  limitCount?: number;
}

// ============================================
// PUBLIC LISTING FUNCTIONS
// ============================================

export async function listBusinessGrants(
  options: ListBusinessGrantsOptions = {}
): Promise<BusinessGrant[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const {
      status = "active",
      grantType = "all",
      region = "all",
      indigenousOwned,
      featured,
      limitCount = 50,
    } = options;

    const ref = collection(firestore, businessGrantsCollection);
    const constraints: QueryConstraint[] = [];

    // Status filter
    if (status !== "all") {
      constraints.push(where("status", "==", status));
    }

    // Grant type filter
    if (grantType !== "all") {
      constraints.push(where("grantType", "==", grantType));
    }

    // Featured filter
    if (featured !== undefined) {
      constraints.push(where("featured", "==", featured));
    }

    // Order by featured first, then by creation date
    constraints.push(orderBy("featured", "desc"));
    constraints.push(orderBy("createdAt", "desc"));

    if (limitCount > 0) {
      constraints.push(limit(limitCount));
    }

    const q = query(ref, ...constraints);
    const snap = await getDocs(q);

    let grants = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BusinessGrant));

    // Client-side filtering for region (array-contains)
    if (region !== "all") {
      grants = grants.filter((g) =>
        g.eligibility?.provinces?.includes(region) ||
        !g.eligibility?.provinces?.length // Include grants without region restrictions
      );
    }

    // Client-side filtering for indigenous owned
    if (indigenousOwned !== undefined) {
      grants = grants.filter((g) => g.eligibility?.indigenousOwned === indigenousOwned);
    }

    return grants;
  } catch (error) {
    console.error("Error listing business grants:", error);
    return [];
  }
}

export async function getFeaturedGrants(count: number = 3): Promise<BusinessGrant[]> {
  return listBusinessGrants({
    status: "active",
    featured: true,
    limitCount: count,
  });
}

// ============================================
// SINGLE GRANT RETRIEVAL
// ============================================

export async function getBusinessGrant(id: string): Promise<BusinessGrant | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return null;

    const ref = doc(firestore, businessGrantsCollection, id);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as BusinessGrant;
  } catch (error) {
    console.error("Error getting business grant:", error);
    return null;
  }
}

export async function getBusinessGrantBySlug(slug: string): Promise<BusinessGrant | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return null;

    const ref = collection(firestore, businessGrantsCollection);
    const q = query(ref, where("slug", "==", slug), limit(1));
    const snap = await getDocs(q);

    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as BusinessGrant;
  } catch (error) {
    console.error("Error getting grant by slug:", error);
    return null;
  }
}

// ============================================
// ANALYTICS
// ============================================

export async function incrementGrantViews(grantId: string): Promise<void> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return;

    const ref = doc(firestore, businessGrantsCollection, grantId);
    await updateDoc(ref, {
      viewCount: increment(1),
    });
  } catch (error) {
    console.error("Error incrementing grant views:", error);
  }
}

// ============================================
// ADMIN / ORGANIZATION FUNCTIONS
// ============================================

export type CreateGrantInput = Omit<BusinessGrant, "id" | "createdAt" | "updatedAt" | "viewCount">;

export async function createBusinessGrant(input: CreateGrantInput): Promise<string> {
  const ref = collection(db!, businessGrantsCollection);
  const docRef = await addDoc(ref, {
    ...input,
    viewCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Update with ID
  await updateDoc(doc(db!, businessGrantsCollection, docRef.id), {
    id: docRef.id,
  });

  return docRef.id;
}

export async function updateBusinessGrant(
  id: string,
  data: Partial<BusinessGrant>
): Promise<void> {
  const ref = doc(db!, businessGrantsCollection, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBusinessGrant(id: string): Promise<void> {
  const ref = doc(db!, businessGrantsCollection, id);
  await deleteDoc(ref);
}

export async function updateGrantStatus(
  id: string,
  status: BusinessGrantStatus
): Promise<void> {
  await updateBusinessGrant(id, { status });
}

export async function setGrantFeatured(
  id: string,
  featured: boolean
): Promise<void> {
  await updateBusinessGrant(id, { featured });
}

// ============================================
// ORGANIZATION-SPECIFIC QUERIES
// ============================================

export async function listOrganizationGrants(
  createdBy: string
): Promise<BusinessGrant[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const ref = collection(firestore, businessGrantsCollection);
    const q = query(
      ref,
      where("createdBy", "==", createdBy),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BusinessGrant));
  } catch (error) {
    console.error("Error listing organization grants:", error);
    return [];
  }
}

// ============================================
// ADMIN REVIEW QUEUE
// ============================================

export async function getGrantsPendingReview(): Promise<BusinessGrant[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const ref = collection(firestore, businessGrantsCollection);
    const q = query(
      ref,
      where("status", "==", "upcoming"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BusinessGrant));
  } catch (error) {
    console.error("Error getting grants pending review:", error);
    return [];
  }
}
