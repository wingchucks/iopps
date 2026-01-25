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
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import {
  getConversationMessages,
  sendMessage,
  markConversationAsRead,
  formatDateTime,
} from "../lib/firestore";
import type { Message } from "../types";
import { logger } from "../lib/logger";

export default function ConversationScreen() {
  const route = useRoute();
  const { user } = useAuth();
  const { conversationId, employerName } = route.params as {
    conversationId: string;
    employerName?: string;
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = async () => {
    setLoadError(false);
    try {
      const data = await getConversationMessages(conversationId, 100);
      setMessages(data);
      // Mark conversation as read
      if (user) {
        await markConversationAsRead(conversationId, "member");
      }
    } catch (error) {
      logger.error("Error loading messages:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [conversationId, user]);

  const handleSend = async () => {
    if (!user || !newMessage.trim()) return;

    const content = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    const previousMessages = [...messages];

    setSending(true);
    setNewMessage(""); // Clear input optimistically

    // Optimistic update
    const tempMessage: Message = {
      id: tempId,
      conversationId,
      senderId: user.uid,
      senderType: "member",
      content,
      read: false,
      createdAt: new Date(),
    };
    setMessages([...messages, tempMessage]);

    try {
      await sendMessage(conversationId, user.uid, content);

      // Refresh messages
      const updatedMessages = await getConversationMessages(conversationId, 100);
      setMessages(updatedMessages);
    } catch (error) {
      logger.error("Error sending message:", error);
      // Rollback: remove optimistic message and restore input
      setMessages(previousMessages);
      setNewMessage(content);
      Alert.alert(
        "Failed to Send",
        "Your message could not be sent. Please check your connection and try again."
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
          {item.content}
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>Unable to load messages</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            loadMessages();
          }}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
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
            {(employerName || "E").charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.headerName}>{employerName || "Employer"}</Text>
          <Text style={styles.headerStatus}>IOPPS Employer</Text>
        </View>
      </View>

      {/* Messages List */}
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No messages yet. Start the conversation!
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
          maxLength={1000}
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
    fontSize: 16,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  headerStatus: {
    fontSize: 12,
    color: "#64748B",
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
