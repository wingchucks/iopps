"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  getMemberConversations,
  getPeerConversations,
  getConversation,
  getOtherParticipant,
} from "@/lib/firestore";
import type { Conversation } from "@/lib/types";
import type { PeerConversation } from "@/lib/firestore/messaging";
import ConversationList from "@/components/messaging/ConversationList";
import MessageThread from "@/components/messaging/MessageThread";
import PeerMessageThread from "@/components/messaging/PeerMessageThread";
import Link from "next/link";
import { Users, Briefcase, MessageSquare } from "lucide-react";

type ConversationType = "all" | "employers" | "peers";

// Combined conversation type for the list
type AnyConversation = (Conversation & { conversationType: "employer" }) | (PeerConversation & { conversationType: "peer" });

export default function MessagesTab() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const conversationParam = searchParams.get("conversation");

  const [employerConversations, setEmployerConversations] = useState<Conversation[]>([]);
  const [peerConversations, setPeerConversations] = useState<PeerConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<AnyConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ConversationType>("all");

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [employerConvos, peerConvos] = await Promise.all([
        getMemberConversations(user.uid),
        getPeerConversations(user.uid),
      ]);
      setEmployerConversations(employerConvos);
      setPeerConversations(peerConvos);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Handle deep link to specific conversation
  useEffect(() => {
    if (!conversationParam || loading) return;

    // Check if it's in peer conversations
    const peerConvo = peerConversations.find((c) => c.id === conversationParam);
    if (peerConvo) {
      setSelectedConversation({ ...peerConvo, conversationType: "peer" });
      return;
    }

    // Check if it's in employer conversations
    const employerConvo = employerConversations.find((c) => c.id === conversationParam);
    if (employerConvo) {
      setSelectedConversation({ ...employerConvo, conversationType: "employer" });
      return;
    }

    // If not found locally, try to fetch it
    const fetchConversation = async () => {
      try {
        const convo = await getConversation(conversationParam);
        if (convo) {
          // Determine type based on conversation structure
          if ("type" in convo && convo.type === "peer") {
            setSelectedConversation({ ...convo as unknown as PeerConversation, conversationType: "peer" });
          } else {
            setSelectedConversation({ ...convo, conversationType: "employer" });
          }
        }
      } catch (error) {
        console.error("Error fetching conversation:", error);
      }
    };
    fetchConversation();
  }, [conversationParam, loading, peerConversations, employerConversations]);

  function handleSelectConversation(conversation: AnyConversation) {
    setSelectedConversation(conversation);
  }

  function handleMessageSent() {
    loadConversations();
  }

  // Combine and sort conversations
  const allConversations: AnyConversation[] = [
    ...employerConversations.map((c) => ({ ...c, conversationType: "employer" as const })),
    ...peerConversations.map((c) => ({ ...c, conversationType: "peer" as const })),
  ].sort((a, b) => {
    const timeA = a.lastMessageAt?.seconds || a.createdAt?.seconds || 0;
    const timeB = b.lastMessageAt?.seconds || b.createdAt?.seconds || 0;
    return timeB - timeA;
  });

  // Filter conversations
  const filteredConversations = allConversations.filter((c) => {
    if (filter === "all") return true;
    if (filter === "employers") return c.conversationType === "employer";
    if (filter === "peers") return c.conversationType === "peer";
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[var(--text-muted)]">Loading messages...</div>
      </div>
    );
  }

  if (allConversations.length === 0) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-12 text-center">
        <div className="mx-auto max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface">
            <MessageSquare className="h-8 w-8 text-foreground0" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">No messages yet</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Connect with other members or apply to jobs to start conversations.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/members"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white transition hover:shadow-lg hover:shadow-emerald-500/30"
            >
              <Users className="h-4 w-4" />
              Find Members
            </Link>
            <Link
              href="/careers"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--card-border)] px-6 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-surface"
            >
              <Briefcase className="h-4 w-4" />
              Browse Jobs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-xl font-bold text-white">Messages</h2>

        {/* Filter Tabs */}
        <div className="flex gap-2 bg-surface rounded-lg p-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
              filter === "all"
                ? "bg-slate-700 text-white"
                : "text-[var(--text-muted)] hover:text-white"
            }`}
          >
            All ({allConversations.length})
          </button>
          <button
            onClick={() => setFilter("employers")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center gap-1.5 ${
              filter === "employers"
                ? "bg-slate-700 text-white"
                : "text-[var(--text-muted)] hover:text-white"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            Employers ({employerConversations.length})
          </button>
          <button
            onClick={() => setFilter("peers")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition flex items-center gap-1.5 ${
              filter === "peers"
                ? "bg-slate-700 text-white"
                : "text-[var(--text-muted)] hover:text-white"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Members ({peerConversations.length})
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-slate-900/60">
        <div className="grid h-[calc(100vh-400px)] min-h-[500px] md:grid-cols-[320px_1fr]">
          {/* Conversation List */}
          <div className="border-r border-[var(--card-border)] overflow-y-auto">
            <div className="border-b border-[var(--card-border)] p-4">
              <h3 className="font-semibold text-white">Conversations</h3>
            </div>
            <PeerAwareConversationList
              conversations={filteredConversations}
              selectedId={selectedConversation?.id}
              onSelect={handleSelectConversation}
              currentUserId={user!.uid}
              loading={loading}
            />
          </div>

          {/* Message Thread */}
          <div className="hidden md:block">
            {selectedConversation ? (
              selectedConversation.conversationType === "peer" ? (
                <PeerMessageThread
                  conversation={selectedConversation as PeerConversation}
                  currentUserId={user!.uid}
                  onMessageSent={handleMessageSent}
                />
              ) : (
                <MessageThread
                  conversation={selectedConversation as Conversation}
                  currentUserId={user!.uid}
                  userType="member"
                  onMessageSent={handleMessageSent}
                />
              )
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-16 w-16 text-slate-600" />
                  <p className="mt-4">Select a conversation to view messages</p>
                  <p className="mt-2 text-sm text-foreground0">
                    Chat with employers about jobs or connect with other members
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Mobile: Show thread if selected */}
          {selectedConversation && (
            <div className="absolute inset-0 z-10 bg-background md:hidden">
              <div className="h-full">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="flex items-center gap-2 border-b border-[var(--card-border)] bg-surface px-4 py-3 text-sm text-[var(--text-muted)]"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back to conversations
                </button>
                <div className="h-[calc(100%-48px)]">
                  {selectedConversation.conversationType === "peer" ? (
                    <PeerMessageThread
                      conversation={selectedConversation as PeerConversation}
                      currentUserId={user!.uid}
                      onMessageSent={handleMessageSent}
                    />
                  ) : (
                    <MessageThread
                      conversation={selectedConversation as Conversation}
                      currentUserId={user!.uid}
                      userType="member"
                      onMessageSent={handleMessageSent}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Peer-aware conversation list component
interface PeerAwareConversationListProps {
  conversations: AnyConversation[];
  selectedId?: string;
  onSelect: (conversation: AnyConversation) => void;
  currentUserId: string;
  loading?: boolean;
}

function PeerAwareConversationList({
  conversations,
  selectedId,
  onSelect,
  currentUserId,
  loading,
}: PeerAwareConversationListProps) {
  if (loading) {
    return (
      <div className="p-4">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 rounded-lg bg-surface" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center">
        <MessageSquare className="mx-auto h-12 w-12 text-slate-600" />
        <p className="mt-3 text-sm text-[var(--text-muted)]">No conversations found</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--card-border)]">
      {conversations.map((conversation) => {
        let displayName: string;
        let unreadCount: number;
        let subtitle: string | null = null;
        let icon: React.ReactNode;

        if (conversation.conversationType === "peer") {
          const peerConvo = conversation as PeerConversation;
          const other = getOtherParticipant(peerConvo, currentUserId);
          displayName = other.name || "Member";
          const isParticipant1 = peerConvo.participant1Id === currentUserId;
          unreadCount = isParticipant1
            ? peerConvo.participant1UnreadCount
            : peerConvo.participant2UnreadCount;
          icon = <Users className="h-4 w-4" />;
        } else {
          const employerConvo = conversation as Conversation;
          displayName = employerConvo.employerName || "Employer";
          unreadCount = employerConvo.memberUnreadCount || 0;
          subtitle = employerConvo.jobTitle ? `Re: ${employerConvo.jobTitle}` : null;
          icon = <Briefcase className="h-4 w-4" />;
        }

        const isSelected = selectedId === conversation.id;
        const lastMessageTime = conversation.lastMessageAt
          ? formatTimeAgo(
              conversation.lastMessageAt.seconds
                ? new Date(conversation.lastMessageAt.seconds * 1000)
                : new Date()
            )
          : "";

        return (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className={`w-full p-4 text-left transition hover:bg-surface ${
              isSelected ? "bg-slate-800/70 border-l-2 border-accent" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-foreground0`}>{icon}</span>
                  <span
                    className={`font-medium truncate ${
                      unreadCount > 0 ? "text-white" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {displayName}
                  </span>
                  {unreadCount > 0 && (
                    <span className="flex-shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-slate-900">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {subtitle && (
                  <p className="mt-0.5 text-xs text-foreground0 truncate">{subtitle}</p>
                )}
                {conversation.lastMessage && (
                  <p
                    className={`mt-1 text-sm truncate ${
                      unreadCount > 0 ? "text-[var(--text-secondary)]" : "text-foreground0"
                    }`}
                  >
                    {conversation.lastMessage}
                  </p>
                )}
              </div>
              {lastMessageTime && (
                <span className="flex-shrink-0 text-xs text-foreground0">
                  {lastMessageTime}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
