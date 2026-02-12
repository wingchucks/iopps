 
// V2 Organization Firestore operations
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  checkFirebase,
} from "./shared";
import type { V2Organization, OrgStatus } from "./v2-types";
import { writeAuditLog } from "./v2-audit";

const V2_ORGS_COLLECTION = "v2_organizations";

/**
 * Create a new V2 organization
 */
export async function createOrganization(
  data: Omit<V2Organization, "id" | "createdAt" | "updatedAt" | "status">
): Promise<string> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = await addDoc(collection(firestore, V2_ORGS_COLLECTION), {
    ...data,
    status: "pending" as OrgStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

/**
 * Get a single organization by ID
 */
export async function getOrganization(orgId: string): Promise<V2Organization | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return null;

    const ref = doc(firestore, V2_ORGS_COLLECTION, orgId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as V2Organization;
  } catch {
    return null;
  }
}

/**
 * Get organization(s) owned by a specific user
 */
export async function getOrganizationByOwner(uid: string): Promise<V2Organization | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return null;

    const q = query(
      collection(firestore, V2_ORGS_COLLECTION),
      where("ownerUid", "==", uid)
    );
    const snap = await getDocs(q);

    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as V2Organization;
  } catch {
    return null;
  }
}

/**
 * Update an organization (partial update)
 */
export async function updateOrganization(
  orgId: string,
  data: Partial<Omit<V2Organization, "id" | "createdAt">>
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = doc(firestore, V2_ORGS_COLLECTION, orgId);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * List all pending organizations, ordered by creation date
 */
export async function listPendingOrganizations(): Promise<V2Organization[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const q = query(
      collection(firestore, V2_ORGS_COLLECTION),
      where("status", "==", "pending"),
      orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as V2Organization);
  } catch {
    return [];
  }
}

/**
 * Approve an organization (set status to active), upgrade owner role, and write audit log
 */
export async function approveOrganization(orgId: string, adminUid: string): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = doc(firestore, V2_ORGS_COLLECTION, orgId);

  // Get org to find owner
  const orgSnap = await getDoc(ref);
  if (!orgSnap.exists()) throw new Error("Organization not found");
  const orgData = orgSnap.data();

  // Update org status
  await updateDoc(ref, {
    status: "active" as OrgStatus,
    updatedAt: serverTimestamp(),
  });

  // Upgrade owner's role to employer (only if they're still community)
  if (orgData.ownerUid) {
    const userRef = doc(firestore, "users", orgData.ownerUid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data()?.role === "community") {
      await updateDoc(userRef, {
        role: "employer",
        updatedAt: serverTimestamp(),
      });
    }
  }

  await writeAuditLog({ adminUid, action: "approve_org", orgId });
}

/**
 * Reject an organization (set status to rejected) and write audit log
 */
export async function rejectOrganization(
  orgId: string,
  adminUid: string,
  reason?: string
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = doc(firestore, V2_ORGS_COLLECTION, orgId);
  await updateDoc(ref, {
    status: "rejected" as OrgStatus,
    rejectReason: reason ?? null,
    updatedAt: serverTimestamp(),
  });

  await writeAuditLog({
    adminUid,
    action: "reject_org",
    orgId,
    metadata: reason ? { reason } : undefined,
  });
}
