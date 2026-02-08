"use client";

import React, { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Settings, CheckCheck, Bell } from "lucide-react";
import { useNotifications } from "./NotificationContext";
import NotificationItem from "./NotificationItem";

// ============================================
// TYPES
// ============================================

export interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// COMPONENT
// ============================================

export default function NotificationDropdown({
  isOpen,
  onClose,
}: NotificationDropdownProps) {
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        // Check if click was on the bell button itself (parent handles toggle)
        const target = e.target as HTMLElement;
        if (target.closest("[data-notification-bell]")) return;
        onClose();
      }
    };

    // Delay adding the listener to avoid immediately closing
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Focus management: focus the first interactive element when opening
  useEffect(() => {
    if (isOpen && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isOpen]);

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Notifications"
      aria-modal="false"
      className="
        absolute right-0 top-full mt-2 z-50
        w-screen max-w-[360px] sm:w-[360px]
        rounded-xl border border-[var(--card-border)]
        bg-[var(--card-bg)] shadow-xl
        overflow-hidden
        animate-scale-in origin-top-right
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          Notifications
        </h2>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              ref={firstFocusableRef}
              onClick={handleMarkAllRead}
              className="
                flex items-center gap-1.5 rounded-lg px-2 py-1.5
                text-xs font-medium text-[var(--accent)]
                hover:bg-[var(--accent-bg)] transition-colors
              "
              aria-label="Mark all notifications as read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
          <Link
            href="/member/settings/notifications"
            onClick={onClose}
            className="
              flex items-center justify-center rounded-lg p-1.5
              text-[var(--text-muted)] hover:text-[var(--text-primary)]
              hover:bg-[var(--accent-bg)] transition-colors
            "
            aria-label="Notification settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Notification list */}
      <div
        className="max-h-[400px] overflow-y-auto overscroll-contain"
        role="list"
        aria-label="Notification list"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-bg)] mb-3">
              <Bell className="h-6 w-6 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              No notifications yet
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              We&apos;ll let you know when something happens
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id} role="listitem">
              <NotificationItem
                notification={notification}
                onRead={markAsRead}
                onClose={onClose}
              />
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-[var(--card-border)]">
          <Link
            href="/member/notifications"
            onClick={onClose}
            className="
              block w-full py-3 text-center text-sm font-medium
              text-[var(--accent)] hover:bg-[var(--accent-bg)]
              transition-colors
            "
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
