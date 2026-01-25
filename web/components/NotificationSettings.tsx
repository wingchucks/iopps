"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  updateNotificationCategory,
  toggleGlobalNotifications,
  setQuietHours,
  registerPushSubscription,
  unregisterPushSubscription,
  getNotificationCategoryGroups,
} from "@/lib/firestore/notificationPreferences";
import type {
  MemberNotificationPreferences,
  NotificationTypePreference,
  NotificationChannel,
} from "@/lib/firestore/notificationPreferences";
import {
  Bell,
  BellOff,
  Mail,
  Smartphone,
  Monitor,
  Moon,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

interface NotificationSettingsProps {
  compact?: boolean;
}

export default function NotificationSettings({ compact = false }: NotificationSettingsProps) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<MemberNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["jobs"]));
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);

  const categoryGroups = getNotificationCategoryGroups();

  useEffect(() => {
    // Check push notification support
    if ("Notification" in window && "serviceWorker" in navigator) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadPreferences = async () => {
      try {
        setLoading(true);
        const prefs = await getNotificationPreferences(user.uid);
        setPreferences(prefs);
      } catch (error) {
        console.error("Error loading notification preferences:", error);
        toast.error("Failed to load notification settings");
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleGlobalToggle = async () => {
    if (!user || !preferences) return;

    try {
      setSaving(true);
      const newValue = !preferences.globalEnabled;
      await toggleGlobalNotifications(user.uid, newValue);
      setPreferences((prev) => prev ? { ...prev, globalEnabled: newValue } : null);
      toast.success(newValue ? "Notifications enabled" : "Notifications disabled");
    } catch (error) {
      console.error("Error toggling global notifications:", error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleQuietHoursToggle = async () => {
    if (!user || !preferences) return;

    try {
      setSaving(true);
      const newEnabled = !preferences.quietHoursEnabled;
      await setQuietHours(
        user.uid,
        newEnabled,
        newEnabled ? "22:00" : undefined,
        newEnabled ? "08:00" : undefined
      );
      setPreferences((prev) =>
        prev
          ? {
              ...prev,
              quietHoursEnabled: newEnabled,
              quietHoursStart: newEnabled ? "22:00" : undefined,
              quietHoursEnd: newEnabled ? "08:00" : undefined,
            }
          : null
      );
      toast.success(newEnabled ? "Quiet hours enabled" : "Quiet hours disabled");
    } catch (error) {
      console.error("Error toggling quiet hours:", error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePushToggle = async () => {
    if (!user || !preferences || !pushSupported) return;

    try {
      setSaving(true);

      if (preferences.pushEnabled) {
        // Disable push
        await unregisterPushSubscription(user.uid);
        setPreferences((prev) => prev ? { ...prev, pushEnabled: false } : null);
        toast.success("Push notifications disabled");
      } else {
        // Request permission and enable
        if (pushPermission !== "granted") {
          const permission = await Notification.requestPermission();
          setPushPermission(permission);

          if (permission !== "granted") {
            toast.error("Please allow notifications in your browser settings");
            return;
          }
        }

        // Register service worker and get subscription
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        });

        await registerPushSubscription(user.uid, subscription);
        setPreferences((prev) => prev ? { ...prev, pushEnabled: true } : null);
        toast.success("Push notifications enabled");
      }
    } catch (error) {
      console.error("Error toggling push notifications:", error);
      toast.error("Failed to update push notification settings");
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryToggle = async (
    categoryKey: keyof MemberNotificationPreferences["categories"],
    currentPref: NotificationTypePreference
  ) => {
    if (!user || !preferences) return;

    try {
      setSaving(true);
      const newPref: NotificationTypePreference = {
        ...currentPref,
        enabled: !currentPref.enabled,
      };
      await updateNotificationCategory(user.uid, categoryKey, newPref);
      setPreferences((prev) =>
        prev
          ? {
              ...prev,
              categories: {
                ...prev.categories,
                [categoryKey]: newPref,
              },
            }
          : null
      );
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleChannelToggle = async (
    categoryKey: keyof MemberNotificationPreferences["categories"],
    currentPref: NotificationTypePreference,
    channel: NotificationChannel
  ) => {
    if (!user || !preferences) return;

    try {
      setSaving(true);
      const channels = currentPref.channels.includes(channel)
        ? currentPref.channels.filter((c) => c !== channel)
        : [...currentPref.channels, channel];

      const newPref: NotificationTypePreference = {
        ...currentPref,
        channels,
      };
      await updateNotificationCategory(user.uid, categoryKey, newPref);
      setPreferences((prev) =>
        prev
          ? {
              ...prev,
              categories: {
                ...prev.categories,
                [categoryKey]: newPref,
              },
            }
          : null
      );
    } catch (error) {
      console.error("Error updating channel:", error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto text-amber-400 mb-3" />
        <p className="text-slate-400">Unable to load notification settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Global Settings */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-emerald-400" />
          Notification Settings
        </h3>

        {/* Master Toggle */}
        <div className="flex items-center justify-between py-4 border-b border-slate-800">
          <div>
            <p className="font-medium text-white">All Notifications</p>
            <p className="text-sm text-slate-400">Master switch for all notifications</p>
          </div>
          <button
            onClick={handleGlobalToggle}
            disabled={saving}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              preferences.globalEnabled ? "bg-emerald-500" : "bg-slate-700"
            }`}
          >
            <span
              className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                preferences.globalEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Push Notifications */}
        {pushSupported && (
          <div className="flex items-center justify-between py-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-slate-400" />
              <div>
                <p className="font-medium text-white">Push Notifications</p>
                <p className="text-sm text-slate-400">
                  {pushPermission === "denied"
                    ? "Blocked in browser settings"
                    : "Receive notifications even when you're away"}
                </p>
              </div>
            </div>
            <button
              onClick={handlePushToggle}
              disabled={saving || pushPermission === "denied"}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                preferences.pushEnabled ? "bg-emerald-500" : "bg-slate-700"
              } ${pushPermission === "denied" ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                  preferences.pushEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        )}

        {/* Quiet Hours */}
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Moon className="h-5 w-5 text-slate-400" />
            <div>
              <p className="font-medium text-white">Quiet Hours</p>
              <p className="text-sm text-slate-400">
                {preferences.quietHoursEnabled
                  ? `${preferences.quietHoursStart} - ${preferences.quietHoursEnd}`
                  : "Pause notifications at night"}
              </p>
            </div>
          </div>
          <button
            onClick={handleQuietHoursToggle}
            disabled={saving}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              preferences.quietHoursEnabled ? "bg-emerald-500" : "bg-slate-700"
            }`}
          >
            <span
              className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                preferences.quietHoursEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Category Settings */}
      {!compact && preferences.globalEnabled && (
        <div className="space-y-4">
          {categoryGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.id);

            return (
              <div
                key={group.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden"
              >
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
                >
                  <div>
                    <h4 className="font-medium text-white text-left">{group.label}</h4>
                    <p className="text-sm text-slate-400 text-left">{group.description}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </button>

                {/* Category Items */}
                {isExpanded && (
                  <div className="border-t border-slate-800">
                    {group.categories.map((category) => {
                      const pref = preferences.categories[category.key];

                      return (
                        <div
                          key={category.key}
                          className="px-4 py-3 border-b border-slate-800/50 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{category.label}</p>
                              <p className="text-xs text-slate-500">{category.description}</p>
                            </div>
                            <button
                              onClick={() => handleCategoryToggle(category.key, pref)}
                              disabled={saving}
                              className={`relative h-6 w-10 rounded-full transition-colors ${
                                pref.enabled ? "bg-emerald-500" : "bg-slate-700"
                              }`}
                            >
                              <span
                                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                                  pref.enabled ? "translate-x-4" : "translate-x-0"
                                }`}
                              />
                            </button>
                          </div>

                          {/* Channel toggles */}
                          {pref.enabled && (
                            <div className="flex items-center gap-4 mt-3">
                              <span className="text-xs text-slate-500">Deliver via:</span>
                              <button
                                onClick={() => handleChannelToggle(category.key, pref, "in_app")}
                                disabled={saving}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                                  pref.channels.includes("in_app")
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-slate-800 text-slate-500"
                                }`}
                              >
                                <Monitor className="h-3 w-3" />
                                In-app
                              </button>
                              <button
                                onClick={() => handleChannelToggle(category.key, pref, "email")}
                                disabled={saving}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                                  pref.channels.includes("email")
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-slate-800 text-slate-500"
                                }`}
                              >
                                <Mail className="h-3 w-3" />
                                Email
                              </button>
                              {pushSupported && preferences.pushEnabled && (
                                <button
                                  onClick={() => handleChannelToggle(category.key, pref, "push")}
                                  disabled={saving}
                                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                                    pref.channels.includes("push")
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : "bg-slate-800 text-slate-500"
                                  }`}
                                >
                                  <Smartphone className="h-3 w-3" />
                                  Push
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Disabled State Message */}
      {!preferences.globalEnabled && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 flex items-center gap-3">
          <BellOff className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-400">
            All notifications are currently disabled. Enable them above to customize your
            preferences.
          </p>
        </div>
      )}
    </div>
  );
}
