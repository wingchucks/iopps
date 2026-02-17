"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  type Notification,
} from "@/lib/firestore/notifications";

const typeIcons: Record<string, string> = {
  welcome: "\u{1F44B}",
  job_match: "\u{1F4BC}",
  application_update: "\u{1F4CB}",
  event_reminder: "\u{1FAB6}",
  new_post: "\u{1F4DD}",
  system: "\u{2699}\uFE0F",
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) return;
    getNotifications(user.uid)
      .then(setNotifications)
      .catch(() => {});
  }, [user]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllAsRead(user.uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClickNotification = async (n: Notification) => {
    if (!n.read) {
      await markAsRead(n.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
      );
    }
    setOpen(false);
  };

  const formatTime = (ts: unknown) => {
    if (!ts || typeof ts !== "object") return "";
    const d = ts as { seconds?: number };
    if (!d.seconds) return "";
    const diff = Math.floor((Date.now() / 1000 - d.seconds) / 60);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative w-10 h-10 rounded-[10px] border-none cursor-pointer text-lg text-white"
        style={{ background: "rgba(255,255,255,.08)" }}
      >
        &#128276;
        {unreadCount > 0 && (
          <span
            className="absolute top-0.5 right-0.5 min-w-4 h-4 rounded-full bg-red text-white flex items-center justify-center"
            style={{ fontSize: 9, fontWeight: 700 }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 w-[340px] max-h-[420px] overflow-y-auto rounded-2xl bg-card border border-border z-50"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,.15)" }}
        >
          <div
            className="flex items-center justify-between border-b border-border sticky top-0 bg-card z-10"
            style={{ padding: "14px 16px" }}
          >
            <p className="text-sm font-bold text-text m-0">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-teal border-none bg-transparent cursor-pointer hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: "30px 16px" }} className="text-center">
              <p className="text-3xl mb-2">&#128276;</p>
              <p className="text-sm text-text-muted">No notifications yet</p>
            </div>
          ) : (
            notifications.slice(0, 15).map((n) => {
              const inner = (
                <div
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className="flex gap-3 items-start cursor-pointer transition-colors hover:bg-bg"
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    background: n.read ? "transparent" : "var(--teal-soft)",
                  }}
                >
                  <span className="text-lg shrink-0 mt-0.5">
                    {typeIcons[n.type] || "\u{1F514}"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-text m-0 mb-0.5">
                      {n.title}
                    </p>
                    <p className="text-xs text-text-sec m-0 leading-relaxed">
                      {n.body}
                    </p>
                    <p className="text-[11px] text-text-muted mt-1 m-0">
                      {formatTime(n.createdAt)}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-teal shrink-0 mt-1.5" />
                  )}
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} className="no-underline">
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })
          )}

          {notifications.length > 0 && (
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-teal font-semibold py-3 no-underline hover:underline border-t border-border"
            >
              View all notifications
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
