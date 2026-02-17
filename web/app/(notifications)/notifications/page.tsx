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

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getNotifications(user.uid, 50).then((n) => {
      setNotifications(n);
      setLoading(false);
    });
  }, [user]);

  async function handleMarkAllRead() {
    if (!user) return;
    await markAllAsRead(user.uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function handleMarkRead(id: string) {
    await markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function formatDate(ts: { seconds: number }) {
    return new Date(ts.seconds * 1000).toLocaleDateString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button onClick={handleMarkAllRead} className="text-sm text-blue-600 hover:text-blue-800">
          Mark all as read
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-2">🔔</p>
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={n.link || "#"}
              onClick={() => !n.read && handleMarkRead(n.id)}
              className={`block p-4 rounded-xl border transition-colors hover:shadow-sm ${
                !n.read ? "bg-blue-50/50 border-blue-200" : "bg-white border-gray-200"
              }`}
            >
              <div className="flex gap-4 items-start">
                <span className="text-2xl">{ICONS[n.type] ?? "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.read ? "font-semibold" : "text-gray-800"}`}>{n.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{n.createdAt && formatDate(n.createdAt)}</p>
                </div>
                {!n.read && <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
