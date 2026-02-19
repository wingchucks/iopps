import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { doc, setDoc, deleteField, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { notificationLogger } from "./logger";

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationState {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
}

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    notificationLogger.log("Push notifications require a physical device");
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not already granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    notificationLogger.log("Failed to get push token - permission not granted");
    return null;
  }

  try {
    // Get the Expo push token
    const pushTokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: "iopps-mobile",
    });
    token = pushTokenResponse.data;
    notificationLogger.log("Expo push token:", token);
  } catch (error) {
    notificationLogger.error("Error getting push token", error);
    return null;
  }

  // Set up Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#14B8A6",
    });

    // Create specific channels for different notification types
    await Notifications.setNotificationChannelAsync("job-alerts", {
      name: "Job Alerts",
      description: "Notifications for new jobs matching your alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8B5CF6",
    });

    await Notifications.setNotificationChannelAsync("messages", {
      name: "Messages",
      description: "Notifications for new messages",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#14B8A6",
    });

    await Notifications.setNotificationChannelAsync("applications", {
      name: "Application Updates",
      description: "Notifications about your job applications",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#F59E0B",
    });
  }

  return token;
}

/**
 * Save push token to Firestore for the given user
 */
export async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "users", userId),
      {
        pushToken: token,
        pushTokenPlatform: Platform.OS,
        pushTokenUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    notificationLogger.log("Push token saved to Firestore");
  } catch (error) {
    notificationLogger.error("Error saving push token", error);
    throw error;
  }
}

/**
 * Remove push token from Firestore (on sign out)
 */
export async function removePushToken(userId: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "users", userId),
      {
        pushToken: deleteField(),
        pushTokenPlatform: deleteField(),
        pushTokenUpdatedAt: deleteField(),
      },
      { merge: true }
    );
    notificationLogger.log("Push token removed from Firestore");
  } catch (error) {
    notificationLogger.error("Error removing push token", error);
  }
}

/**
 * Schedule a local notification (for testing or local reminders)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>,
  seconds: number = 1
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
    },
  });
  return id;
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get the badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set the badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Parse notification data to determine navigation target
 */
export interface NotificationNavigationData {
  type?: "job" | "message" | "application" | "job_alert" | "notification";
  jobId?: string;
  conversationId?: string;
  applicationId?: string;
  screen?: string;
}

export function parseNotificationData(
  notification: Notifications.Notification
): NotificationNavigationData {
  const data = notification.request.content.data as NotificationNavigationData;
  return {
    type: data?.type,
    jobId: data?.jobId,
    conversationId: data?.conversationId,
    applicationId: data?.applicationId,
    screen: data?.screen,
  };
}
