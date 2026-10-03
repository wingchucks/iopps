import React, { useState, useCallback } from "react";
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
import { formatTimestamp } from "../lib/firestore";
import { getConversationPeer, onConversations, UNKNOWN_PEER_NAME } from "../lib/messaging";
import { MessageListSkeleton } from "../components/Skeleton";
import type { Conversation } from "../types";
import { logger } from "../lib/logger";

type Inbox = { owner: string; conversations: Conversation[]; failed: boolean };

export default function MessagesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [peerNames, setPeerNames] = useState<Record<string, string>>({});
  const [subscription, setSubscription] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Live inbox while this screen is in view.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      const owner = user.uid;
      let active = true;
      const unsubscribe = onConversations(
        owner,
        (conversations) => {
          if (!active) return;
          setInbox({ owner, conversations, failed: false });
          setRefreshing(false);
          for (const conversation of conversations) {
            const key = `${owner}/${conversation.id}`;
            void getConversationPeer(conversation.id).then((peer) => {
              if (!active || !peer) return;
              setPeerNames((previous) =>
                previous[key] === peer.displayName ? previous : { ...previous, [key]: peer.displayName }
              );
            });
          }
        },
        (error) => {
          logger.error("Error loading conversations:", error);
          if (!active) return;
          setInbox({ owner, conversations: [], failed: true });
          setRefreshing(false);
        }
      );
      return () => {
        active = false;
        unsubscribe();
      };
    }, [user, subscription])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setSubscription((value) => value + 1);
  };

  const retry = () => {
    setInbox(null);
    setSubscription((value) => value + 1);
  };

  const renderConversationCard = ({ item }: { item: Conversation }) => {
    const hasUnread = item.unreadBy === user?.uid;
    const loadedName = peerNames[`${user?.uid}/${item.id}`];
    const name = loadedName || UNKNOWN_PEER_NAME;
    const preview = item.lastMessage
      ? `${item.lastSenderId === user?.uid ? "You: " : ""}${item.lastMessage}`
      : "No messages yet";

    return (
      <TouchableOpacity
        style={[styles.card, hasUnread && styles.cardUnread]}
        onPress={() =>
          (navigation as any).navigate("Conversation", {
            conversationId: item.id,
            peerName: loadedName,
          })
        }
        accessibilityLabel={`Conversation with ${name}${hasUnread ? ", unread messages" : ""}`}
        accessibilityRole="button"
        accessibilityHint="Tap to open conversation"
        testID={`conversation-card-${item.id}`}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar} accessibilityElementsHidden>
            <Text style={styles.avatarText}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
          {hasUnread && <View style={styles.unreadDot} accessibilityElementsHidden />}
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.headerRow}>
            <Text style={[styles.peerName, hasUnread && styles.unreadText]} numberOfLines={1} ellipsizeMode="tail">
              {name}
            </Text>
            <Text style={styles.timestamp}>
              {item.lastMessageAt ? formatTimestamp(item.lastMessageAt) : ""}
            </Text>
          </View>

          <Text
            style={[styles.lastMessage, hasUnread && styles.unreadText]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {preview}
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
          style={styles.actionButton}
          onPress={() => (navigation as any).navigate("SignIn")}
          accessibilityLabel="Sign in to view messages"
          accessibilityRole="button"
          testID="messages-signin-button"
        >
          <Text style={styles.actionButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!inbox || inbox.owner !== user.uid) {
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

  if (inbox.failed) {
    return (
      <View style={styles.centered}>
        <Text style={styles.messageTitle}>Unable to load messages</Text>
        <Text style={styles.messageText}>
          Please check your connection and try again.
        </Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={retry}
          accessibilityLabel="Try loading messages again"
          accessibilityRole="button"
          testID="messages-retry-button"
        >
          <Text style={styles.actionButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { conversations } = inbox;

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
            Your existing private conversations will appear here.
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
  peerName: {
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
  actionButton: {
    backgroundColor: "#14B8A6",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  actionButtonText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "600",
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
