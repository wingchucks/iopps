"use client";

import { useEffect, useState } from "react";
import { getNotifications, markAsRead, markAllAsRead } from "@/lib/firestore/notifications";
import type { Notification, NotificationType } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

const ICONS: Record<NotificationType, string> = {
  new_message: "💬",
  application_status: "📋",
  new_job_match: "🎯",
  closing_soon: "⏰",
  content_approved: "✅",
  content_rejected: "❌",
  new_application: "📨",
  subscription_renewal: "💳",
  payment_failed: "⚠️",
  org_verified: "🏢",
  post_expiring: "📅",
  featured_slot_update: "⭐",
};

interface Props {
  onClose?: () => void;
}

export default function NotificationList({ onClose }: Props) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getNotifications(user.uid, 10).then((n) => {
      setNotifications(n);
      setLoading(false);
    });
  }, [user]);

  async function handleMarkAllRead() {
    if (!user) return;
    await markAllAsRead(user.uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleClick(n: Notification) {
    if (!n.read) {
      await markAsRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    onClose?.();
  }

  function timeAgo(ts: { seconds: number }) {
    const diff = Date.now() / 1000 - ts.seconds;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  if (loading) {
    return <div className="p-4 text-center text-sm text-gray-400">Loading...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-sm">Notifications</h3>
        <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:text-blue-800">
          Mark all read
        </button>
      </div>
      {notifications.length === 0 ? (
        <p className="p-4 text-sm text-gray-500 text-center">No notifications</p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={n.link || "#"}
              onClick={() => handleClick(n)}
              className={`block px-4 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors ${
                !n.read ? "bg-blue-50/50" : ""
              }`}
            >
              <div className="flex gap-3">
                <span className="text-lg flex-shrink-0">{ICONS[n.type] ?? "🔔"}</span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${!n.read ? "font-medium" : "text-gray-700"}`}>{n.title}</p>
                  <p className="text-xs text-gray-500 truncate">{n.body}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{n.createdAt && timeAgo(n.createdAt)}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />}
              </div>
            </Link>
          ))}
        </div>
      )}
      <Link
        href="/notifications"
        onClick={() => onClose?.()}
        className="block text-center py-3 text-sm text-blue-600 hover:text-blue-800 border-t border-gray-100"
      >
        View all
      </Link>
    </div>
  );
}
