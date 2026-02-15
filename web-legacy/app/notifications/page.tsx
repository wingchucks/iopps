"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "@/lib/firestore";
import { FeedLayout } from "@/components/opportunity-graph/dynamic";
import { getNotificationIcon, formatTimeAgo } from "@/lib/notificationUtils";
import type { Notification } from "@/lib/types";

type Category = "all" | "jobs" | "messages" | "applications" | "interviews" | "system";

const CATEGORY_TYPES: Record<Exclude<Category, "all">, string[]> = {
  jobs: ["job_alert", "employer_approved", "employer_rejected"],
  messages: ["new_message"],
  applications: ["new_application", "application_status", "scholarship_status"],
  interviews: ["interview_scheduled", "interview_cancelled", "interview_rescheduled"],
  system: ["system"],
};

const TABS: { key: Category; label: string }[] = [
  { key: "all", label: "All" },
  { key: "jobs", label: "Jobs" },
  { key: "messages", label: "Messages" },
  { key: "applications", label: "Applications" },
  { key: "interviews", label: "Interviews" },
  { key: "system", label: "System" },
];

export default function NotificationsPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<Category>("all");
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(
      user.uid,
      (notifs) => {
        setNotifications(notifs);
        setDataLoading(false);
      },
      100
    );
    return unsub;
  }, [user]);

  const filtered =
    activeTab === "all"
      ? notifications
      : notifications.filter((n) => CATEGORY_TYPES[activeTab].includes(n.type));

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleMarkAllRead() {
    if (!user) return;
    try {
      await markAllNotificationsAsRead(user.uid);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  }

  async function handleClick(notification: Notification) {
    if (!notification.read) {
      try {
        await markNotificationAsRead(notification.id);
      } catch (err) {
        console.error("Error marking notification as read:", err);
      }
    }
    if (notification.link) {
      router.push(notification.link);
    }
  }

  async function handleDelete(e: React.MouseEvent, notificationId: string) {
    e.stopPropagation();
    try {
      await deleteNotification(notificationId);
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  }

  if (loading) {
    return (
      <FeedLayout>
        <div className="py-10">
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        </div>
      </FeedLayout>
    );
  }

  if (!user) {
    return (
      <FeedLayout>
        <div className="py-10 space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Please sign in
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Log in or register to view your notifications.
          </p>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-md border border-[var(--card-border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:border-accent hover:text-accent"
            >
              Register
            </Link>
          </div>
        </div>
      </FeedLayout>
    );
  }

  if (role !== "community") {
    return (
      <FeedLayout>
        <div className="py-10 space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Community member area
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Switch to your community account to view notifications.
          </p>
        </div>
      </FeedLayout>
    );
  }

  return (
    <FeedLayout>
      <div className="mx-auto max-w-3xl px-4 py-6 pb-24">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-sm font-medium text-accent hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-accent text-white"
                  : "bg-surface text-[var(--text-secondary)] hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification List */}
        {dataLoading ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[var(--text-muted)]">Loading notifications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
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
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              {activeTab === "all"
                ? "No notifications yet"
                : `No ${activeTab} notifications`}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={`group flex cursor-pointer gap-3 rounded-xl border border-[var(--card-border)] px-4 py-3 transition hover:border-accent/40 ${
                  !notification.read
                    ? "bg-[var(--card-bg)]"
                    : "bg-surface"
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${
                      !notification.read
                        ? "font-medium text-foreground"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {notification.title}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)] line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {formatTimeAgo(notification.createdAt)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-start gap-2">
                  {!notification.read && (
                    <span className="mt-2 block h-2 w-2 rounded-full bg-accent" />
                  )}
                  <button
                    onClick={(e) => handleDelete(e, notification.id)}
                    className="rounded p-1 text-[var(--text-muted)] opacity-0 transition hover:bg-surface hover:text-red-400 group-hover:opacity-100"
                    aria-label="Delete notification"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FeedLayout>
  );
}
