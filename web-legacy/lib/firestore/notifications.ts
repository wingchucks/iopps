// Notification-related Firestore operations
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  db,
  auth,
  notificationsCollection,
  checkFirebase,
} from "./shared";
import { onSnapshot } from "firebase/firestore";
import type { Notification, NotificationType } from "@/lib/types";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  relatedJobId?: string;
  relatedApplicationId?: string;
  relatedConversationId?: string;
  relatedEmployerId?: string;
}): Promise<string> {
  if (!auth) {
    throw new Error("Auth not initialized");
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Must be authenticated to create notifications");
  }

  const idToken = await user.getIdToken();
  const response = await fetch("/api/notifications/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create notification");
  }

  const result = await response.json();
  return result.notificationId;
}

export async function getUserNotifications(
  userId: string,
  limitCount: number = 50
): Promise<Notification[]> {
  checkFirebase();

  // Use Firestore limit() instead of fetching all and slicing
  const q = query(
    collection(db!, notificationsCollection),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  const notifications = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as Notification[];

  return notifications;
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<void> {
  checkFirebase();

  const notificationRef = doc(db!, notificationsCollection, notificationId);
  await updateDoc(notificationRef, {
    read: true,
  });
}

export async function markAllNotificationsAsRead(
  userId: string
): Promise<void> {
  checkFirebase();

  const q = query(
    collection(db!, notificationsCollection),
    where("userId", "==", userId),
    where("read", "==", false),
    limit(500) // Limit to prevent massive operations
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  // Use batch writes for better performance (max 500 writes per batch)
  const batch = writeBatch(db!);
  snapshot.docs.forEach((docSnap) => {
    batch.update(doc(db!, notificationsCollection, docSnap.id), { read: true });
  });

  await batch.commit();
}

export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  checkFirebase();

  const q = query(
    collection(db!, notificationsCollection),
    where("userId", "==", userId),
    where("read", "==", false)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}

export async function deleteNotification(
  notificationId: string
): Promise<void> {
  checkFirebase();

  await deleteDoc(doc(db!, notificationsCollection, notificationId));
}

export async function deleteAllUserNotifications(
  userId: string
): Promise<void> {
  checkFirebase();

  const q = query(
    collection(db!, notificationsCollection),
    where("userId", "==", userId)
  );

  const snapshot = await getDocs(q);

  const deletePromises = snapshot.docs.map((docSnap) =>
    deleteDoc(doc(db!, notificationsCollection, docSnap.id))
  );

  await Promise.all(deletePromises);
}

// ============================================
// REAL-TIME LISTENERS
// ============================================

/**
 * Get the Firestore query for a user's notifications.
 * Can be used directly with onSnapshot for real-time listening.
 */
export function getNotificationsQuery(userId: string, limitCount: number = 50) {
  checkFirebase();
  return query(
    collection(db!, notificationsCollection),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
}

/**
 * Subscribe to real-time notifications for a user.
 * Returns an unsubscribe function to clean up the listener.
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
  limitCount: number = 50
): () => void {
  const firestore = checkFirebase();
  if (!firestore) {
    // If Firebase is not available, return a no-op unsubscribe
    return () => {};
  }

  const q = getNotificationsQuery(userId, limitCount);

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Notification[];
    callback(notifications);
  });
}

/**
 * Subscribe to unread notification count for a user.
 * Returns an unsubscribe function to clean up the listener.
 */
export function subscribeToUnreadCount(
  userId: string,
  callback: (count: number) => void
): () => void {
  const firestore = checkFirebase();
  if (!firestore) {
    return () => {};
  }

  const q = query(
    collection(db!, notificationsCollection),
    where("userId", "==", userId),
    where("read", "==", false)
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}
