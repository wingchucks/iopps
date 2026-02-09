 
// V2 Admin Audit Log - tracks admin actions on organizations
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  checkFirebase,
} from "./shared";
import type { AuditLogEntry } from "./v2-types";

const AUDIT_COLLECTION = "admin_audit";

/**
 * Write an audit log entry for an admin action
 */
export async function writeAuditLog(
  entry: Omit<AuditLogEntry, "id" | "timestamp">
): Promise<string> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not available");

  const ref = await addDoc(collection(firestore, AUDIT_COLLECTION), {
    ...entry,
    timestamp: serverTimestamp(),
  });

  return ref.id;
}

/**
 * Get recent audit log entries, ordered by timestamp descending
 */
export async function getAuditLogs(maxResults: number = 50): Promise<AuditLogEntry[]> {
  try {
    const firestore = checkFirebase();
    if (!firestore) return [];

    const q = query(
      collection(firestore, AUDIT_COLLECTION),
      orderBy("timestamp", "desc"),
      firestoreLimit(maxResults)
    );
    const snap = await getDocs(q);

    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditLogEntry);
  } catch {
    return [];
  }
}
