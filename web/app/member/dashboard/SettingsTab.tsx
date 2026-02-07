"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  getMemberSettings,
  updateNotificationSettings,
  updatePrivacySettings,
  DEFAULT_MEMBER_SETTINGS,
  type MemberSettings,
  type ProfileVisibility,
} from "@/lib/firestore";
import toast from "react-hot-toast";
import { Loader2, Shield, Bell, Eye, Trash2, Key, Mail, Calendar, Users } from "lucide-react";

export default function SettingsTab() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<MemberSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings on mount
  const loadSettings = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const memberSettings = await getMemberSettings(user.uid);
      setSettings(memberSettings);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Error loading settings");
      // Fall back to defaults
      setSettings({
        ...DEFAULT_MEMBER_SETTINGS,
        id: user.uid,
        userId: user.uid,
        createdAt: null,
        updatedAt: null,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!user?.email) return;

    try {
      await sendPasswordResetEmail(auth!, user.email);
      setResetEmailSent(true);
      toast.success("Password reset email sent!");
      setTimeout(() => setResetEmailSent(false), 5000);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      toast.error("Error sending password reset email. Please try again.");
    }
  };

  // Handle notification toggle
  const handleNotificationToggle = (key: keyof MemberSettings["notifications"]) => {
    if (!settings) return;

    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        notifications: {
          ...prev.notifications,
          [key]: !prev.notifications[key],
        },
      };
    });
    setHasChanges(true);
  };

  // Handle privacy setting changes
  const handlePrivacyChange = (
    key: "profileVisibility" | "showInTalentSearch" | "showInDirectory" | "allowConnectionRequests" | "showActivityInFeed" | "showEventAttendance",
    value: boolean | ProfileVisibility
  ) => {
    if (!settings) return;

    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: value,
      };
    });
    setHasChanges(true);
  };

  // Handle messages from setting
  const handleMessagesFromChange = (value: "everyone" | "connections" | "none") => {
    if (!settings) return;

    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        allowMessagesFrom: value,
      };
    });
    setHasChanges(true);
  };

  // Save all settings
  const handleSaveSettings = async () => {
    if (!user || !settings) return;

    setSaving(true);
    try {
      // Save notification settings
      await updateNotificationSettings(user.uid, settings.notifications);

      // Save privacy settings
      await updatePrivacySettings(user.uid, {
        profileVisibility: settings.profileVisibility,
        showInTalentSearch: settings.showInTalentSearch,
        showInDirectory: settings.showInDirectory,
        allowConnectionRequests: settings.allowConnectionRequests,
        allowMessagesFrom: settings.allowMessagesFrom,
        showActivityInFeed: settings.showActivityInFeed,
        showEventAttendance: settings.showEventAttendance,
      });

      setHasChanges(false);
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Error saving settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-[var(--text-muted)]">Unable to load settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 via-slate-900/50 to-slate-800/50 p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-white">Account Settings</h2>
        <p className="mt-2 text-[var(--text-muted)]">
          Manage your account preferences, notifications, and privacy settings
        </p>
        {hasChanges && (
          <div className="mt-4 flex items-center gap-2 text-amber-400">
            <div className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-sm">You have unsaved changes</span>
          </div>
        )}
      </div>

      {/* Account Information */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <div className="mb-6 flex items-center gap-3">
          <Mail className="h-6 w-6 text-accent" />
          <h3 className="text-xl font-bold text-white">Account Information</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-accent/20 bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Email Address</p>
              <p className="text-[var(--text-muted)]">{user?.email || "Not set"}</p>
            </div>
            <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent">
              Verified
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-accent/20 bg-surface p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-foreground0" />
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">Member Since</p>
                <p className="text-[var(--text-muted)]">
                  {user?.metadata?.creationTime
                    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "Unknown"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-8 shadow-xl shadow-blue-900/20">
        <div className="mb-6 flex items-center gap-3">
          <Key className="h-6 w-6 text-blue-400" />
          <h3 className="text-xl font-bold text-white">Security</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Password</p>
              <p className="text-xs text-foreground0">Update your account password</p>
            </div>
            <button
              onClick={handlePasswordReset}
              disabled={resetEmailSent}
              className="rounded-xl border border-blue-500/30 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/10 disabled:opacity-50"
            >
              {resetEmailSent ? "Email Sent!" : "Reset Password"}
            </button>
          </div>

          {resetEmailSent && (
            <p className="text-sm text-accent">
              Password reset email sent to {user?.email}. Check your inbox.
            </p>
          )}
        </div>
      </section>

      {/* Notification Preferences */}
      <section className="rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 p-8 shadow-xl shadow-amber-900/20">
        <div className="mb-6 flex items-center gap-3">
          <Bell className="h-6 w-6 text-amber-400" />
          <h3 className="text-xl font-bold text-white">Notification Preferences</h3>
        </div>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Choose what email notifications you want to receive
        </p>
        <div className="space-y-3">
          {[
            { key: "jobAlerts" as const, label: "Job Alerts", description: "New jobs matching your profile and saved searches" },
            { key: "applicationUpdates" as const, label: "Application Updates", description: "Status changes on your job applications" },
            { key: "messages" as const, label: "Messages", description: "New messages from employers and connections" },
            { key: "eventReminders" as const, label: "Event Reminders", description: "Upcoming conferences, pow wows, and events you've RSVP'd to" },
            { key: "newsletter" as const, label: "Newsletter", description: "Weekly digest with community updates and opportunities" },
          ].map(({ key, label, description }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-surface p-4"
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
                <p className="text-xs text-foreground0">{description}</p>
              </div>
              <button
                onClick={() => handleNotificationToggle(key)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  settings.notifications[key] ? "bg-accent" : "bg-slate-600"
                }`}
                role="switch"
                aria-checked={settings.notifications[key]}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--card-bg)] transition-transform ${
                    settings.notifications[key] ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy Settings */}
      <section className="rounded-3xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-rose-500/10 p-8 shadow-xl shadow-purple-900/20">
        <div className="mb-6 flex items-center gap-3">
          <Eye className="h-6 w-6 text-purple-400" />
          <h3 className="text-xl font-bold text-white">Privacy Settings</h3>
        </div>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Control who can see your profile and how you appear on the platform
        </p>
        <div className="space-y-4">
          {/* Profile Visibility */}
          <div className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Profile Visibility</p>
              <p className="text-xs text-foreground0">Who can view your full profile</p>
            </div>
            <select
              value={settings.profileVisibility}
              onChange={(e) => handlePrivacyChange("profileVisibility", e.target.value as ProfileVisibility)}
              className="rounded-lg border border-purple-500/20 bg-surface px-3 py-2 text-sm text-[var(--text-secondary)] focus:border-purple-500/50 focus:outline-none"
            >
              <option value="public">Public (All IOPPS Members)</option>
              <option value="connections">Connections Only</option>
              <option value="private">Private</option>
            </select>
          </div>

          {/* Show in Talent Search */}
          <div className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Show in Talent Search</p>
              <p className="text-xs text-foreground0">Allow employers to find you when searching for candidates</p>
            </div>
            <button
              onClick={() => handlePrivacyChange("showInTalentSearch", !settings.showInTalentSearch)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                settings.showInTalentSearch ? "bg-accent" : "bg-slate-600"
              }`}
              role="switch"
              aria-checked={settings.showInTalentSearch}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--card-bg)] transition-transform ${
                  settings.showInTalentSearch ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Show in Member Directory */}
          <div className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Show in Member Directory</p>
              <p className="text-xs text-foreground0">Appear in the community member directory</p>
            </div>
            <button
              onClick={() => handlePrivacyChange("showInDirectory", !settings.showInDirectory)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                settings.showInDirectory ? "bg-accent" : "bg-slate-600"
              }`}
              role="switch"
              aria-checked={settings.showInDirectory}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--card-bg)] transition-transform ${
                  settings.showInDirectory ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Connection Settings */}
      <section className="rounded-3xl bg-gradient-to-br from-cyan-500/10 via-teal-500/10 to-emerald-500/10 p-8 shadow-xl shadow-cyan-900/20">
        <div className="mb-6 flex items-center gap-3">
          <Users className="h-6 w-6 text-cyan-400" />
          <h3 className="text-xl font-bold text-white">Connection Settings</h3>
        </div>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Control how other members can interact with you
        </p>
        <div className="space-y-4">
          {/* Allow Connection Requests */}
          <div className="flex items-center justify-between rounded-xl border border-cyan-500/20 bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Allow Connection Requests</p>
              <p className="text-xs text-foreground0">Let other members send you connection requests</p>
            </div>
            <button
              onClick={() => handlePrivacyChange("allowConnectionRequests", !settings.allowConnectionRequests)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                settings.allowConnectionRequests ? "bg-accent" : "bg-slate-600"
              }`}
              role="switch"
              aria-checked={settings.allowConnectionRequests}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--card-bg)] transition-transform ${
                  settings.allowConnectionRequests ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Who Can Message */}
          <div className="flex items-center justify-between rounded-xl border border-cyan-500/20 bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Who Can Message Me</p>
              <p className="text-xs text-foreground0">Control who can send you direct messages</p>
            </div>
            <select
              value={settings.allowMessagesFrom}
              onChange={(e) => handleMessagesFromChange(e.target.value as "everyone" | "connections" | "none")}
              className="rounded-lg border border-cyan-500/20 bg-surface px-3 py-2 text-sm text-[var(--text-secondary)] focus:border-cyan-500/50 focus:outline-none"
            >
              <option value="everyone">Everyone</option>
              <option value="connections">Connections Only</option>
              <option value="none">No One</option>
            </select>
          </div>

          {/* Show Activity in Feed */}
          <div className="flex items-center justify-between rounded-xl border border-cyan-500/20 bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Show Activity in Community Feed</p>
              <p className="text-xs text-foreground0">Your activity may appear in the community feed</p>
            </div>
            <button
              onClick={() => handlePrivacyChange("showActivityInFeed", !settings.showActivityInFeed)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                settings.showActivityInFeed ? "bg-accent" : "bg-slate-600"
              }`}
              role="switch"
              aria-checked={settings.showActivityInFeed}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--card-bg)] transition-transform ${
                  settings.showActivityInFeed ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Show Event Attendance */}
          <div className="flex items-center justify-between rounded-xl border border-cyan-500/20 bg-surface p-4">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Show Event Attendance</p>
              <p className="text-xs text-foreground0">Let others see which events you're attending</p>
            </div>
            <button
              onClick={() => handlePrivacyChange("showEventAttendance", !settings.showEventAttendance)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                settings.showEventAttendance ? "bg-accent" : "bg-slate-600"
              }`}
              role="switch"
              aria-checked={settings.showEventAttendance}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--card-bg)] transition-transform ${
                  settings.showEventAttendance ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <button
          onClick={handleSaveSettings}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {/* Danger Zone */}
      <section className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8">
        <div className="mb-4 flex items-center gap-3">
          <Trash2 className="h-6 w-6 text-red-400" />
          <h3 className="text-xl font-bold text-red-400">Danger Zone</h3>
        </div>
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          Once you delete your account, there is no going back. All your data, applications, and connections will be permanently removed.
        </p>
        <button
          onClick={() => toast.error("Please contact support@iopps.com to delete your account.")}
          className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
        >
          Delete Account
        </button>
      </section>
    </div>
  );
}
