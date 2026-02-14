 
// V2 User Private data - resumes, certificates, and private settings
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  orderBy,
  query,
  serverTimestamp,
  checkFirebase,
} from "./shared";
import type { UserPrivate, V2Resume, V2Certificate } from "./v2-types";

const USER_PRIVATE_COLLECTION = "user_private";

// ============================================
// BASE DOCUMENT
// ============================================

/**
 * Create the base user_private document for a user
 */
export async function createUserPrivateDoc(uid: string): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = doc(firestore, USER_PRIVATE_COLLECTION, uid);
  await setDoc(ref, {
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get the user_private base document
 */
export async function getUserPrivateDoc(uid: string): Promise<UserPrivate | null> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return null;

    const ref = doc(firestore, USER_PRIVATE_COLLECTION, uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;
    return snap.data() as UserPrivate;
  } catch {
    return null;
  }
}

// ============================================
// RESUMES SUBCOLLECTION
// ============================================

/**
 * Add a resume to the user's resumes subcollection
 */
export async function addResume(
  uid: string,
  resume: Omit<V2Resume, "id" | "uploadedAt">
): Promise<string> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const resumesRef = collection(firestore, USER_PRIVATE_COLLECTION, uid, "resumes");
  const ref = await addDoc(resumesRef, {
    ...resume,
    uploadedAt: serverTimestamp(),
  });

  return ref.id;
}

/**
 * Get all resumes for a user
 */
export async function getResumes(uid: string): Promise<V2Resume[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const resumesRef = collection(firestore, USER_PRIVATE_COLLECTION, uid, "resumes");
    const q = query(resumesRef, orderBy("uploadedAt", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as V2Resume);
  } catch {
    return [];
  }
}

/**
 * Delete a resume by ID
 */
export async function deleteResume(uid: string, resumeId: string): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = doc(firestore, USER_PRIVATE_COLLECTION, uid, "resumes", resumeId);
  await deleteDoc(ref);
}

// ============================================
// CERTIFICATES SUBCOLLECTION
// ============================================

/**
 * Add a certificate to the user's certificates subcollection
 */
export async function addCertificate(
  uid: string,
  cert: Omit<V2Certificate, "id" | "uploadedAt">
): Promise<string> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const certsRef = collection(firestore, USER_PRIVATE_COLLECTION, uid, "certificates");
  const ref = await addDoc(certsRef, {
    ...cert,
    uploadedAt: serverTimestamp(),
  });

  return ref.id;
}

/**
 * Get all certificates for a user
 */
export async function getCertificates(uid: string): Promise<V2Certificate[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const certsRef = collection(firestore, USER_PRIVATE_COLLECTION, uid, "certificates");
    const q = query(certsRef, orderBy("uploadedAt", "desc"));
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as V2Certificate);
  } catch {
    return [];
  }
}

/**
 * Delete a certificate by ID
 */
export async function deleteCertificate(uid: string, certId: string): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = doc(firestore, USER_PRIVATE_COLLECTION, uid, "certificates", certId);
  await deleteDoc(ref);
}
