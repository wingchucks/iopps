import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import * as Notifications from "expo-notifications";
import { parseNotificationData, NotificationNavigationData } from "../lib/notifications";
import { notificationLogger } from "../lib/logger";

interface NotificationContextType {
  notification: Notifications.Notification | null;
  setNavigationRef: (ref: any) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notification: null,
  setNavigationRef: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const navigationRef = useRef<any>(null);
  const pendingNavigation = useRef<NotificationNavigationData | null>(null);

  // Set navigation ref from App.tsx
  const setNavigationRef = useCallback((ref: any) => {
    navigationRef.current = ref;
    // Process any pending navigation
    if (pendingNavigation.current && ref) {
      handleNotificationNavigation(pendingNavigation.current);
      pendingNavigation.current = null;
    }
  }, []);

  // Handle navigation based on notification data
  const handleNotificationNavigation = useCallback((data: NotificationNavigationData) => {
    if (!navigationRef.current) {
      // Store for later if navigation isn't ready
      pendingNavigation.current = data;
      return;
    }

    const navigation = navigationRef.current;

    try {
      if (data.jobId) {
        navigation.navigate("JobDetail", { jobId: data.jobId });
      } else if (data.conversationId) {
        navigation.navigate("Conversation", { conversationId: data.conversationId });
      } else if (data.applicationId) {
        navigation.navigate("Applications");
      } else if (data.screen) {
        navigation.navigate(data.screen);
      } else if (data.type === "job_alert") {
        navigation.navigate("JobAlerts");
      } else if (data.type === "message") {
        navigation.navigate("Messages");
      } else if (data.type === "notification") {
        navigation.navigate("Notifications");
      }
    } catch (error) {
      notificationLogger.error("Error navigating from notification", error);
    }
  }, []);

  // Set up notification listeners
  useEffect(() => {
    // Listen for notifications received while app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
        notificationLogger.log("Notification received:", notification.request.content.title);
      }
    );

    // Listen for user interactions with notifications (taps)
    const responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        notificationLogger.log("Notification tapped:", response.notification.request.content.title);
        const data = parseNotificationData(response.notification);
        handleNotificationNavigation(data);
      }
    );

    // Check for notification that launched the app
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        notificationLogger.log("App launched from notification");
        const data = parseNotificationData(response.notification);
        handleNotificationNavigation(data);
      }
    });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [handleNotificationNavigation]);

  return (
    <NotificationContext.Provider
      value={{
        notification,
        setNavigationRef,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
