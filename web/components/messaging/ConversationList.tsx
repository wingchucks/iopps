"use client";

import type { Conversation } from "@/lib/types";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
  userType: "employer" | "member";
  loading?: boolean;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  userType,
  loading,
}: ConversationListProps) {
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
        <svg
          className="mx-auto h-12 w-12 text-[var(--text-secondary)]"
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
        <p className="mt-3 text-sm text-[var(--text-muted)]">No conversations yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--card-border)]">
      {conversations.map((conversation) => {
        const unreadCount =
          userType === "employer"
            ? conversation.employerUnreadCount
            : conversation.memberUnreadCount;
        const displayName =
          userType === "employer"
            ? conversation.memberName || conversation.memberEmail || "Unknown"
            : conversation.employerName || "Unknown Employer";

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
              isSelected ? "bg-slate-800/70 border-l-2 border-[#14B8A6]" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
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
                {conversation.jobTitle && (
                  <p className="mt-0.5 text-xs text-foreground0 truncate">
                    Re: {conversation.jobTitle}
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
