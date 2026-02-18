"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  onNotifications,
  markAsRead,
  markAllAsRead,
  type Notification,
} from "@/lib/firestore/notifications";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Button from "@/components/Button";

const typeIcons: Record<string, string> = {
  welcome: "\u{1F44B}",
  job_match: "\u{1F4BC}",
  application_update: "\u{1F4CB}",
  event_reminder: "\u{1FAB6}",
  new_post: "\u{1F4DD}",
  system: "\u{2699}\uFE0F",
};

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <NotificationsContent />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

const filterTabs = ["All", "Unread"] as const;

function NotificationsContent() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("All");

  useEffect(() => {
    if (!user) return;
    const unsub = onNotifications(user.uid, (data) => {
      setNotifications(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllAsRead(user.uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClick = async (n: Notification) => {
    if (!n.read) {
      await markAsRead(n.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
      );
    }
  };

  const formatDate = (ts: unknown) => {
    if (!ts || typeof ts !== "object") return "";
    const d = ts as { seconds?: number };
    if (!d.seconds) return "";
    const date = new Date(d.seconds * 1000);
    const diff = Math.floor((Date.now() / 1000 - d.seconds) / 60);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff} minutes ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
    return date.toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-[700px] mx-auto px-4 py-6 md:px-10 md:py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-extrabold text-text">Notifications</h2>
        {unreadCount > 0 && (
          <Button small onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter tabs */}
      {notifications.length > 0 && (
        <div className="flex gap-2 mb-5">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-xl border-none font-semibold text-sm cursor-pointer transition-all"
              style={{
                background: activeTab === tab ? "var(--navy)" : "var(--card)",
                color: activeTab === tab ? "#fff" : "var(--text-sec)",
                border: activeTab === tab ? "none" : "1px solid var(--border)",
              }}
            >
              {tab}
              {tab === "Unread" && unreadCount > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({unreadCount})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl skeleton" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card style={{ padding: 48, textAlign: "center" }}>
          <p className="text-4xl mb-3">&#128276;</p>
          <p className="text-lg font-bold text-text mb-1">No notifications yet</p>
          <p className="text-sm text-text-muted">
            When you get job matches, application updates, or event reminders, they&apos;ll appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {(activeTab === "Unread" ? notifications.filter((n) => !n.read) : notifications).map((n) => {
            const content = (
              <Card
                key={n.id}
                onClick={() => handleClick(n)}
                className={n.link ? "" : "cursor-pointer"}
              >
                <div
                  className="flex gap-3.5 items-start"
                  style={{
                    padding: "16px 20px",
                    background: n.read ? "transparent" : "var(--teal-soft)",
                  }}
                >
                  <span className="text-xl shrink-0 mt-0.5">
                    {typeIcons[n.type] || "\u{1F514}"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[15px] font-semibold text-text m-0">
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-teal shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-text-sec m-0 leading-relaxed">
                      {n.body}
                    </p>
                    <p className="text-xs text-text-muted mt-1.5 m-0">
                      {formatDate(n.createdAt)}
                    </p>
                  </div>
                </div>
              </Card>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="no-underline" onClick={() => handleClick(n)}>
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
