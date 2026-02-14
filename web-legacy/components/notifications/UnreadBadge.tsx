"use client";

import React from "react";
import { useNotifications } from "./NotificationContext";

// ============================================
// TYPES
// ============================================

export interface UnreadBadgeProps {
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

/**
 * Red circle badge that displays the unread notification count.
 * Renders nothing when count is 0.
 * Shows "9+" when count exceeds 9.
 */
export default function UnreadBadge({ className = "" }: UnreadBadgeProps) {
  const { unreadCount } = useNotifications();

  if (unreadCount === 0) return null;

  const displayCount = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <span
      aria-label={`${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`}
      className={`
        absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center
        rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white
        pointer-events-none select-none
        ${className}
      `}
    >
      {displayCount}
    </span>
  );
}
