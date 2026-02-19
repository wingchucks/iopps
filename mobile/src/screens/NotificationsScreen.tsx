import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import {
  getMemberNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  formatTimestamp,
} from "../lib/firestore";
import { fetchWithCache, CACHE_KEYS, CACHE_TTL, saveToCache } from "../lib/cache";
import { NotificationListSkeleton } from "../components/Skeleton";
import type { Notification, NotificationType } from "../types";
import { logger } from "../lib/logger";

const NOTIFICATION_CONFIG: Record<
  NotificationType,
  { icon: string; color: string }
> = {
  new_application: { icon: "📋", color: "#3B82F6" },
  application_status: { icon: "📊", color: "#F59E0B" },
  new_message: { icon: "💬", color: "#14B8A6" },
  job_alert: { icon: "🔔", color: "#8B5CF6" },
  employer_approved: { icon: "✅", color: "#10B981" },
  employer_rejected: { icon: "❌", color: "#EF4444" },
  scholarship_status: { icon: "🎓", color: "#F59E0B" },
  system: { icon: "📢", color: "#64748B" },
};

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async (forceRefresh = false) => {
    if (!user) return;
    setError(null);
    try {
      const cacheKey = CACHE_KEYS.NOTIFICATIONS(user.uid);

      if (forceRefresh) {
        const data = await getMemberNotifications(user.uid, 50);
        await saveToCache(cacheKey, data, CACHE_TTL.SHORT);
        setNotifications(data);
      } else {
        const { data } = await fetchWithCache<Notification[]>(
          cacheKey,
          () => getMemberNotifications(user.uid, 50),
          CACHE_TTL.SHORT
        );
        setNotifications(data);
      }
    } catch (err) {
      logger.error("Error loading notifications:", err);
      if (notifications.length === 0) {
        setError("Unable to load notifications. Please check your connection.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications(true);
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read (optimistic update)
    if (!notification.read) {
      // Update UI immediately
      setNotifications(
        notifications.map((n) =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
      // Then update backend
      try {
        await markNotificationAsRead(notification.id);
      } catch (err) {
        logger.error("Error marking notification as read:", err);
        // Rollback on failure
        setNotifications(
          notifications.map((n) =>
            n.id === notification.id ? { ...n, read: false } : n
          )
        );
      }
    }

    // Navigate based on notification type
    if (notification.relatedJobId) {
      (navigation as any).navigate("JobDetail", {
        jobId: notification.relatedJobId,
      });
    } else if (notification.relatedConversationId) {
      (navigation as any).navigate("Conversation", {
        conversationId: notification.relatedConversationId,
      });
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    const previousNotifications = [...notifications];
    // Optimistic update
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsAsRead(user.uid);
    } catch (err) {
      logger.error("Error marking all as read:", err);
      // Rollback on failure
      setNotifications(previousNotifications);
      Alert.alert("Error", "Unable to mark notifications as read. Please try again.");
    }
  };

  const renderNotificationCard = ({ item }: { item: Notification }) => {
    const config = NOTIFICATION_CONFIG[item.type] || NOTIFICATION_CONFIG.system;

    return (
      <TouchableOpacity
        style={[styles.card, !item.read && styles.cardUnread]}
        onPress={() => handleNotificationPress(item)}
      >
        <View
          style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}
        >
          <Text style={styles.icon}>{config.icon}</Text>
        </View>

        <View style={styles.contentContainer}>
          <Text style={[styles.title, !item.read && styles.titleUnread]}>
            {item.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.timestamp}>
            {formatTimestamp(item.createdAt)}
          </Text>
        </View>

        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.messageTitle}>Sign in Required</Text>
        <Text style={styles.messageText}>
          Please sign in to view your notifications.
        </Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => (navigation as any).navigate("SignIn")}
        >
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>Loading...</Text>
          </View>
        </View>
        <NotificationListSkeleton count={8} />
      </View>
    );
  }

  // Error state - only show if no notifications loaded
  if (error && notifications.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>Unable to load</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to Load Notifications</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              loadNotifications(true);
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up!"}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllRead}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyText}>
            You'll be notified about job alerts, application updates, and
            messages here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#14B8A6"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 4,
  },
  markAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  markAllText: {
    fontSize: 14,
    color: "#14B8A6",
    fontWeight: "600",
  },
  list: {
    padding: 16,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "flex-start",
  },
  cardUnread: {
    backgroundColor: "#14B8A610",
    borderColor: "#14B8A640",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  icon: {
    fontSize: 18,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  titleUnread: {
    fontWeight: "600",
  },
  message: {
    fontSize: 14,
    color: "#94A3B8",
    lineHeight: 20,
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 12,
    color: "#64748B",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#14B8A6",
    marginLeft: 8,
    marginTop: 6,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 20,
  },
  signInButton: {
    backgroundColor: "#14B8A6",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  signInButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    color: "#94A3B8",
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
  },
  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: "#14B8A6",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "600",
  },
});
