"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import type { Message } from "@/lib/types";
import type { PeerConversation } from "@/lib/firestore/messaging";
import {
  getConversationMessages,
  sendPeerMessage,
  markPeerMessagesAsRead,
  getOtherParticipant,
} from "@/lib/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Send } from "lucide-react";

interface PeerMessageThreadProps {
  conversation: PeerConversation;
  currentUserId: string;
  onMessageSent?: () => void;
  realtimeMessages?: Message[];
}

export default function PeerMessageThread({
  conversation,
  currentUserId,
  onMessageSent,
  realtimeMessages,
}: PeerMessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const otherParticipant = getOtherParticipant(conversation, currentUserId);

  // Use real-time messages if provided, otherwise load manually
  useEffect(() => {
    if (realtimeMessages) {
      setMessages(realtimeMessages);
      setLoading(false);
    } else {
      loadMessages();
    }
    // Mark messages as read when opening conversation
    markPeerMessagesAsRead(conversation.id, currentUserId).catch(console.error);
  }, [conversation.id, currentUserId, realtimeMessages]);

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
      const message = await sendPeerMessage({
        conversationId: conversation.id,
        senderId: currentUserId,
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

  // Get initials for avatar fallback
  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-slate-400">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherParticipant.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-sm">
                {getInitials(otherParticipant.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-white">{otherParticipant.name || "Member"}</h3>
              <p className="text-xs text-slate-400">Community Member</p>
            </div>
          </div>
          <Link
            href={`/member/${otherParticipant.id}`}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
          >
            View Profile
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Avatar className="h-16 w-16 mx-auto mb-4">
                <AvatarImage src={otherParticipant.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xl">
                  {getInitials(otherParticipant.name)}
                </AvatarFallback>
              </Avatar>
              <h4 className="font-semibold text-white mb-1">{otherParticipant.name}</h4>
              <p className="text-sm text-slate-400 mb-4">
                Start a conversation with {otherParticipant.name?.split(" ")[0] || "this member"}!
              </p>
              <p className="text-xs text-slate-500">
                Say hello and start connecting with the community.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === currentUserId;
            const time = message.createdAt
              ? new Date(message.createdAt.seconds * 1000).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "";

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex items-end gap-2 max-w-[75%] ${isOwn ? "flex-row-reverse" : ""}`}>
                  {!isOwn && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={otherParticipant.avatar} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-xs">
                        {getInitials(otherParticipant.name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      isOwn
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                        : "bg-slate-800 text-slate-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {message.content}
                    </p>
                    <p
                      className={`mt-1 text-xs ${
                        isOwn ? "text-emerald-100/70" : "text-slate-500"
                      }`}
                    >
                      {time}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-slate-800 p-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${otherParticipant.name?.split(" ")[0] || "member"}...`}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="flex-shrink-0 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 font-medium text-white transition hover:shadow-lg hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
