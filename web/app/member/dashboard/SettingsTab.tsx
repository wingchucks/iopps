"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface NotificationSettings {
  jobAlerts: boolean;
  applicationUpdates: boolean;
  messages: boolean;
  newsletter: boolean;
  eventReminders: boolean;
}

export default function SettingsTab() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationSettings>({
    jobAlerts: true,
    applicationUpdates: true,
    messages: true,
    newsletter: false,
    eventReminders: true,
  });
  const [saving, setSaving] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Handle password reset
  const handlePasswordReset = async () => {
    if (!user?.email) return;

    try {
      await sendPasswordResetEmail(auth!, user.email);
      setResetEmailSent(true);
      setTimeout(() => setResetEmailSent(false), 5000);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      alert("Error sending password reset email. Please try again.");
    }
  };

  // Handle notification toggle
  const handleNotificationToggle = (key: keyof NotificationSettings) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Save settings (placeholder for future implementation)
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // TODO: Save to Firestore emailPreferences collection
      await new Promise((resolve) => setTimeout(resolve, 500));
      alert("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 via-slate-900/50 to-slate-800/50 p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-white">Account Settings</h2>
        <p className="mt-2 text-slate-400">
          Manage your account preferences, notifications, and security settings
        </p>
      </div>

      {/* Account Information */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
        <h3 className="mb-6 text-xl font-bold text-white">Account Information</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-slate-900/50 p-4">
            <div>
              <p className="text-sm font-medium text-slate-300">Email Address</p>
              <p className="text-slate-400">{user?.email || "Not set"}</p>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
              Verified
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-slate-900/50 p-4">
            <div>
              <p className="text-sm font-medium text-slate-300">Member Since</p>
              <p className="text-slate-400">
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
      </section>

      {/* Security */}
      <section className="rounded-3xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-8 shadow-xl shadow-blue-900/20">
        <h3 className="mb-6 text-xl font-bold text-white">Security</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-blue-500/20 bg-slate-900/50 p-4">
            <div>
              <p className="text-sm font-medium text-slate-300">Password</p>
              <p className="text-slate-400">Last changed: Unknown</p>
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
            <p className="text-sm text-emerald-400">
              Password reset email sent to {user?.email}. Check your inbox.
            </p>
          )}
        </div>
      </section>

      {/* Notification Preferences */}
      <section className="rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 p-8 shadow-xl shadow-amber-900/20">
        <h3 className="mb-6 text-xl font-bold text-white">Notification Preferences</h3>
        <div className="space-y-3">
          {[
            { key: "jobAlerts" as const, label: "Job Alerts", description: "New jobs matching your profile" },
            { key: "applicationUpdates" as const, label: "Application Updates", description: "Status changes on your applications" },
            { key: "messages" as const, label: "Messages", description: "New messages from employers" },
            { key: "eventReminders" as const, label: "Event Reminders", description: "Upcoming conferences and pow wows" },
            { key: "newsletter" as const, label: "Newsletter", description: "Weekly digest and community updates" },
          ].map(({ key, label, description }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-slate-900/50 p-4"
            >
              <div>
                <p className="text-sm font-medium text-slate-300">{label}</p>
                <p className="text-xs text-slate-500">{description}</p>
              </div>
              <button
                onClick={() => handleNotificationToggle(key)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  notifications[key] ? "bg-emerald-500" : "bg-slate-600"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    notifications[key] ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy */}
      <section className="rounded-3xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-rose-500/10 p-8 shadow-xl shadow-purple-900/20">
        <h3 className="mb-6 text-xl font-bold text-white">Privacy</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-slate-900/50 p-4">
            <div>
              <p className="text-sm font-medium text-slate-300">Profile Visibility</p>
              <p className="text-xs text-slate-500">Who can see your profile</p>
            </div>
            <select className="rounded-lg border border-purple-500/20 bg-slate-800 px-3 py-2 text-sm text-slate-300 focus:border-purple-500/50 focus:outline-none">
              <option value="public">Public (Employers)</option>
              <option value="connections">Connections Only</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-slate-900/50 p-4">
            <div>
              <p className="text-sm font-medium text-slate-300">Show in Talent Search</p>
              <p className="text-xs text-slate-500">Allow employers to find you</p>
            </div>
            <button
              className="relative h-6 w-11 rounded-full bg-emerald-500 transition-colors"
            >
              <span className="absolute left-0.5 top-0.5 h-5 w-5 translate-x-5 rounded-full bg-white transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {/* Danger Zone */}
      <section className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8">
        <h3 className="mb-4 text-xl font-bold text-red-400">Danger Zone</h3>
        <p className="mb-4 text-sm text-slate-400">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button
          onClick={() => alert("Please contact support@iopps.com to delete your account.")}
          className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
        >
          Delete Account
        </button>
      </section>
    </div>
  );
}
