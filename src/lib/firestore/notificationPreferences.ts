import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export interface NotificationChannels {
  email: boolean;
  push: boolean;
  inApp: boolean;
}

export interface NotificationPreferences {
  userId: string;
  categories: {
    applications: NotificationChannels;
    messages: NotificationChannels;
    community: NotificationChannels;
    events: NotificationChannels;
    opportunities: NotificationChannels;
  };
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string;   // "08:00"
  };
  updatedAt: unknown;
}

export type NotificationCategory = keyof NotificationPreferences["categories"];

const COLLECTION = "notification_preferences";

const defaultChannels: NotificationChannels = {
  email: true,
  push: true,
  inApp: true,
};

const defaultPreferences: Omit<NotificationPreferences, "userId" | "updatedAt"> = {
  categories: {
    applications: { ...defaultChannels },
    messages: { ...defaultChannels },
    community: { ...defaultChannels },
    events: { ...defaultChannels },
    opportunities: { ...defaultChannels },
  },
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "08:00",
  },
};

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences> {
  const snap = await getDoc(doc(db, COLLECTION, userId));
  if (!snap.exists()) {
    return {
      userId,
      ...defaultPreferences,
      updatedAt: null,
    };
  }
  return snap.data() as NotificationPreferences;
}

export async function updateNotificationPreferences(
  userId: string,
  data: Partial<Omit<NotificationPreferences, "userId" | "updatedAt">>
): Promise<void> {
  const ref = doc(db, COLLECTION, userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, {
      userId,
      ...defaultPreferences,
      ...data,
      updatedAt: serverTimestamp(),
    });
  }
}

export async function updateCategoryPreference(
  userId: string,
  category: NotificationCategory,
  channels: Partial<NotificationChannels>
): Promise<void> {
  const current = await getNotificationPreferences(userId);
  const updatedCategories = {
    ...current.categories,
    [category]: {
      ...current.categories[category],
      ...channels,
    },
  };
  await updateNotificationPreferences(userId, { categories: updatedCategories });
}

export async function updateQuietHours(
  userId: string,
  quietHours: Partial<NotificationPreferences["quietHours"]>
): Promise<void> {
  const current = await getNotificationPreferences(userId);
  await updateNotificationPreferences(userId, {
    quietHours: {
      ...current.quietHours,
      ...quietHours,
    },
  });
}
