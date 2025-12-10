// Notification-related Firestore operations
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
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

  const q = query(
    collection(db!, notificationsCollection),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  const notifications = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Notification[];

  return notifications.slice(0, limitCount);
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
    where("read", "==", false)
  );

  const snapshot = await getDocs(q);

  const updatePromises = snapshot.docs.map((docSnap) =>
    updateDoc(doc(db!, notificationsCollection, docSnap.id), { read: true })
  );

  await Promise.all(updatePromises);
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
