"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  type FormEvent,
} from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { useMessageDrawer } from "./MessageContext";
import { useRealtimeConversations } from "./useRealtimeConversations";
import { useRealtimeMessages } from "./useRealtimeMessages";
import {
  getOtherParticipant,
  sendMessage,
  sendPeerMessage,
  markMessagesAsRead,
  markPeerMessagesAsRead,
  getConversation,
} from "@/lib/firestore";
import type { Conversation, Message } from "@/lib/types";
import type { PeerConversation } from "@/lib/firestore/messaging";
import toast from "react-hot-toast";
import {
  X,
  ArrowLeft,
  Send,
  Plus,
  MessageSquare,
  Users,
  Briefcase,
  Loader2,
} from "lucide-react";

// Combined conversation type (same pattern as MessagesTab/page)
type AnyConversation =
  | (Conversation & { conversationType: "employer" })
  | (PeerConversation & { conversationType: "peer" });

type DrawerView = "list" | "conversation";

export default function MessageDrawer() {
  const { user } = useAuth();
  const {
    isOpen,
    closeDrawer,
    targetConversationId,
    clearTargetConversation,
  } = useMessageDrawer();

  const [view, setView] = useState<DrawerView>("list");
  const [selectedConversation, setSelectedConversation] =
    useState<AnyConversation | null>(null);
  const [newMessageOpen, setNewMessageOpen] = useState(false);

  // Real-time conversations
  const { employerConversations, peerConversations, loading } =
    useRealtimeConversations(user?.uid ?? null);

  // Real-time messages for the selected conversation
  const { messages: realtimeMessages } = useRealtimeMessages(
    selectedConversation?.id ?? null
  );

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

  const drawerPanelRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to close + focus trap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDrawer();
      }
      // Focus trap
      if (e.key === "Tab" && drawerPanelRef.current) {
        const focusable = drawerPanelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [closeDrawer]
  );

  // Lock body scroll & listen for escape
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, handleKeyDown]);

  // Handle opening to a specific conversation via targetConversationId
  useEffect(() => {
    if (!targetConversationId || !isOpen || loading || !user) return;

    // Check peer conversations
    const peerConvo = peerConversations.find(
      (c) => c.id === targetConversationId
    );
    if (peerConvo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- navigating to target conversation
      setSelectedConversation({ ...peerConvo, conversationType: "peer" });
      setView("conversation");
      clearTargetConversation();
      return;
    }

    // Check employer conversations
    const employerConvo = employerConversations.find(
      (c) => c.id === targetConversationId
    );
    if (employerConvo) {
      setSelectedConversation({
        ...employerConvo,
        conversationType: "employer",
      });
      setView("conversation");
      clearTargetConversation();
      return;
    }

    // If not found locally, try to fetch it
    const fetchConversation = async () => {
      try {
        const convo = await getConversation(targetConversationId);
        if (convo) {
          if (
            "type" in convo &&
            (convo as Record<string, unknown>).type === "peer"
          ) {
            setSelectedConversation({
              ...(convo as unknown as PeerConversation),
              conversationType: "peer",
            });
          } else {
            setSelectedConversation({ ...convo, conversationType: "employer" });
          }
          setView("conversation");
        }
      } catch (error) {
        console.error("Error fetching conversation:", error);
      }
      clearTargetConversation();
    };
    fetchConversation();
  }, [
    targetConversationId,
    isOpen,
    loading,
    peerConversations,
    employerConversations,
    user,
    clearTargetConversation,
  ]);

  // Reset view when drawer closes
  useEffect(() => {
    if (!isOpen) {
      // Small delay so the slide-out animation finishes
      const timer = setTimeout(() => {
        setView("list");
        setSelectedConversation(null);
        setNewMessageOpen(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  function handleSelectConversation(conversation: AnyConversation) {
    setSelectedConversation(conversation);
    setView("conversation");
  }

  function handleBack() {
    setView("list");
    setSelectedConversation(null);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerPanelRef}
        className={cn(
          "absolute right-0 top-0 flex h-full w-full flex-col bg-[var(--card-bg)] shadow-xl sm:max-w-sm",
          "animate-slide-in-right"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Messages"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
          {view === "conversation" ? (
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 rounded-lg p-1.5 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--border-lt)] hover:text-[var(--text-primary)]"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          ) : (
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Messages
            </h2>
          )}
          <div className="flex items-center gap-2">
            {view === "list" && (
              <button
                onClick={() => setNewMessageOpen(true)}
                className="inline-flex items-center justify-center rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--border-lt)] hover:text-[var(--text-primary)]"
                aria-label="New message"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={closeDrawer}
              className="inline-flex items-center justify-center rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--border-lt)] hover:text-[var(--text-primary)]"
              aria-label="Close messages"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {view === "list" ? (
            <DrawerConversationList
              conversations={allConversations}
              loading={loading}
              currentUserId={user?.uid ?? ""}
              onSelect={handleSelectConversation}
            />
          ) : selectedConversation ? (
            <DrawerMessageThread
              conversation={selectedConversation}
              currentUserId={user?.uid ?? ""}
              messages={realtimeMessages}
            />
          ) : null}
        </div>

        {/* New Message inline (reuses NewMessageDialog) */}
        {newMessageOpen && user && (
          <NewMessageInline
            currentUserId={user.uid}
            currentUserName={user.displayName || undefined}
            currentUserAvatar={user.photoURL || undefined}
            onClose={() => setNewMessageOpen(false)}
            onConversationCreated={(conversationId) => {
              setNewMessageOpen(false);
              // Wait briefly for real-time data, then try to select
              setTimeout(() => {
                const peer = peerConversations.find(
                  (c) => c.id === conversationId
                );
                if (peer) {
                  handleSelectConversation({
                    ...peer,
                    conversationType: "peer",
                  });
                }
              }, 500);
            }}
          />
        )}
      </div>

    </div>
  );
}

// ============================================
// Conversation List (drawer-optimized)
// ============================================

interface DrawerConversationListProps {
  conversations: AnyConversation[];
  loading: boolean;
  currentUserId: string;
  onSelect: (conversation: AnyConversation) => void;
}

function DrawerConversationList({
  conversations,
  loading,
  currentUserId,
  onSelect,
}: DrawerConversationListProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 rounded-lg bg-surface" />
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <MessageSquare className="h-12 w-12 text-[var(--text-secondary)]" />
        <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
          No messages yet
        </h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Connect with members or apply to jobs to start conversations.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto divide-y divide-[var(--card-border)]">
      {conversations.map((conversation) => {
        let displayName: string;
        let unreadCount: number;
        let subtitle: string | null = null;
        let icon: React.ReactNode;
        let avatarInitial: string;

        if (conversation.conversationType === "peer") {
          const peerConvo = conversation as PeerConversation;
          const other = getOtherParticipant(peerConvo, currentUserId);
          displayName = other.name || "Member";
          avatarInitial = displayName.charAt(0).toUpperCase();
          const isParticipant1 = peerConvo.participant1Id === currentUserId;
          unreadCount = isParticipant1
            ? peerConvo.participant1UnreadCount
            : peerConvo.participant2UnreadCount;
          icon = <Users className="h-3.5 w-3.5" />;
        } else {
          const employerConvo = conversation as Conversation;
          displayName = employerConvo.employerName || "Employer";
          avatarInitial = displayName.charAt(0).toUpperCase();
          unreadCount = employerConvo.memberUnreadCount || 0;
          subtitle = employerConvo.jobTitle
            ? `Re: ${employerConvo.jobTitle}`
            : null;
          icon = <Briefcase className="h-3.5 w-3.5" />;
        }

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
            className="w-full p-3 text-left transition hover:bg-surface"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent text-sm font-semibold">
                {avatarInitial}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-foreground0">{icon}</span>
                    <span
                      className={cn(
                        "truncate text-sm font-medium",
                        unreadCount > 0
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)]"
                      )}
                    >
                      {displayName}
                    </span>
                    {unreadCount > 0 && (
                      <span className="flex-shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {lastMessageTime && (
                    <span className="flex-shrink-0 text-[11px] text-foreground0">
                      {lastMessageTime}
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
                    className={cn(
                      "mt-0.5 text-xs truncate",
                      unreadCount > 0
                        ? "text-[var(--text-secondary)]"
                        : "text-foreground0"
                    )}
                  >
                    {conversation.lastMessage}
                  </p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// Message Thread (drawer-optimized)
// ============================================

interface DrawerMessageThreadProps {
  conversation: AnyConversation;
  currentUserId: string;
  messages: Message[];
}

function DrawerMessageThread({
  conversation,
  currentUserId,
  messages,
}: DrawerMessageThreadProps) {
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isPeer = conversation.conversationType === "peer";

  // Get display info
  let otherName: string;
  if (isPeer) {
    const peerConvo = conversation as PeerConversation;
    const other = getOtherParticipant(peerConvo, currentUserId);
    otherName = other.name || "Member";
  } else {
    const employerConvo = conversation as Conversation;
    otherName =
      employerConvo.employerName || "Employer";
  }

  // Mark messages as read when conversation opens
  useEffect(() => {
    if (isPeer) {
      markPeerMessagesAsRead(conversation.id, currentUserId).catch(
        console.error
      );
    } else {
      markMessagesAsRead(conversation.id, currentUserId, "member").catch(
        console.error
      );
    }
  }, [conversation.id, currentUserId, isPeer]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);

      if (isPeer) {
        await sendPeerMessage({
          conversationId: conversation.id,
          senderId: currentUserId,
          content: newMessage.trim(),
        });
      } else {
        await sendMessage({
          conversationId: conversation.id,
          senderId: currentUserId,
          senderType: "member",
          content: newMessage.trim(),
        });
      }

      setNewMessage("");
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

  return (
    <div className="flex h-full flex-col">
      {/* Conversation header */}
      <div className="border-b border-[var(--card-border)] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-accent text-sm font-semibold">
            {otherName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {otherName}
            </h3>
            {!isPeer && (conversation as Conversation).jobTitle && (
              <p className="text-xs text-[var(--text-muted)] truncate">
                Re: {(conversation as Conversation).jobTitle}
              </p>
            )}
            {isPeer && (
              <p className="text-xs text-[var(--text-muted)]">
                Community Member
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center px-4">
              <MessageSquare className="mx-auto h-10 w-10 text-[var(--text-secondary)]" />
              <p className="mt-3 text-sm text-[var(--text-muted)]">
                No messages yet. Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === currentUserId;
            const time = message.createdAt
              ? new Date(
                  message.createdAt.seconds * 1000
                ).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "";

            return (
              <div
                key={message.id}
                className={cn("flex", isOwn ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2",
                    isOwn
                      ? "bg-accent text-[var(--text-primary)]"
                      : "bg-surface text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {message.content}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-[10px]",
                      isOwn ? "text-[var(--text-secondary)]" : "text-foreground0"
                    )}
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
      <form
        onSubmit={handleSubmit}
        className="border-t border-[var(--card-border)] p-3"
      >
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground placeholder-[var(--text-muted)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="flex-shrink-0 rounded-lg bg-accent px-3 py-2 font-medium text-[var(--text-primary)] transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ============================================
// New Message Inline Panel (overlays the drawer body)
// ============================================

interface NewMessageInlineProps {
  currentUserId: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  onClose: () => void;
  onConversationCreated: (conversationId: string) => void;
}

function NewMessageInline({
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onClose,
  onConversationCreated,
}: NewMessageInlineProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: string;
      userId: string;
      displayName?: string;
      photoURL?: string;
      indigenousAffiliation?: string;
    }>
  >([]);
  const [searching, setSearching] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{
    id: string;
    userId: string;
    displayName?: string;
    photoURL?: string;
    indigenousAffiliation?: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (selectedMember) {
      setTimeout(() => messageInputRef.current?.focus(), 100);
    }
  }, [selectedMember]);

  async function handleSearch(query: string) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const { searchMembersByName } = await import("@/lib/firestore");
      const results = await searchMembersByName(query, 10);
      setSearchResults(
        results
          .filter((m) => (m.id || m.userId) !== currentUserId)
          .map((m) => ({
            id: m.id || m.userId,
            userId: m.userId || m.id,
            displayName: m.displayName,
            photoURL: m.photoURL,
            indigenousAffiliation: m.indigenousAffiliation,
          }))
      );
    } catch (err) {
      console.error("Error searching members:", err);
    } finally {
      setSearching(false);
    }
  }

  function handleSearchInput(value: string) {
    setSearchQuery(value);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  }

  async function handleSend() {
    if (!selectedMember || !message.trim() || sending) return;

    try {
      setSending(true);
      setError(null);

      const { getOrCreatePeerConversation, sendPeerMessage: sendPeerMsg } =
        await import("@/lib/firestore/messaging");

      const conversation = await getOrCreatePeerConversation({
        userId1: currentUserId,
        userId2: selectedMember.id,
        user1Name: currentUserName,
        user1Avatar: currentUserAvatar,
        user2Name: selectedMember.displayName,
        user2Avatar: selectedMember.photoURL,
      });

      await sendPeerMsg({
        conversationId: conversation.id,
        senderId: currentUserId,
        content: message.trim(),
      });

      toast.success("Message sent!");
      onConversationCreated(conversation.id);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === "MESSAGING_BLOCKED") {
          setError("This member has disabled incoming messages.");
        } else if (err.message === "CONNECTION_REQUIRED") {
          setError(
            "You need to be connected with this member to send them a message."
          );
        } else {
          setError("Failed to send message. Please try again.");
        }
      } else {
        setError("Failed to send message. Please try again.");
      }
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  }

  function getInitials(name?: string) {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-[var(--card-bg)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
        <button
          onClick={() => {
            if (selectedMember) {
              setSelectedMember(null);
              setError(null);
            } else {
              onClose();
            }
          }}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {selectedMember ? "Back" : "Cancel"}
        </button>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          New Message
        </h3>
        <div className="w-14" /> {/* Spacer for alignment */}
      </div>

      {!selectedMember ? (
        /* Search view */
        <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-3">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface py-2.5 pl-3 pr-4 text-sm text-foreground placeholder-[var(--text-muted)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {searching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-surface"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-accent text-sm font-semibold">
                      {getInitials(member.displayName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {member.displayName || "Member"}
                      </p>
                      {member.indigenousAffiliation && (
                        <p className="truncate text-xs text-[var(--text-muted)]">
                          {member.indigenousAffiliation}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery.trim() ? (
              <div className="py-8 text-center">
                <p className="text-sm text-[var(--text-muted)]">
                  No members found
                </p>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-foreground0">
                  Type a name to search
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Compose view */
        <div className="flex-1 flex flex-col p-4 space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-surface p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-accent text-sm font-semibold">
              {getInitials(selectedMember.displayName)}
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {selectedMember.displayName || "Member"}
              </p>
              {selectedMember.indigenousAffiliation && (
                <p className="text-xs text-[var(--text-muted)]">
                  {selectedMember.indigenousAffiliation}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <textarea
            ref={messageInputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your message..."
            rows={4}
            className="w-full resize-none rounded-lg border border-[var(--card-border)] bg-surface px-4 py-3 text-sm text-foreground placeholder-[var(--text-muted)] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />

          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Message
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Utility
// ============================================

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
