"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentTime } from "@/lib/use-current-time";
import { useNotifications } from "@/lib/use-notifications";
import type { Notification } from "@/lib/firestore/notifications";
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

// Notification records are rendered defensively: only strings are shown and only
// plain same-site paths are followed. Anything that could resolve to another
// origin (protocol-relative, backslashes, whitespace, dot segments) stays unlinked.
const plainText = (value: unknown) => (typeof value === "string" ? value : "");
const typeIcon = (type: unknown) => (typeof type === "string" && Object.hasOwn(typeIcons, type) ? typeIcons[type] : "\u{1F514}");
const internalHref = (value: unknown) =>
  typeof value === "string" && value.startsWith("/") && !/\/\/|\\|\s|\.\./.test(value) ? value : null;

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
  const now = useCurrentTime();
  const [pageSize, setPageSize] = useState(20);
  const [activeTab, setActiveTab] = useState<string>("All");
  const { notifications, loading, error, unreadCount, actionError, busy, retry, markRead } = useNotifications(pageSize);
  const handleMarkAllRead = () => markRead();
  const handleClick = (notification: Notification) => markRead(notification);

  const formatDate = (ts: unknown) => {
    if (!ts || typeof ts !== "object") return "";
    const d = ts as { seconds?: number };
    if (!d.seconds) return "";
    const date = new Date(d.seconds * 1000);
    const diff = Math.floor((now / 1000 - d.seconds) / 60);
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
        {unreadCount !== null && unreadCount > 0 && (
          <Button small disabled={busy} onClick={handleMarkAllRead}>
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
              className="brand-button px-4 py-2 rounded-xl border-none font-semibold text-sm cursor-pointer transition-all"
              style={{
                background: activeTab === tab ? "var(--button-gradient)" : "var(--button-gradient-soft)",
                color: activeTab === tab ? "#fff" : "var(--text-sec)",
                border: activeTab === tab ? "none" : "1px solid var(--border)",
              }}
            >
              {tab}
              {tab === "Unread" && unreadCount !== null && unreadCount > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({unreadCount})</span>
              )}
            </button>
          ))}
        </div>
      )}

      {actionError && <p role="alert" className="text-red mb-4">{actionError}</p>}
      {error ? <Card style={{ padding: 24 }}><p role="alert">{error}</p><Button onClick={retry}>Retry</Button></Card> : loading ? (
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
            const href = internalHref(n.link);
            const content = (
              <Card
                key={n.id}
                onClick={href ? undefined : () => handleClick(n)}
                className={href ? "" : "cursor-pointer"}
              >
                <div
                  className="flex gap-3.5 items-start"
                  style={{
                    padding: "16px 20px",
                    background: n.read ? "transparent" : "var(--teal-soft)",
                  }}
                >
                  <span className="text-xl shrink-0 mt-0.5">
                    {typeIcon(n.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[15px] font-semibold text-text m-0">
                        {plainText(n.title)}
                      </p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-teal shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-text-sec m-0 leading-relaxed">
                      {plainText(n.body)}
                    </p>
                    <p className="text-xs text-text-muted mt-1.5 m-0">
                      {formatDate(n.createdAt)}
                    </p>
                  </div>
                </div>
              </Card>
            );
            return href ? (
              <Link key={n.id} href={href} className="no-underline" onClick={() => handleClick(n)}>
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
      {!loading && !error && activeTab === "Unread" && !notifications.some(n => !n.read) && notifications.length > 0 && <p className="text-text-muted my-4">{unreadCount === 0 ? "No unread notifications" : "No unread notifications in the loaded history. Load older notifications to check more."}</p>}
      {!loading && !error && notifications.length >= pageSize && <div className="mt-4"><p className="text-sm text-text-muted mb-2">Showing the latest {notifications.length} notifications.</p><Button onClick={() => setPageSize(value => value + 20)}>Load older notifications</Button></div>}
    </div>
  );
}
