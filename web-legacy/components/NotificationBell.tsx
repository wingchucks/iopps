"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from "@/lib/firestore";
import { getNotificationIcon, formatTimeAgo } from "@/lib/notificationUtils";
import type { Notification } from "@/lib/types";

export default function NotificationBell() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load unread count on mount
  useEffect(() => {
    if (user) {
      loadUnreadCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadUnreadCount() {
    if (!user) return;
    try {
      const count = await getUnreadNotificationCount(user.uid);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  }

  async function loadNotifications() {
    if (!user) return;
    setLoading(true);
    try {
      const notifs = await getUserNotifications(user.uid, 10);
      setNotifications(notifs);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle() {
    if (!isOpen) {
      await loadNotifications();
    }
    setIsOpen(!isOpen);
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
    setIsOpen(false);
  }

  async function handleMarkAllRead() {
    if (!user) return;
    try {
      await markAllNotificationsAsRead(user.uid);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="relative rounded-lg border border-[var(--card-border)] bg-surface p-2 text-[var(--text-secondary)] transition hover:border-accent/50 hover:text-accent"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-[var(--text-primary)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-xl border border-[var(--card-border)]/80 bg-card shadow-2xl shadow-black/40">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-accent hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="text-sm text-[var(--text-muted)]">Loading...</div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <svg
                  className="mx-auto h-10 w-10 text-[var(--text-secondary)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="mt-2 text-sm text-[var(--text-muted)]">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id}>
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      onClick={() => handleNotificationClick(notification)}
                      className={`flex gap-3 px-4 py-3 transition hover:bg-surface ${
                        !notification.read ? "bg-slate-800/30" : ""
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read ? "font-medium text-foreground" : "text-[var(--text-secondary)]"}`}>
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-xs text-foreground0 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0">
                          <span className="h-2 w-2 rounded-full bg-accent block" />
                        </div>
                      )}
                    </Link>
                  ) : (
                    <div
                      onClick={() => handleNotificationClick(notification)}
                      className={`flex gap-3 px-4 py-3 cursor-pointer transition hover:bg-surface ${
                        !notification.read ? "bg-slate-800/30" : ""
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read ? "font-medium text-foreground" : "text-[var(--text-secondary)]"}`}>
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-xs text-foreground0 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0">
                          <span className="h-2 w-2 rounded-full bg-accent block" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer - View All Link */}
          {notifications.length > 0 && (
            <div className="border-t border-[var(--card-border)] p-2">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="block rounded-lg px-4 py-2 text-center text-sm font-medium text-accent transition hover:bg-surface"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
