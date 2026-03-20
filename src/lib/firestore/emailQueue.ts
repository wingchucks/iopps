import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export interface EmailMessage {
  id: string;
  to: string;
  template?: { name: string; data: Record<string, string> };
  message?: { subject: string; html: string; text?: string };
  createdAt: unknown;
  status: "pending" | "sent" | "error";
}

const mailCol = collection(db, "mail");

/**
 * Queue an email with explicit subject/html body.
 */
export async function queueEmail(
  to: string,
  subject: string,
  html: string
): Promise<string> {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(doc(db, "mail", id), {
    to,
    message: { subject, html },
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return id;
}

/**
 * Queue a template-based email (compatible with Firebase Trigger Email extension).
 */
export async function queueTemplateEmail(
  to: string,
  templateName: string,
  data: Record<string, string>
): Promise<string> {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(doc(db, "mail", id), {
    to,
    template: { name: templateName, data },
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return id;
}

/**
 * Fetch recent queued emails (admin).
 */
export async function getEmailQueue(max = 50): Promise<EmailMessage[]> {
  const snap = await getDocs(
    query(mailCol, orderBy("createdAt", "desc"), limit(max))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EmailMessage);
}

/**
 * Get email counts grouped by status.
 */
export async function getEmailStats(): Promise<{
  pending: number;
  sent: number;
  error: number;
  total: number;
}> {
  const [pendingSnap, sentSnap, errorSnap] = await Promise.all([
    getDocs(query(mailCol, where("status", "==", "pending"))),
    getDocs(query(mailCol, where("status", "==", "sent"))),
    getDocs(query(mailCol, where("status", "==", "error"))),
  ]);
  return {
    pending: pendingSnap.size,
    sent: sentSnap.size,
    error: errorSnap.size,
    total: pendingSnap.size + sentSnap.size + errorSnap.size,
  };
}
