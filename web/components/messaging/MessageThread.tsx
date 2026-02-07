"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import toast from "react-hot-toast";
import type { Conversation, Message } from "@/lib/types";
import {
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
} from "@/lib/firestore";

interface MessageThreadProps {
  conversation: Conversation;
  currentUserId: string;
  userType: "employer" | "member";
  onMessageSent?: () => void;
  realtimeMessages?: Message[];
}

export default function MessageThread({
  conversation,
  currentUserId,
  userType,
  onMessageSent,
  realtimeMessages,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const otherName =
    userType === "employer"
      ? conversation.memberName || conversation.memberEmail || "Applicant"
      : conversation.employerName || "Employer";

  // Use real-time messages if provided, otherwise load manually
  useEffect(() => {
    if (realtimeMessages) {
      setMessages(realtimeMessages);
      setLoading(false);
    } else {
      loadMessages();
    }
    // Mark messages as read when opening conversation
    markMessagesAsRead(conversation.id, currentUserId, userType).catch(
      console.error
    );
  }, [conversation.id, currentUserId, userType, realtimeMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function loadMessages() {
    try {
      setLoading(true);
      const msgs = await getConversationMessages(conversation.id);
      setMessages(msgs);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const message = await sendMessage({
        conversationId: conversation.id,
        senderId: currentUserId,
        senderType: userType,
        content: newMessage.trim(),
      });

      setMessages((prev) => [...prev, message]);
      setNewMessage("");
      onMessageSent?.();

      // Focus back on input
      inputRef.current?.focus();
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[var(--text-muted)]">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-[var(--card-border)] bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-[#14B8A6]">
            {otherName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-white">{otherName}</h3>
            {conversation.jobTitle && (
              <p className="text-xs text-[var(--text-muted)]">
                Re: {conversation.jobTitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                No messages yet. Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === currentUserId;
            const time = message.createdAt
              ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "numeric",
                    minute: "2-digit",
                  }
                )
              : "";

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isOwn
                      ? "bg-accent text-slate-900"
                      : "bg-surface text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {message.content}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      isOwn ? "text-slate-700" : "text-foreground0"
                    }`}
                  >
                    {time}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-[var(--card-border)] p-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-[var(--card-border)] bg-surface px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="flex-shrink-0 rounded-lg bg-accent px-4 py-2.5 font-medium text-slate-900 transition hover:bg-[#0F9488] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <svg
                className="h-5 w-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-foreground0">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
