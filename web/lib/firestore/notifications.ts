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
