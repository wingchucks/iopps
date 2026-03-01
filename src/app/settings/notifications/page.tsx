"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
  type NotificationCategory,
} from "@/lib/firestore/notificationPreferences";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import PageSkeleton from "@/components/PageSkeleton";

const categoryLabels: Record<NotificationCategory, { icon: string; title: string; desc: string }> = {
  applications: {
    icon: "\u{1F4CB}",
    title: "Applications",
    desc: "Updates on your job and program applications",
  },
  messages: {
    icon: "\u{1F4AC}",
    title: "Messages",
    desc: "New messages and conversation activity",
  },
  community: {
    icon: "\u{1F465}",
    title: "Community",
    desc: "Posts, mentions, and community updates",
  },
  events: {
    icon: "\u{1F4C5}",
    title: "Events",
    desc: "Event reminders and new events near you",
  },
  opportunities: {
    icon: "\u{2B50}",
    title: "Opportunities",
    desc: "New jobs, scholarships, and grants matching your interests",
  },
};

const channelLabels = {
  email: "Email",
  push: "Push",
  inApp: "In-App",
};

export default function NotificationSettingsPage() {
  return (
    <ProtectedRoute>
      <AppShell>
      <div className="min-h-screen bg-bg">
        <NotificationContent />
      </div>
    </AppShell>
    </ProtectedRoute>
  );
}

function NotificationContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);

  const loadPrefs = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getNotificationPreferences(user.uid);
      setPrefs(data);
    } catch (err) {
      console.error("Failed to load notification preferences:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const handleSave = async () => {
    if (!user || !prefs) return;
    setSaving(true);
    try {
      await updateNotificationPreferences(user.uid, {
        categories: prefs.categories,
        quietHours: prefs.quietHours,
      });
      try {
        const token = await user.getIdToken();
        await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ newsletterOptIn }) });
      } catch { /* */ }
      showToast("Notification preferences saved");
    } catch (err) {
      console.error("Failed to save notification preferences:", err);
      showToast("Failed to save preferences. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (
    category: NotificationCategory,
    channel: keyof typeof channelLabels,
    value: boolean
  ) => {
    if (!prefs) return;
    setPrefs({
      ...prefs,
      categories: {
        ...prefs.categories,
        [category]: {
          ...prefs.categories[category],
          [channel]: value,
        },
      },
    });
  };

  if (loading) {
    return <PageSkeleton variant="list" />;
  }

  if (!prefs) return null;

  return (
    <div className="max-w-[700px] mx-auto px-4 py-8 md:px-10">
      <Link
        href="/settings"
        className="text-sm text-teal font-semibold no-underline hover:underline mb-4 inline-block"
      >
        &larr; Back to Settings
      </Link>
      <h1 className="text-2xl font-extrabold text-text mb-1">Notifications</h1>
      <p className="text-sm text-text-muted mb-6">
        Choose how and when you want to be notified.
      </p>

      {/* Category Preferences */}
      <div className="flex flex-col gap-4 mb-6">
        {(Object.keys(prefs.categories) as NotificationCategory[]).map(
          (category) => {
            const info = categoryLabels[category];
            const channels = prefs.categories[category];
            return (
              <Card key={category}>
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-xl">{info.icon}</span>
                    <div>
                      <h3 className="text-[15px] font-bold text-text m-0">
                        {info.title}
                      </h3>
                      <p className="text-xs text-text-muted m-0">
                        {info.desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {(
                      Object.keys(channelLabels) as Array<
                        keyof typeof channelLabels
                      >
                    ).map((channel) => (
                      <div
                        key={channel}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-text-sec">
                          {channelLabels[channel]}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            toggleChannel(
                              category,
                              channel,
                              !channels[channel]
                            )
                          }
                          className="relative h-7 w-12 rounded-full border-none cursor-pointer transition-colors shrink-0"
                          style={{
                            background: channels[channel]
                              ? "var(--teal)"
                              : "var(--border)",
                          }}
                        >
                          <span
                            className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all shadow-sm"
                            style={{
                              left: channels[channel] ? 24 : 4,
                            }}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          }
        )}
      </div>

      {/* Newsletter */}
      <Card className="mb-4">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <span className="text-xl">{"📬"}</span>
              <div>
                <h3 className="text-[15px] font-bold text-text m-0">IOPPS Newsletter</h3>
                <p className="text-xs text-text-muted m-0">Weekly digest of new jobs, events, scholarships, and community highlights</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNewsletterOptIn(!newsletterOptIn)}
              className="relative h-7 w-12 rounded-full border-none cursor-pointer transition-colors shrink-0"
              style={{ background: newsletterOptIn ? "var(--teal)" : "var(--border)" }}
            >
              <span className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all shadow-sm"
                style={{ left: newsletterOptIn ? 24 : 4 }} />
            </button>
          </div>
        </div>
      </Card>

      {/* Quiet Hours */}
      <Card className="mb-6">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold text-text m-0">
                Quiet Hours
              </h3>
              <p className="text-xs text-text-muted m-0">
                Pause notifications during specific hours
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setPrefs({
                  ...prefs,
                  quietHours: {
                    ...prefs.quietHours,
                    enabled: !prefs.quietHours.enabled,
                  },
                })
              }
              className="relative h-7 w-12 rounded-full border-none cursor-pointer transition-colors shrink-0"
              style={{
                background: prefs.quietHours.enabled
                  ? "var(--teal)"
                  : "var(--border)",
              }}
            >
              <span
                className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all shadow-sm"
                style={{
                  left: prefs.quietHours.enabled ? 24 : 4,
                }}
              />
            </button>
          </div>
          {prefs.quietHours.enabled && (
            <div className="flex items-center gap-3">
              <label className="flex-1">
                <span className="text-xs font-semibold text-text-muted block mb-1">
                  From
                </span>
                <input
                  type="time"
                  value={prefs.quietHours.start}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      quietHours: {
                        ...prefs.quietHours,
                        start: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-text text-sm outline-none"
                />
              </label>
              <label className="flex-1">
                <span className="text-xs font-semibold text-text-muted block mb-1">
                  To
                </span>
                <input
                  type="time"
                  value={prefs.quietHours.end}
                  onChange={(e) =>
                    setPrefs({
                      ...prefs,
                      quietHours: {
                        ...prefs.quietHours,
                        end: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-border bg-card text-text text-sm outline-none"
                />
              </label>
            </div>
          )}
        </div>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 rounded-xl border-none font-semibold text-sm text-white cursor-pointer transition-opacity hover:opacity-90"
          style={{
            background: "var(--teal)",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
