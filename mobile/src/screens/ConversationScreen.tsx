import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  AppState,
} from "react-native";
import { useIsFocused, useRoute } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useNetwork } from "../context/NetworkContext";
import { formatDateTime } from "../lib/firestore";
import {
  getConversationPeer,
  markConversationRead,
  onConversation,
  onMessages,
  sendMessage,
  MESSAGE_TEXT_MAX,
  UNKNOWN_PEER_NAME,
} from "../lib/messaging";
import type { Conversation, Message } from "../types";
import { logger } from "../lib/logger";

// The rules refuse missing and foreign conversations alike: both are "unavailable".
type LoadError = "unavailable" | "failed";
type ConversationLoad = { key: string; conversation: Conversation | null; error?: LoadError };
type MessagesLoad = { key: string; messages: Message[]; error?: LoadError };
const loadError = (error: { code?: string }): LoadError =>
  error.code === "permission-denied" ? "unavailable" : "failed";

// Links from notifications are untrusted input: one plain document ID only.
const isConversationId = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 500 && !value.includes("/");

// Messages that arrive while the app is not active (in the background, the app
// switcher or behind Control Center) stay unread.
function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setActive(state === "active"));
    return () => subscription.remove();
  }, []);
  return active;
}

export default function ConversationScreen() {
  const route = useRoute();
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const isFocused = useIsFocused();
  const appActive = useAppActive();
  const { conversationId, peerName } = (route.params ?? {}) as {
    conversationId?: string;
    peerName?: string;
  };
  const validId = isConversationId(conversationId);
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([user?.uid, conversationId, attempt]);
  const [conversationLoad, setConversationLoad] = useState<ConversationLoad | null>(null);
  const [messagesLoad, setMessagesLoad] = useState<MessagesLoad | null>(null);
  const [peerLookup, setPeerLookup] = useState<{ conversationId: string; name: string } | null>(null);
  const [draft, setDraft] = useState({ conversationId, text: "" });
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const conversationState = conversationLoad?.key === key ? conversationLoad : null;
  const messagesState = messagesLoad?.key === key ? messagesLoad : null;
  const conversation = conversationState?.conversation ?? null;
  const messages = messagesState?.messages ?? [];
  const unavailable = !validId || conversationState?.error === "unavailable" ||
    messagesState?.error === "unavailable" ||
    (!!conversationState && !conversationState.error && !conversation);
  const failed = conversationState?.error === "failed" || messagesState?.error === "failed";
  const loading = !unavailable && !failed && (!conversationState || !messagesState);
  const newMessage = draft.conversationId === conversationId ? draft.text : "";
  const displayName = peerName ||
    (peerLookup && peerLookup.conversationId === conversationId ? peerLookup.name : "") ||
    UNKNOWN_PEER_NAME;

  // The conversation (participants and unread marker) and its latest messages, live.
  useEffect(() => {
    if (!user || !isConversationId(conversationId)) return;
    let active = true;
    const stopConversation = onConversation(
      conversationId,
      (value) => {
        if (active) setConversationLoad({ key, conversation: value });
      },
      (error) => {
        logger.error("Error loading conversation:", error);
        if (active) setConversationLoad({ key, conversation: null, error: loadError(error) });
      }
    );
    const stopMessages = onMessages(
      conversationId,
      (value) => {
        if (active) setMessagesLoad({ key, messages: value });
      },
      (error) => {
        logger.error("Error loading messages:", error);
        if (active) setMessagesLoad({ key, messages: [], error: loadError(error) });
      }
    );
    return () => {
      active = false;
      stopConversation();
      stopMessages();
    };
  }, [user, conversationId, key]);

  // Clear the unread marker only while the member is actually looking at it.
  useEffect(() => {
    if (!user || !conversation || !isFocused || !appActive) return;
    if (conversation.unreadBy !== user.uid) return;
    markConversationRead(conversation.id).catch((error) =>
      logger.error("Error marking conversation as read:", error)
    );
  }, [user, conversation, isFocused, appActive]);

  useEffect(() => {
    if (peerName || !user || !isConversationId(conversationId)) return;
    let active = true;
    void getConversationPeer(conversationId).then((peer) => {
      if (active && peer) setPeerLookup({ conversationId, name: peer.displayName });
    });
    return () => {
      active = false;
    };
  }, [peerName, user, conversationId]);

  const setNewMessage = (text: string) => setDraft({ conversationId, text });

  const handleSend = async () => {
    const submitted = newMessage;
    const text = submitted.trim();
    if (!user || !conversation || !text || sending) return;
    if (!isConnected) {
      Alert.alert("No Internet Connection", "Connect to the internet to send your message.");
      return;
    }
    const recipientId = conversation.participants.find((participant) => participant !== user.uid) ?? "";

    setSending(true);
    try {
      const saved = await sendMessage(conversation.id, user.uid, text, recipientId);
      // Clear only the text that was sent, never anything typed while it was sending.
      setDraft((current) =>
        current.conversationId === conversation.id && current.text === submitted
          ? { ...current, text: "" }
          : current
      );
      void saved.notification.then((result) => {
        if (result.state === "failed") logger.warn("Message sent; its email notification was not confirmed");
      });
    } catch (error) {
      logger.error("Error sending message:", error);
      // The rules refuse messages to a member who turned off "Allow Direct Messages".
      const denied = (error as { code?: unknown } | null)?.code === "permission-denied";
      Alert.alert(
        "Failed to Send",
        denied
          ? "This member isn't accepting messages."
          : "Your message could not be sent. Please check your connection and try again."
      );
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === user?.uid;

    return (
      <View
        style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
          ]}
        >
          {item.text}
        </Text>
        <Text
          style={[
            styles.timestamp,
            isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp,
          ]}
        >
          {formatDateTime(item.createdAt)}
        </Text>
      </View>
    );
  };

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Please sign in to view this conversation.</Text>
      </View>
    );
  }

  if (unavailable) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>💬</Text>
        <Text style={styles.errorText}>This conversation isn't available.</Text>
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>Unable to load messages</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => setAttempt((value) => value + 1)}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      {/* Chat Header */}
      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.headerName} numberOfLines={1}>
          {displayName}
        </Text>
      </View>

      {/* Messages List */}
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No messages yet. Say hello!
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />
      )}

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor="#64748B"
          multiline
          maxLength={MESSAGE_TEXT_MAX}
          accessibilityLabel="Message"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!newMessage.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!newMessage.trim() || sending}
        >
          <Text
            style={[
              styles.sendButtonText,
              (!newMessage.trim() || sending) && styles.sendButtonTextDisabled,
            ]}
          >
            {sending ? "..." : "Send"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#14B8A6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  ownMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#14B8A6",
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#1E293B",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  ownMessageText: {
    color: "#0F172A",
  },
  otherMessageText: {
    color: "#F8FAFC",
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  ownTimestamp: {
    color: "#0F172A80",
    textAlign: "right",
  },
  otherTimestamp: {
    color: "#64748B",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 16,
    paddingBottom: 32,
    backgroundColor: "#1E293B",
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  input: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#F8FAFC",
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: "#14B8A6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: "#334155",
  },
  sendButtonText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600",
  },
  sendButtonTextDisabled: {
    color: "#64748B",
  },
  // Error state
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#94A3B8",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#14B8A6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "600",
  },
});
