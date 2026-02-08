"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getConversation, getOtherParticipant } from "@/lib/firestore";
import type { Conversation } from "@/lib/types";
import type { PeerConversation } from "@/lib/firestore/messaging";
import MessageThread from "@/components/messaging/MessageThread";
import PeerMessageThread from "@/components/messaging/PeerMessageThread";
import NewMessageDialog from "@/components/messaging/NewMessageDialog";
import { useRealtimeConversations } from "@/components/messaging/useRealtimeConversations";
import { useRealtimeMessages } from "@/components/messaging/useRealtimeMessages";
import { Suspense } from "react";
import {
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Users, Briefcase, MessageSquare, Plus } from "lucide-react";

type ConversationType = "all" | "employers" | "peers";

// Combined conversation type for the list
type AnyConversation =
  | (Conversation & { conversationType: "employer" })
  | (PeerConversation & { conversationType: "peer" });

function MemberMessagesContent() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdParam = searchParams?.get("id");

  const [selectedConversation, setSelectedConversation] =
    useState<AnyConversation | null>(null);
  const [filter, setFilter] = useState<ConversationType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  // Real-time conversations
  const {
    employerConversations,
    peerConversations,
    loading,
  } = useRealtimeConversations(user?.uid ?? null);

  // Real-time messages for selected conversation
  const { messages: realtimeMessages } = useRealtimeMessages(
    selectedConversation?.id ?? null
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user || role !== "community") {
      router.push("/");
    }
  }, [user, role, authLoading, router]);

  // Handle deep link to specific conversation
  useEffect(() => {
    if (!conversationIdParam || loading || !user) return;

    // Check peer conversations first
    const peerConvo = peerConversations.find((c) => c.id === conversationIdParam);
    if (peerConvo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: sync selected conversation from URL param
      setSelectedConversation({ ...peerConvo, conversationType: "peer" });
      return;
    }

    // Check employer conversations
    const employerConvo = employerConversations.find(
      (c) => c.id === conversationIdParam
    );
    if (employerConvo) {
      setSelectedConversation({ ...employerConvo, conversationType: "employer" });
      return;
    }

    // If not found locally, try to fetch it
    const fetchConversation = async () => {
      try {
        const convo = await getConversation(conversationIdParam);
        if (convo) {
          if ("type" in convo && (convo as Record<string, unknown>).type === "peer") {
            setSelectedConversation({
              ...(convo as unknown as PeerConversation),
              conversationType: "peer",
            });
          } else if (convo.memberId === user.uid) {
            setSelectedConversation({ ...convo, conversationType: "employer" });
          }
        }
      } catch (error) {
        console.error("Error fetching conversation:", error);
      }
    };
    fetchConversation();
  }, [conversationIdParam, loading, peerConversations, employerConversations, user]);

  // Combine and sort conversations
  const allConversations: AnyConversation[] = useMemo(() => {
    return [
      ...employerConversations.map((c) => ({
        ...c,
        conversationType: "employer" as const,
      })),
      ...peerConversations.map((c) => ({
        ...c,
        conversationType: "peer" as const,
      })),
    ].sort((a, b) => {
      const timeA = a.lastMessageAt?.seconds || a.createdAt?.seconds || 0;
      const timeB = b.lastMessageAt?.seconds || b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  }, [employerConversations, peerConversations]);

  // Filter + search
  const filteredConversations = useMemo(() => {
    let result = allConversations;

    // Type filter
    if (filter === "employers") {
      result = result.filter((c) => c.conversationType === "employer");
    } else if (filter === "peers") {
      result = result.filter((c) => c.conversationType === "peer");
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => {
        if (c.conversationType === "employer") {
          const ec = c as Conversation;
          return (
            ec.employerName?.toLowerCase().includes(q) ||
            ec.jobTitle?.toLowerCase().includes(q) ||
            ec.lastMessage?.toLowerCase().includes(q)
          );
        } else {
          const pc = c as PeerConversation;
          const other = getOtherParticipant(pc, user!.uid);
          return (
            other.name?.toLowerCase().includes(q) ||
            pc.lastMessage?.toLowerCase().includes(q)
          );
        }
      });
    }

    return result;
  }, [allConversations, filter, searchQuery, user]);

  function handleSelectConversation(conversation: AnyConversation) {
    setSelectedConversation(conversation);
    // Update URL without full navigation
    const url = new URL(window.location.href);
    url.searchParams.set("id", conversation.id);
    window.history.pushState({}, "", url.toString());
  }

  const handleConversationCreated = useCallback(
    (conversationId: string) => {
      // The real-time listener will pick up the new conversation automatically
      // Update URL to show the new conversation
      const url = new URL(window.location.href);
      url.searchParams.set("id", conversationId);
      window.history.pushState({}, "", url.toString());

      // Wait briefly for real-time data, then try to select
      setTimeout(() => {
        const peer = peerConversations.find((c) => c.id === conversationId);
        if (peer) {
          setSelectedConversation({ ...peer, conversationType: "peer" });
        }
      }, 500);
    },
    [peerConversations]
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-[var(--text-muted)]">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (!user || role !== "community") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-[var(--card-border)] bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={user ? `/member/${user.uid}` : '/discover'}
                className="text-sm text-[var(--text-muted)] hover:text-[#14B8A6]"
              >
                &larr; My Profile
              </Link>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                Messages
              </h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Your conversations</p>
            </div>
            <button
              onClick={() => setNewMessageOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:shadow-lg hover:shadow-emerald-500/30"
            >
              <Plus className="h-4 w-4" />
              New Message
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <div className="flex gap-2 rounded-lg bg-surface p-1 w-fit">
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

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-4">
        {allConversations.length === 0 ? (
          <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-12 text-center">
            <MessageSquare className="mx-auto h-16 w-16 text-[var(--text-secondary)]" />
            <h3 className="mt-4 text-lg font-semibold text-white">
              No messages yet
            </h3>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Connect with other members or apply to jobs to start conversations.
            </p>
            <button
              onClick={() => setNewMessageOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white transition hover:shadow-lg hover:shadow-emerald-500/30"
            >
              <Plus className="h-4 w-4" />
              Start a Conversation
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-slate-900/60">
            <div className="grid h-[calc(100vh-300px)] min-h-[500px] md:grid-cols-[320px_1fr]">
              {/* Conversation List */}
              <div className="border-r border-[var(--card-border)] overflow-y-auto">
                <div className="border-b border-[var(--card-border)] p-4 space-y-3">
                  <h2 className="font-semibold text-white">Conversations</h2>
                  {/* Search */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground0" />
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-surface border border-[var(--card-border)] rounded-lg text-sm text-foreground placeholder-slate-500 focus:outline-none focus:border-[#14B8A6]/50"
                    />
                  </div>
                </div>
                <PeerAwareConversationList
                  conversations={filteredConversations}
                  selectedId={selectedConversation?.id}
                  onSelect={handleSelectConversation}
                  currentUserId={user.uid}
                  loading={false}
                />
              </div>

              {/* Message Thread */}
              <div className="hidden md:block">
                {selectedConversation ? (
                  selectedConversation.conversationType === "peer" ? (
                    <PeerMessageThread
                      conversation={selectedConversation as PeerConversation}
                      currentUserId={user.uid}
                      realtimeMessages={realtimeMessages}
                    />
                  ) : (
                    <MessageThread
                      conversation={selectedConversation as Conversation}
                      currentUserId={user.uid}
                      userType="member"
                      realtimeMessages={realtimeMessages}
                    />
                  )
                ) : (
                  <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
                    <div className="text-center">
                      <MessageSquare className="mx-auto h-16 w-16 text-[var(--text-secondary)]" />
                      <p className="mt-4">
                        Select a conversation to view messages
                      </p>
                      <p className="mt-2 text-sm text-foreground0">
                        Chat with employers about jobs or connect with other
                        members
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
                          conversation={
                            selectedConversation as PeerConversation
                          }
                          currentUserId={user.uid}
                          realtimeMessages={realtimeMessages}
                        />
                      ) : (
                        <MessageThread
                          conversation={selectedConversation as Conversation}
                          currentUserId={user.uid}
                          userType="member"
                          realtimeMessages={realtimeMessages}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Message Dialog */}
      <NewMessageDialog
        open={newMessageOpen}
        onOpenChange={setNewMessageOpen}
        currentUserId={user.uid}
        currentUserName={user.displayName || undefined}
        currentUserAvatar={user.photoURL || undefined}
        onConversationCreated={handleConversationCreated}
      />
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
        <MessageSquare className="mx-auto h-12 w-12 text-[var(--text-secondary)]" />
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
          subtitle = employerConvo.jobTitle
            ? `Re: ${employerConvo.jobTitle}`
            : null;
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
              isSelected
                ? "bg-slate-800/70 border-l-2 border-accent"
                : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-foreground0">{icon}</span>
                  <span
                    className={`font-medium truncate ${
                      unreadCount > 0 ? "text-white" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {displayName}
                  </span>
                  {unreadCount > 0 && (
                    <span className="flex-shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-[var(--text-primary)]">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {subtitle && (
                  <p className="mt-0.5 text-xs text-foreground0 truncate">
                    {subtitle}
                  </p>
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

export default function MemberMessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background px-4 py-10">
          <div className="mx-auto max-w-7xl">
            <p className="text-[var(--text-muted)]">Loading messages...</p>
          </div>
        </div>
      }
    >
      <MemberMessagesContent />
    </Suspense>
  );
}
