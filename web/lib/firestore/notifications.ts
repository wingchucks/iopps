import {
  collection, doc, getDocs, addDoc, updateDoc, query, where, orderBy, limit,
  Timestamp, onSnapshot, writeBatch, type Unsubscribe
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Notification, NotificationType } from "@/lib/types";

const col = () => collection(db!, "notifications");

export async function createNotification(data: Omit<Notification, "id" | "createdAt" | "read" | "emailSent">): Promise<string> {
  const ref = await addDoc(col(), {
    ...data,
    read: false,
    emailSent: false,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function getNotifications(uid: string, limitCount = 20): Promise<Notification[]> {
  const snap = await getDocs(
    query(col(), where("uid", "==", uid), orderBy("createdAt", "desc"), limit(limitCount))
  );
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as Notification));
}

export async function markAsRead(id: string): Promise<void> {
  await updateDoc(doc(db!, "notifications", id), { read: true });
}

export async function markAllAsRead(uid: string): Promise<void> {
  const snap = await getDocs(query(col(), where("uid", "==", uid), where("read", "==", false)));
  const batch = writeBatch(db!);
  snap.docs.forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export function getUnreadCount(uid: string, callback: (count: number) => void): Unsubscribe {
  return onSnapshot(
    query(col(), where("uid", "==", uid), where("read", "==", false)),
    snap => callback(snap.size)
  );
}
