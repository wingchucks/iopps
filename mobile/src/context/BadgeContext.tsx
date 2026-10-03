import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { onUnreadConversationCount } from "../lib/messaging";
import { useAuth } from "./AuthContext";
import { logger } from "../lib/logger";

interface BadgeCounts {
  messages: number;
  notifications: number;
  total: number;
}

interface BadgeContextType {
  counts: BadgeCounts;
  refreshCounts: () => void;
}

const BadgeContext = createContext<BadgeContextType>({
  counts: { messages: 0, notifications: 0, total: 0 },
  refreshCounts: () => {},
});

export function BadgeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<BadgeCounts>({
    messages: 0,
    notifications: 0,
    total: 0,
  });

  // Subscribe to unread message count
  useEffect(() => {
    if (!user) {
      setCounts({ messages: 0, notifications: 0, total: 0 });
      return;
    }

    // Listen to conversations with an unread message
    const unsubscribeConversations = onUnreadConversationCount(
      user.uid,
      (unreadConversations) => {
        setCounts((prev) => ({
          ...prev,
          messages: unreadConversations,
          total: unreadConversations + prev.notifications,
        }));
      },
      (error) => {
        logger.error("Error listening to conversations", error);
      }
    );

    // Listen to unread notifications
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      where("read", "==", false)
    );

    const unsubscribeNotifications = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const unreadCount = snapshot.size;
        setCounts((prev) => ({
          ...prev,
          notifications: unreadCount,
          total: prev.messages + unreadCount,
        }));
      },
      (error) => {
        logger.error("Error listening to notifications", error);
      }
    );

    return () => {
      unsubscribeConversations();
      unsubscribeNotifications();
    };
  }, [user]);

  const refreshCounts = useCallback(() => {
    // The real-time listeners handle this automatically
    // This is a placeholder for manual refresh if needed
  }, []);

  return (
    <BadgeContext.Provider value={{ counts, refreshCounts }}>
      {children}
    </BadgeContext.Provider>
  );
}

export const useBadges = () => useContext(BadgeContext);
