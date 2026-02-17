import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "../firebase";

export type NotificationType =
  | "welcome"
  | "job_match"
  | "application_update"
  | "event_reminder"
  | "new_post"
  | "system";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: unknown;
}

const col = collection(db, "notifications");

export async function getNotifications(userId: string): Promise<Notification[]> {
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  ];
  const snap = await getDocs(query(col, ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const snap = await getDocs(
    query(col, where("userId", "==", userId), where("read", "==", false))
  );
  return snap.size;
}

export async function addNotification(
  userId: string,
  data: {
    type: NotificationType;
    title: string;
    body: string;
    link?: string;
  }
): Promise<void> {
  const id = `${userId}_${Date.now()}`;
  await setDoc(doc(db, "notifications", id), {
    userId,
    ...data,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function markAsRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, "notifications", notificationId), { read: true });
}

export async function markAllAsRead(userId: string): Promise<void> {
  const unread = await getDocs(
    query(col, where("userId", "==", userId), where("read", "==", false))
  );
  if (unread.empty) return;
  const batch = writeBatch(db);
  unread.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}
