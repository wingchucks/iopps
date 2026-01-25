// Enhanced Notification Preferences
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  checkFirebase,
} from "./shared";

// ============================================
// TYPES
// ============================================

export type NotificationChannel = "in_app" | "email" | "push";
export type NotificationFrequency = "instant" | "daily" | "weekly" | "never";

export interface NotificationTypePreference {
  enabled: boolean;
  channels: NotificationChannel[];
  frequency?: NotificationFrequency; // For digest-type notifications
}

export interface MemberNotificationPreferences {
  id: string;
  userId: string;

  // Global settings
  globalEnabled: boolean; // Master switch
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string; // "08:00"
  timezone?: string;

  // Push notification settings
  pushEnabled: boolean;
  pushSubscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };

  // Category-specific preferences
  categories: {
    // Job-related
    jobAlerts: NotificationTypePreference;
    applicationUpdates: NotificationTypePreference;
    savedJobReminders: NotificationTypePreference;

    // Social/Community
    connectionRequests: NotificationTypePreference;
    connectionAccepted: NotificationTypePreference;
    newMessages: NotificationTypePreference;
    mentions: NotificationTypePreference;
    postLikes: NotificationTypePreference;
    postComments: NotificationTypePreference;

    // Events
    eventReminders: NotificationTypePreference;
    eventUpdates: NotificationTypePreference;
    newEventsNearYou: NotificationTypePreference;

    // Scholarships & Education
    scholarshipDeadlines: NotificationTypePreference;
    newScholarships: NotificationTypePreference;
    programUpdates: NotificationTypePreference;

    // Engagement
    streakReminders: NotificationTypePreference;
    badgeEarned: NotificationTypePreference;
    leaderboardUpdates: NotificationTypePreference;
    milestones: NotificationTypePreference;

    // Digest
    weeklyDigest: NotificationTypePreference;
    communityHighlights: NotificationTypePreference;

    // System
    securityAlerts: NotificationTypePreference;
    systemAnnouncements: NotificationTypePreference;
  };

  // Email preferences
  emailUnsubscribedAll: boolean;
  emailAddress?: string; // Override email if different from account

  // Timestamps
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

// Default preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
  MemberNotificationPreferences,
  "id" | "userId" | "createdAt" | "updatedAt"
> = {
  globalEnabled: true,
  quietHoursEnabled: false,
  pushEnabled: false,
  emailUnsubscribedAll: false,

  categories: {
    // Job-related
    jobAlerts: { enabled: true, channels: ["in_app", "email"], frequency: "instant" },
    applicationUpdates: { enabled: true, channels: ["in_app", "email"] },
    savedJobReminders: { enabled: true, channels: ["in_app"], frequency: "daily" },

    // Social/Community
    connectionRequests: { enabled: true, channels: ["in_app", "email"] },
    connectionAccepted: { enabled: true, channels: ["in_app"] },
    newMessages: { enabled: true, channels: ["in_app", "email"] },
    mentions: { enabled: true, channels: ["in_app"] },
    postLikes: { enabled: false, channels: ["in_app"] },
    postComments: { enabled: true, channels: ["in_app"] },

    // Events
    eventReminders: { enabled: true, channels: ["in_app", "email"], frequency: "daily" },
    eventUpdates: { enabled: true, channels: ["in_app"] },
    newEventsNearYou: { enabled: true, channels: ["in_app"], frequency: "weekly" },

    // Scholarships & Education
    scholarshipDeadlines: { enabled: true, channels: ["in_app", "email"], frequency: "daily" },
    newScholarships: { enabled: true, channels: ["in_app"], frequency: "weekly" },
    programUpdates: { enabled: true, channels: ["in_app"] },

    // Engagement
    streakReminders: { enabled: true, channels: ["in_app"] },
    badgeEarned: { enabled: true, channels: ["in_app"] },
    leaderboardUpdates: { enabled: false, channels: ["in_app"], frequency: "weekly" },
    milestones: { enabled: true, channels: ["in_app"] },

    // Digest
    weeklyDigest: { enabled: true, channels: ["email"], frequency: "weekly" },
    communityHighlights: { enabled: true, channels: ["in_app"], frequency: "weekly" },

    // System
    securityAlerts: { enabled: true, channels: ["in_app", "email"] },
    systemAnnouncements: { enabled: true, channels: ["in_app"] },
  },
};

// ============================================
// FUNCTIONS
// ============================================

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(
  userId: string
): Promise<MemberNotificationPreferences> {
  const firestore = checkFirebase();
  if (!firestore) {
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      id: userId,
      userId,
      createdAt: null,
      updatedAt: null,
    };
  }

  try {
    const ref = doc(firestore, "notificationPreferences", userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        id: userId,
        userId,
        createdAt: null,
        updatedAt: null,
      };
    }

    const data = snap.data();

    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...data,
      categories: {
        ...DEFAULT_NOTIFICATION_PREFERENCES.categories,
        ...data.categories,
      },
      id: userId,
      userId,
    } as MemberNotificationPreferences;
  } catch (error) {
    console.error("Error getting notification preferences:", error);
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      id: userId,
      userId,
      createdAt: null,
      updatedAt: null,
    };
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<Omit<MemberNotificationPreferences, "id" | "userId" | "createdAt">>
): Promise<void> {
  const firestore = checkFirebase();
  if (!firestore) throw new Error("Firebase not initialized");

  const ref = doc(firestore, "notificationPreferences", userId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await setDoc(
      ref,
      {
        ...updates,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } else {
    await setDoc(ref, {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...updates,
      id: userId,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Update a specific notification category
 */
export async function updateNotificationCategory(
  userId: string,
  category: keyof MemberNotificationPreferences["categories"],
  preference: NotificationTypePreference
): Promise<void> {
  const prefs = await getNotificationPreferences(userId);

  await updateNotificationPreferences(userId, {
    categories: {
      ...prefs.categories,
      [category]: preference,
    },
  });
}

/**
 * Toggle global notifications
 */
export async function toggleGlobalNotifications(
  userId: string,
  enabled: boolean
): Promise<void> {
  await updateNotificationPreferences(userId, {
    globalEnabled: enabled,
  });
}

/**
 * Set quiet hours
 */
export async function setQuietHours(
  userId: string,
  enabled: boolean,
  start?: string,
  end?: string
): Promise<void> {
  await updateNotificationPreferences(userId, {
    quietHoursEnabled: enabled,
    quietHoursStart: start,
    quietHoursEnd: end,
  });
}

/**
 * Register push subscription
 */
export async function registerPushSubscription(
  userId: string,
  subscription: PushSubscription
): Promise<void> {
  const keys = subscription.toJSON().keys;

  await updateNotificationPreferences(userId, {
    pushEnabled: true,
    pushSubscription: {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: keys?.p256dh || "",
        auth: keys?.auth || "",
      },
    },
  });
}

/**
 * Unregister push subscription
 */
export async function unregisterPushSubscription(userId: string): Promise<void> {
  await updateNotificationPreferences(userId, {
    pushEnabled: false,
    pushSubscription: undefined,
  });
}

/**
 * Check if user should receive a specific notification type
 */
export async function shouldNotify(
  userId: string,
  category: keyof MemberNotificationPreferences["categories"],
  channel: NotificationChannel
): Promise<boolean> {
  const prefs = await getNotificationPreferences(userId);

  // Check global setting
  if (!prefs.globalEnabled) return false;

  // Check email unsubscribe
  if (channel === "email" && prefs.emailUnsubscribedAll) return false;

  // Check push enabled
  if (channel === "push" && !prefs.pushEnabled) return false;

  // Check category preference
  const categoryPref = prefs.categories[category];
  if (!categoryPref || !categoryPref.enabled) return false;

  // Check if channel is enabled for this category
  if (!categoryPref.channels.includes(channel)) return false;

  // Check quiet hours for push/in_app
  if (channel !== "email" && prefs.quietHoursEnabled) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    if (prefs.quietHoursStart && prefs.quietHoursEnd) {
      const start = prefs.quietHoursStart;
      const end = prefs.quietHoursEnd;

      // Handle overnight quiet hours (e.g., 22:00 - 08:00)
      if (start > end) {
        if (currentTime >= start || currentTime < end) {
          return false;
        }
      } else {
        if (currentTime >= start && currentTime < end) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Get all users who should receive a specific notification
 */
export async function getUsersForNotification(
  category: keyof MemberNotificationPreferences["categories"],
  channel: NotificationChannel,
  userIds: string[]
): Promise<string[]> {
  const results: string[] = [];

  // Check each user's preferences
  // In production, this would be optimized with a query
  for (const userId of userIds) {
    const shouldSend = await shouldNotify(userId, category, channel);
    if (shouldSend) {
      results.push(userId);
    }
  }

  return results;
}

/**
 * Bulk toggle notification category
 */
export async function bulkToggleCategory(
  userId: string,
  categories: (keyof MemberNotificationPreferences["categories"])[],
  enabled: boolean
): Promise<void> {
  const prefs = await getNotificationPreferences(userId);

  const updatedCategories = { ...prefs.categories };
  for (const category of categories) {
    updatedCategories[category] = {
      ...updatedCategories[category],
      enabled,
    };
  }

  await updateNotificationPreferences(userId, {
    categories: updatedCategories,
  });
}

/**
 * Get notification categories grouped by type
 */
export function getNotificationCategoryGroups(): {
  id: string;
  label: string;
  description: string;
  categories: {
    key: keyof MemberNotificationPreferences["categories"];
    label: string;
    description: string;
  }[];
}[] {
  return [
    {
      id: "jobs",
      label: "Jobs & Applications",
      description: "Notifications about job opportunities and your applications",
      categories: [
        { key: "jobAlerts", label: "Job Alerts", description: "New jobs matching your preferences" },
        { key: "applicationUpdates", label: "Application Updates", description: "Status changes on your applications" },
        { key: "savedJobReminders", label: "Saved Job Reminders", description: "Reminders about jobs you've saved" },
      ],
    },
    {
      id: "social",
      label: "Social & Community",
      description: "Connections, messages, and community interactions",
      categories: [
        { key: "connectionRequests", label: "Connection Requests", description: "When someone wants to connect" },
        { key: "connectionAccepted", label: "Connection Accepted", description: "When your request is accepted" },
        { key: "newMessages", label: "New Messages", description: "Direct messages from connections" },
        { key: "mentions", label: "Mentions", description: "When someone mentions you in a post" },
        { key: "postLikes", label: "Post Likes", description: "When someone likes your posts" },
        { key: "postComments", label: "Post Comments", description: "Comments on your posts" },
      ],
    },
    {
      id: "events",
      label: "Events",
      description: "Conferences, pow wows, and community events",
      categories: [
        { key: "eventReminders", label: "Event Reminders", description: "Reminders for events you've saved" },
        { key: "eventUpdates", label: "Event Updates", description: "Changes to events you're attending" },
        { key: "newEventsNearYou", label: "New Events Near You", description: "Events in your area" },
      ],
    },
    {
      id: "education",
      label: "Scholarships & Education",
      description: "Educational opportunities and deadlines",
      categories: [
        { key: "scholarshipDeadlines", label: "Scholarship Deadlines", description: "Upcoming deadlines for saved scholarships" },
        { key: "newScholarships", label: "New Scholarships", description: "New scholarships matching your profile" },
        { key: "programUpdates", label: "Program Updates", description: "Updates from saved programs" },
      ],
    },
    {
      id: "engagement",
      label: "Engagement & Achievements",
      description: "Streaks, badges, and milestones",
      categories: [
        { key: "streakReminders", label: "Streak Reminders", description: "Don't lose your streak!" },
        { key: "badgeEarned", label: "Badge Earned", description: "When you earn a new badge" },
        { key: "leaderboardUpdates", label: "Leaderboard Updates", description: "Your ranking changes" },
        { key: "milestones", label: "Milestones", description: "Celebrate your achievements" },
      ],
    },
    {
      id: "digest",
      label: "Digests & Highlights",
      description: "Summary emails and community updates",
      categories: [
        { key: "weeklyDigest", label: "Weekly Digest", description: "Weekly summary of activity" },
        { key: "communityHighlights", label: "Community Highlights", description: "Top posts and achievements" },
      ],
    },
    {
      id: "system",
      label: "System",
      description: "Security and platform announcements",
      categories: [
        { key: "securityAlerts", label: "Security Alerts", description: "Important security notifications" },
        { key: "systemAnnouncements", label: "System Announcements", description: "Platform updates and news" },
      ],
    },
  ];
}
