import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ViewStyle } from "react-native";

import type { DimensionValue } from "react-native";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Basic skeleton placeholder with shimmer animation
 */
export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Job card skeleton for lists
 */
export function JobCardSkeleton() {
  return (
    <View style={styles.jobCard}>
      <View style={styles.jobCardHeader}>
        <Skeleton width={48} height={48} borderRadius={8} />
        <View style={styles.jobCardHeaderText}>
          <Skeleton width="70%" height={18} />
          <Skeleton width="50%" height={14} style={{ marginTop: 8 }} />
        </View>
      </View>
      <Skeleton width="90%" height={14} style={{ marginTop: 12 }} />
      <View style={styles.jobCardTags}>
        <Skeleton width={80} height={24} borderRadius={12} />
        <Skeleton width={100} height={24} borderRadius={12} />
        <Skeleton width={70} height={24} borderRadius={12} />
      </View>
    </View>
  );
}

/**
 * List of job card skeletons
 */
export function JobListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <JobCardSkeleton key={index} />
      ))}
    </View>
  );
}

/**
 * Conference/Event card skeleton
 */
export function EventCardSkeleton() {
  return (
    <View style={styles.eventCard}>
      <Skeleton width="100%" height={140} borderRadius={12} />
      <View style={styles.eventCardContent}>
        <Skeleton width="80%" height={18} style={{ marginTop: 12 }} />
        <Skeleton width="60%" height={14} style={{ marginTop: 8 }} />
        <View style={styles.eventCardMeta}>
          <Skeleton width={100} height={14} />
          <Skeleton width={80} height={14} />
        </View>
      </View>
    </View>
  );
}

/**
 * List of event card skeletons
 */
export function EventListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <EventCardSkeleton key={index} />
      ))}
    </View>
  );
}

/**
 * Message/Conversation skeleton
 */
export function MessageSkeleton() {
  return (
    <View style={styles.messageRow}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={styles.messageContent}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="80%" height={14} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={50} height={12} />
    </View>
  );
}

/**
 * List of message skeletons
 */
export function MessageListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <MessageSkeleton key={index} />
      ))}
    </View>
  );
}

/**
 * Profile header skeleton
 */
export function ProfileHeaderSkeleton() {
  return (
    <View style={styles.profileHeader}>
      <Skeleton width={80} height={80} borderRadius={40} />
      <Skeleton width={150} height={20} style={{ marginTop: 16 }} />
      <Skeleton width={200} height={14} style={{ marginTop: 8 }} />
      <Skeleton width={80} height={24} borderRadius={12} style={{ marginTop: 12 }} />
    </View>
  );
}

/**
 * Detail page skeleton
 */
export function DetailPageSkeleton() {
  return (
    <View style={styles.detailPage}>
      <Skeleton width="100%" height={200} />
      <View style={styles.detailContent}>
        <Skeleton width="80%" height={24} style={{ marginTop: 16 }} />
        <Skeleton width="60%" height={16} style={{ marginTop: 12 }} />
        <View style={styles.detailMeta}>
          <Skeleton width={100} height={14} />
          <Skeleton width={120} height={14} />
        </View>
        <Skeleton width="100%" height={14} style={{ marginTop: 20 }} />
        <Skeleton width="100%" height={14} style={{ marginTop: 8 }} />
        <Skeleton width="90%" height={14} style={{ marginTop: 8 }} />
        <Skeleton width="95%" height={14} style={{ marginTop: 8 }} />
        <Skeleton width="70%" height={14} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

/**
 * Notification item skeleton
 */
export function NotificationSkeleton() {
  return (
    <View style={styles.notificationRow}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={styles.notificationContent}>
        <Skeleton width="70%" height={14} />
        <Skeleton width="90%" height={12} style={{ marginTop: 6 }} />
        <Skeleton width={60} height={10} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

/**
 * List of notification skeletons
 */
export function NotificationListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <NotificationSkeleton key={index} />
      ))}
    </View>
  );
}

/**
 * Grid item skeleton for shop/vendors
 */
export function GridItemSkeleton() {
  return (
    <View style={styles.gridItem}>
      <Skeleton width="100%" height={120} borderRadius={12} />
      <Skeleton width="80%" height={14} style={{ marginTop: 8 }} />
      <Skeleton width="60%" height={12} style={{ marginTop: 4 }} />
    </View>
  );
}

/**
 * Grid skeleton
 */
export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <GridItemSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#334155",
  },
  list: {
    padding: 16,
  },
  // Job card
  jobCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  jobCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  jobCardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  jobCardTags: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  // Event card
  eventCard: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
  },
  eventCardContent: {
    padding: 16,
  },
  eventCardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  // Message
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E293B",
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  messageContent: {
    flex: 1,
    marginLeft: 12,
  },
  // Profile
  profileHeader: {
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  // Detail page
  detailPage: {
    flex: 1,
  },
  detailContent: {
    padding: 16,
  },
  detailMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  // Notification
  notificationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#1E293B",
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },
  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  gridItem: {
    width: "47%",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 12,
  },
});
