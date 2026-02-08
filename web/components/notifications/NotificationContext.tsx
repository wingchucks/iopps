"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  subscribeToNotifications,
  subscribeToUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/firestore/notifications";
import type { Notification } from "@/lib/types";

// ============================================
// TYPES
// ============================================

export interface NotificationContextValue {
  /** Whether the notification dropdown is open */
  isOpen: boolean;
  /** Open the notification dropdown */
  openDropdown: () => void;
  /** Close the notification dropdown */
  closeDropdown: () => void;
  /** Toggle the notification dropdown */
  toggleDropdown: () => void;
  /** Number of unread notifications */
  unreadCount: number;
  /** List of recent notifications */
  notifications: Notification[];
  /** Whether notifications are still loading */
  loading: boolean;
  /** Mark a single notification as read */
  markAsRead: (notificationId: string) => Promise<void>;
  /** Mark all notifications as read */
  markAllAsRead: () => Promise<void>;
}

// ============================================
// CONTEXT
// ============================================

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.uid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset state when user logs out
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubNotifications = subscribeToNotifications(
      user.uid,
      (newNotifications) => {
        setNotifications(newNotifications);
        setLoading(false);
      },
      50
    );

    const unsubUnreadCount = subscribeToUnreadCount(user.uid, (count) => {
      setUnreadCount(count);
    });

    return () => {
      unsubNotifications();
      unsubUnreadCount();
    };
  }, [user?.uid]);

  const openDropdown = useCallback(() => setIsOpen(true), []);
  const closeDropdown = useCallback(() => setIsOpen(false), []);
  const toggleDropdown = useCallback(() => setIsOpen((prev) => !prev), []);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await markNotificationAsRead(notificationId);
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    if (!user?.uid) return;
    try {
      await markAllNotificationsAsRead(user.uid);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, [user]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      isOpen,
      openDropdown,
      closeDropdown,
      toggleDropdown,
      unreadCount,
      notifications,
      loading,
      markAsRead,
      markAllAsRead,
    }),
    [
      isOpen,
      openDropdown,
      closeDropdown,
      toggleDropdown,
      unreadCount,
      notifications,
      loading,
      markAsRead,
      markAllAsRead,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
