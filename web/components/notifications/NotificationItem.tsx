"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  MessageCircle,
  UserPlus,
  AtSign,
  Star,
  Calendar,
  Info,
  Bell,
  CheckCircle,
  XCircle,
  GraduationCap,
} from "lucide-react";
import type { Notification, NotificationType } from "@/lib/types";
import type { Timestamp } from "firebase/firestore";

// ============================================
// TYPES
// ============================================

export interface NotificationItemProps {
  notification: Notification;
  onRead: (notificationId: string) => void;
  onClose: () => void;
}

// ============================================
// HELPERS
// ============================================

/**
 * Map notification types to icons and colors
 */
function getNotificationMeta(type: NotificationType): {
  Icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
} {
  switch (type) {
    case "new_application":
    case "application_status":
      return {
        Icon: Briefcase,
        colorClass: "text-blue-500",
        bgClass: "bg-blue-500/10",
      };
    case "new_message":
      return {
        Icon: MessageCircle,
        colorClass: "text-green-500",
        bgClass: "bg-green-500/10",
      };
    case "job_alert":
      return {
        Icon: Star,
        colorClass: "text-amber-500",
        bgClass: "bg-amber-500/10",
      };
    case "employer_approved":
      return {
        Icon: CheckCircle,
        colorClass: "text-emerald-500",
        bgClass: "bg-emerald-500/10",
      };
    case "employer_rejected":
      return {
        Icon: XCircle,
        colorClass: "text-red-500",
        bgClass: "bg-red-500/10",
      };
    case "scholarship_status":
      return {
        Icon: GraduationCap,
        colorClass: "text-purple-500",
        bgClass: "bg-purple-500/10",
      };
    case "interview_scheduled":
    case "interview_cancelled":
    case "interview_rescheduled":
      return {
        Icon: Calendar,
        colorClass: "text-teal-500",
        bgClass: "bg-teal-500/10",
      };
    case "system":
      return {
        Icon: Info,
        colorClass: "text-[var(--text-muted)]",
        bgClass: "bg-[var(--accent-bg)]",
      };
    default:
      return {
        Icon: Bell,
        colorClass: "text-[var(--accent)]",
        bgClass: "bg-[var(--accent-bg)]",
      };
  }
}

/**
 * Format a Firestore timestamp or Date to relative time
 */
function formatRelativeTime(timestamp: Timestamp | Date | null | undefined): string {
  if (!timestamp) return "";

  let date: Date;
  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === "object" && "toDate" in timestamp) {
    date = timestamp.toDate();
  } else {
    return "";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;

  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

// ============================================
// COMPONENT
// ============================================

export default function NotificationItem({
  notification,
  onRead,
  onClose,
}: NotificationItemProps) {
  const router = useRouter();
  const { Icon, colorClass, bgClass } = getNotificationMeta(notification.type);

  const handleClick = () => {
    // Mark as read if unread
    if (!notification.read) {
      onRead(notification.id);
    }

    // Navigate if there's a link
    if (notification.link) {
      router.push(notification.link);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${notification.read ? "" : "Unread: "}${notification.title}. ${notification.message}`}
      className={`
        flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
        hover:bg-[var(--accent-bg)]
        ${!notification.read ? "bg-[var(--accent-bg)]/50" : ""}
      `}
    >
      {/* Icon */}
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bgClass}`}
      >
        <Icon className={`h-4.5 w-4.5 ${colorClass}`} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm leading-snug ${
              !notification.read
                ? "font-semibold text-[var(--text-primary)]"
                : "font-medium text-[var(--text-primary)]"
            }`}
          >
            {notification.title}
          </p>
          {/* Unread indicator */}
          {!notification.read && (
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]"
              aria-hidden="true"
            />
          )}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-muted)] line-clamp-2">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {formatRelativeTime(notification.createdAt as Timestamp | null)}
        </p>
      </div>
    </div>
  );
}
