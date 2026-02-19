import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getMemberConversations, formatTimestamp } from "../lib/firestore";
import { fetchWithCache, CACHE_KEYS, CACHE_TTL, saveToCache } from "../lib/cache";
import { MessageListSkeleton } from "../components/Skeleton";
import type { Conversation } from "../types";
import { logger } from "../lib/logger";

export default function MessagesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = async (forceRefresh = false) => {
    if (!user) return;
    try {
      const cacheKey = CACHE_KEYS.CONVERSATIONS(user.uid);

      if (forceRefresh) {
        const data = await getMemberConversations(user.uid);
        await saveToCache(cacheKey, data, CACHE_TTL.SHORT);
        setConversations(data);
      } else {
        const { data, fromCache } = await fetchWithCache<Conversation[]>(
          cacheKey,
          () => getMemberConversations(user.uid),
          CACHE_TTL.SHORT
        );
        setConversations(data);
      }
    } catch (error) {
      logger.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [user])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations(true);
  };

  const renderConversationCard = ({ item }: { item: Conversation }) => {
    const hasUnread = item.memberUnreadCount > 0;

    return (
      <TouchableOpacity
        style={[styles.card, hasUnread && styles.cardUnread]}
        onPress={() =>
          (navigation as any).navigate("Conversation", {
            conversationId: item.id,
            employerName: item.employerName,
          })
        }
        accessibilityLabel={`Conversation with ${item.employerName || "Employer"}${hasUnread ? `, ${item.memberUnreadCount} unread message${item.memberUnreadCount > 1 ? "s" : ""}` : ""}`}
        accessibilityRole="button"
        accessibilityHint="Tap to open conversation"
        testID={`conversation-card-${item.id}`}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar} accessibilityElementsHidden>
            <Text style={styles.avatarText}>
              {(item.employerName || "E").charAt(0).toUpperCase()}
            </Text>
          </View>
          {hasUnread && <View style={styles.unreadDot} accessibilityElementsHidden />}
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.headerRow}>
            <Text style={[styles.employerName, hasUnread && styles.unreadText]} numberOfLines={1} ellipsizeMode="tail">
              {item.employerName || "Employer"}
            </Text>
            <Text style={styles.timestamp}>
              {item.lastMessageAt ? formatTimestamp(item.lastMessageAt) : ""}
            </Text>
          </View>

          {item.jobTitle && (
            <Text style={styles.jobTitle} numberOfLines={1} ellipsizeMode="tail">Re: {item.jobTitle}</Text>
          )}

          <Text
            style={[styles.lastMessage, hasUnread && styles.unreadText]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.lastMessage || "No messages yet"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.messageTitle}>Sign in Required</Text>
        <Text style={styles.messageText}>
          Please sign in to view your messages.
        </Text>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => (navigation as any).navigate("SignIn")}
          accessibilityLabel="Sign in to view messages"
          accessibilityRole="button"
          testID="messages-signin-button"
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
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>Loading...</Text>
        </View>
        <MessageListSkeleton count={6} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <Text style={styles.headerSubtitle}>
          {conversations.length} conversation{conversations.length !== 1 && "s"}
        </Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyText}>
            When you apply to jobs or employers contact you, your conversations
            will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationCard}
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
  },
  cardUnread: {
    borderColor: "#14B8A640",
    backgroundColor: "#14B8A610",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#14B8A6",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#14B8A6",
    borderWidth: 2,
    borderColor: "#0F172A",
  },
  conversationInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  employerName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#F8FAFC",
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 8,
  },
  jobTitle: {
    fontSize: 12,
    color: "#14B8A6",
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: "#94A3B8",
  },
  unreadText: {
    fontWeight: "600",
    color: "#F8FAFC",
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
});
