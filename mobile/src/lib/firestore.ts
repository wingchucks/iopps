import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Notification } from "../types";

// Notifications: firestore.rules lets members read their own and only mark them read.
// Jobs, applications, employer data and listings come from the website's APIs
// (./jobs, ./employer, ./listings); saved jobs, the member profile and messages are
// in ./savedJobs, ./profile and ./messaging.

// ============ NOTIFICATIONS ============

export async function getMemberNotifications(
  userId: string,
  limitCount = 50
): Promise<Notification[]> {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Notification[];
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await updateDoc(doc(db, "notifications", id), {
    read: true,
  });
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("read", "==", false)
  );
  const snapshot = await getDocs(q);
  const updates = snapshot.docs.map((docSnap) =>
    updateDoc(doc(db, "notifications", docSnap.id), { read: true })
  );
  await Promise.all(updates);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    where("read", "==", false)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
}

// ============ HELPERS ============

export { formatTimestamp, formatDateTime } from "./dates";
