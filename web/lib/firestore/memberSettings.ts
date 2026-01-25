// Member settings Firestore operations
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  db,
  memberSettingsCollection,
} from "./shared";
import type { Timestamp } from "firebase/firestore";

// Field visibility options
export type FieldVisibility = "public" | "connections" | "employers" | "private";

// Profile visibility options
export type ProfileVisibility = "public" | "connections" | "private";

// Notification settings
export interface NotificationSettings {
  jobAlerts: boolean;
  applicationUpdates: boolean;
  messages: boolean;
  eventReminders: boolean;
  newsletter: boolean;
}

// Privacy settings for individual fields
export interface FieldPrivacySettings {
  email: FieldVisibility;
  phone: FieldVisibility;
  location: FieldVisibility;
  affiliation: FieldVisibility;
  bio: FieldVisibility;
  skills: FieldVisibility;
  experience: FieldVisibility;
  education: FieldVisibility;
  portfolio: FieldVisibility;
  resume: FieldVisibility;
  availability: FieldVisibility;
}

// User intent/interests for personalization
export type UserIntent =
  | "find-job"
  | "explore-careers"
  | "attend-events"
  | "find-scholarships"
  | "connect-professionals"
  | "browse-community";

// Onboarding status
export interface OnboardingStatus {
  completed: boolean;
  completedAt: Timestamp | null;
  skippedAt: Timestamp | null;
  currentStep: number;
  intents: UserIntent[];
}

// Complete member settings
export interface MemberSettings {
  id: string;
  userId: string;

  // Onboarding
  onboarding: OnboardingStatus;

  // Profile visibility
  profileVisibility: ProfileVisibility;

  // Field-level privacy
  fieldPrivacy: FieldPrivacySettings;

  // Notification preferences
  notifications: NotificationSettings;

  // Discovery settings
  showInTalentSearch: boolean;
  showInDirectory: boolean;

  // Connection settings
  allowConnectionRequests: boolean; // Everyone can send requests
  allowMessagesFrom: "everyone" | "connections" | "none";

  // Activity visibility
  showActivityInFeed: boolean;
  showEventAttendance: boolean;

  // Timestamps
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// Default settings for new users
export const DEFAULT_MEMBER_SETTINGS: Omit<MemberSettings, "id" | "userId" | "createdAt" | "updatedAt"> = {
  onboarding: {
    completed: false,
    completedAt: null,
    skippedAt: null,
    currentStep: 0,
    intents: [],
  },
  profileVisibility: "public",
  fieldPrivacy: {
    email: "private",
    phone: "private",
    location: "public",
    affiliation: "public",
    bio: "public",
    skills: "public",
    experience: "employers",
    education: "employers",
    portfolio: "public",
    resume: "employers",
    availability: "employers",
  },
  notifications: {
    jobAlerts: true,
    applicationUpdates: true,
    messages: true,
    eventReminders: true,
    newsletter: false,
  },
  showInTalentSearch: true,
  showInDirectory: true,
  allowConnectionRequests: true,
  allowMessagesFrom: "connections",
  showActivityInFeed: true,
  showEventAttendance: true,
};

/**
 * Get member settings by user ID
 * Returns default settings if none exist
 */
export async function getMemberSettings(userId: string): Promise<MemberSettings> {
  if (!db) {
    // Return defaults with user info if db not available
    return {
      ...DEFAULT_MEMBER_SETTINGS,
      id: userId,
      userId,
      createdAt: null,
      updatedAt: null,
    };
  }

  const ref = doc(db, memberSettingsCollection, userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // Return defaults if no settings exist yet
    return {
      ...DEFAULT_MEMBER_SETTINGS,
      id: userId,
      userId,
      createdAt: null,
      updatedAt: null,
    };
  }

  const data = snap.data();

  // Merge with defaults to ensure all fields exist (handles schema migrations)
  return {
    ...DEFAULT_MEMBER_SETTINGS,
    ...data,
    id: userId,
    userId,
  } as MemberSettings;
}

/**
 * Update member settings
 * Creates settings document if it doesn't exist
 */
export async function updateMemberSettings(
  userId: string,
  settings: Partial<Omit<MemberSettings, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<void> {
  if (!db) {
    throw new Error("Database not available");
  }

  const ref = doc(db, memberSettingsCollection, userId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    // Update existing settings
    await setDoc(ref, {
      ...settings,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } else {
    // Create new settings document with defaults
    await setDoc(ref, {
      ...DEFAULT_MEMBER_SETTINGS,
      ...settings,
      id: userId,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Update notification settings only
 */
export async function updateNotificationSettings(
  userId: string,
  notifications: Partial<NotificationSettings>
): Promise<void> {
  if (!db) {
    throw new Error("Database not available");
  }

  const ref = doc(db, memberSettingsCollection, userId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const currentSettings = snap.data();
    await setDoc(ref, {
      notifications: {
        ...currentSettings.notifications,
        ...notifications,
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } else {
    // Create new settings document
    await setDoc(ref, {
      ...DEFAULT_MEMBER_SETTINGS,
      notifications: {
        ...DEFAULT_MEMBER_SETTINGS.notifications,
        ...notifications,
      },
      id: userId,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Update onboarding status
 */
export async function updateOnboardingStatus(
  userId: string,
  onboarding: Partial<OnboardingStatus>
): Promise<void> {
  if (!db) {
    throw new Error("Database not available");
  }

  const ref = doc(db, memberSettingsCollection, userId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const currentSettings = snap.data();
    await setDoc(ref, {
      onboarding: {
        ...currentSettings.onboarding,
        ...onboarding,
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } else {
    await setDoc(ref, {
      ...DEFAULT_MEMBER_SETTINGS,
      onboarding: {
        ...DEFAULT_MEMBER_SETTINGS.onboarding,
        ...onboarding,
      },
      id: userId,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Mark onboarding as completed
 */
export async function completeOnboarding(userId: string, intents: UserIntent[]): Promise<void> {
  await updateOnboardingStatus(userId, {
    completed: true,
    completedAt: serverTimestamp() as unknown as Timestamp,
    intents,
  });
}

/**
 * Mark onboarding as skipped
 */
export async function skipOnboarding(userId: string): Promise<void> {
  await updateOnboardingStatus(userId, {
    completed: true,
    skippedAt: serverTimestamp() as unknown as Timestamp,
  });
}

/**
 * Update privacy settings only
 */
export async function updatePrivacySettings(
  userId: string,
  privacy: {
    profileVisibility?: ProfileVisibility;
    fieldPrivacy?: Partial<FieldPrivacySettings>;
    showInTalentSearch?: boolean;
    showInDirectory?: boolean;
    allowConnectionRequests?: boolean;
    allowMessagesFrom?: "everyone" | "connections" | "none";
    showActivityInFeed?: boolean;
    showEventAttendance?: boolean;
  }
): Promise<void> {
  if (!db) {
    throw new Error("Database not available");
  }

  const ref = doc(db, memberSettingsCollection, userId);
  const snap = await getDoc(ref);

  const updates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  // Handle simple fields
  if (privacy.profileVisibility !== undefined) {
    updates.profileVisibility = privacy.profileVisibility;
  }
  if (privacy.showInTalentSearch !== undefined) {
    updates.showInTalentSearch = privacy.showInTalentSearch;
  }
  if (privacy.showInDirectory !== undefined) {
    updates.showInDirectory = privacy.showInDirectory;
  }
  if (privacy.allowConnectionRequests !== undefined) {
    updates.allowConnectionRequests = privacy.allowConnectionRequests;
  }
  if (privacy.allowMessagesFrom !== undefined) {
    updates.allowMessagesFrom = privacy.allowMessagesFrom;
  }
  if (privacy.showActivityInFeed !== undefined) {
    updates.showActivityInFeed = privacy.showActivityInFeed;
  }
  if (privacy.showEventAttendance !== undefined) {
    updates.showEventAttendance = privacy.showEventAttendance;
  }

  // Handle nested fieldPrivacy
  if (privacy.fieldPrivacy) {
    if (snap.exists()) {
      const currentSettings = snap.data();
      updates.fieldPrivacy = {
        ...currentSettings.fieldPrivacy,
        ...privacy.fieldPrivacy,
      };
    } else {
      updates.fieldPrivacy = {
        ...DEFAULT_MEMBER_SETTINGS.fieldPrivacy,
        ...privacy.fieldPrivacy,
      };
    }
  }

  if (snap.exists()) {
    await setDoc(ref, updates, { merge: true });
  } else {
    // Create new settings document
    await setDoc(ref, {
      ...DEFAULT_MEMBER_SETTINGS,
      ...updates,
      id: userId,
      userId,
      createdAt: serverTimestamp(),
    });
  }
}
