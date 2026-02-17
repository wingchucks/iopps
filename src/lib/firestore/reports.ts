import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  getCountFromServer,
  type Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export interface ContentReport {
  id: string;
  reporterId: string;
  reporterName?: string;
  targetType: "post" | "member" | "message" | "conversation";
  targetId: string;
  targetTitle?: string;
  reason: "spam" | "harassment" | "inappropriate" | "misinformation" | "other";
  details?: string;
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  adminNote?: string;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
  resolvedAt?: Timestamp | ReturnType<typeof serverTimestamp>;
}

const col = () => collection(db, "content_reports");

export async function submitReport(
  report: Omit<ContentReport, "id" | "status" | "createdAt">
): Promise<string> {
  const docRef = await addDoc(col(), {
    ...report,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getReports(
  status?: ContentReport["status"]
): Promise<ContentReport[]> {
  const constraints = status
    ? [where("status", "==", status), orderBy("createdAt", "desc")]
    : [orderBy("createdAt", "desc")];
  const q = query(col(), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContentReport));
}

export async function getUserReports(userId: string): Promise<ContentReport[]> {
  const q = query(
    col(),
    where("reporterId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContentReport));
}

export async function updateReportStatus(
  reportId: string,
  status: ContentReport["status"],
  adminNote?: string
): Promise<void> {
  const ref = doc(db, "content_reports", reportId);
  const updates: Record<string, unknown> = { status };
  if (adminNote !== undefined) updates.adminNote = adminNote;
  if (status === "resolved" || status === "dismissed") {
    updates.resolvedAt = serverTimestamp();
  }
  await updateDoc(ref, updates);
}

export async function getPendingReportCount(): Promise<number> {
  const q = query(col(), where("status", "==", "pending"));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}
