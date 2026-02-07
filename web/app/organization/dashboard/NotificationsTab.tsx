"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { EmployerNotificationPreferences } from "@/lib/types";

interface NotificationSetting {
  key: keyof EmployerNotificationPreferences;
  label: string;
  description: string;
}

const applicationSettings: NotificationSetting[] = [
  {
    key: "newApplications",
    label: "New Applications",
    description: "Get notified when someone applies to your job postings",
  },
  {
    key: "applicationStatusChanges",
    label: "Application Status Changes",
    description: "Get notified when application statuses are updated",
  },
];

const jobSettings: NotificationSetting[] = [
  {
    key: "jobExpiring",
    label: "Job Expiring Soon",
    description: "Get reminded 3 days before a job posting expires",
  },
  {
    key: "scheduledJobPublished",
    label: "Scheduled Job Published",
    description: "Get notified when a scheduled job goes live",
  },
];

const trainingSettings: NotificationSetting[] = [
  {
    key: "trainingProgramExpiring",
    label: "Training Program Expiring",
    description: "Get reminded before a training program expires",
  },
  {
    key: "trainingProgramPublished",
    label: "Scheduled Training Published",
    description: "Get notified when a scheduled training goes live",
  },
  {
    key: "trainingRegistrations",
    label: "Training Registrations",
    description: "Get notified about new training program registrations",
  },
];

const eventSettings: NotificationSetting[] = [
  {
    key: "eventReminders",
    label: "Event Reminders",
    description: "Get reminded about your upcoming events",
  },
  {
    key: "eventPublished",
    label: "Scheduled Event Published",
    description: "Get notified when a scheduled event goes live",
  },
  {
    key: "eventRegistrations",
    label: "Event Registrations",
    description: "Get notified about new event registrations",
  },
];

const productServiceSettings: NotificationSetting[] = [
  {
    key: "productServiceExpiring",
    label: "Listing Expiring Soon",
    description: "Get reminded before product or service listings expire",
  },
  {
    key: "productServicePublished",
    label: "Scheduled Listing Published",
    description: "Get notified when scheduled products/services go live",
  },
  {
    key: "productServiceInquiries",
    label: "Product/Service Inquiries",
    description: "Get notified about inquiries on your listings",
  },
];

const scholarshipGrantSettings: NotificationSetting[] = [
  {
    key: "scholarshipGrantExpiring",
    label: "Opportunity Expiring Soon",
    description: "Get reminded before scholarships or grants expire",
  },
  {
    key: "scholarshipGrantPublished",
    label: "Scheduled Opportunity Published",
    description: "Get notified when scheduled scholarships/grants go live",
  },
  {
    key: "scholarshipApplications",
    label: "Scholarship Applications",
    description: "Get notified about scholarship applications",
  },
];

const teamSettings: NotificationSetting[] = [
  {
    key: "teamInvitations",
    label: "Team Invitations",
    description: "Get notified about team invitation activity",
  },
  {
    key: "teamActivity",
    label: "Team Activity",
    description: "Get notified when team members make changes",
  },
];

const digestSettings: NotificationSetting[] = [
  {
    key: "dailyActivitySummary",
    label: "Daily Activity Summary",
    description: "Receive a daily summary of team activity",
  },
  {
    key: "weeklyDigest",
    label: "Weekly Digest",
    description: "Receive a weekly summary of activity and insights",
  },
  {
    key: "marketingEmails",
    label: "Product Updates & Tips",
    description: "Receive occasional tips and feature announcements",
  },
];

export default function NotificationsTab() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<EmployerNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function fetchPreferences() {
      if (!user) return;

      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/organization/notification-preferences", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch preferences");

        const data = await res.json();
        setPreferences(data.preferences);
      } catch (err) {
        console.error("Error fetching preferences:", err);
        setError("Failed to load notification preferences");
      } finally {
        setLoading(false);
      }
    }

    fetchPreferences();
  }, [user]);

  const updatePreference = async (key: keyof EmployerNotificationPreferences, value: boolean) => {
    if (!user || !preferences) return;

    const oldPreferences = { ...preferences };
    setPreferences({ ...preferences, [key]: value });
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/organization/notification-preferences", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ preferences: { [key]: value } }),
      });

      if (!res.ok) throw new Error("Failed to update preference");

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error("Error updating preference:", err);
      setPreferences(oldPreferences);
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderSection = (title: string, settings: NotificationSetting[]) => (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-4">{title}</h3>
      <div className="space-y-4">
        {settings.map((setting) => (
          <div
            key={setting.key}
            className="flex items-center justify-between p-4 rounded-xl bg-surface border border-[var(--card-border)]"
          >
            <div className="flex-1 pr-4">
              <p className="text-foreground font-medium">{setting.label}</p>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">{setting.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences?.[setting.key] ?? false}
                onChange={(e) => updatePreference(setting.key, e.target.checked)}
                disabled={saving || loading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#14B8A6]/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--card-bg)] after:border-[var(--border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14B8A6]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Email Notifications</h2>
        <p className="text-[var(--text-muted)]">
          Choose which emails you would like to receive. Changes are saved automatically.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
          {error}
        </div>
      )}

      {saveSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-accent/10 border border-[#14B8A6]/30 text-[#14B8A6] flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Changes saved
        </div>
      )}

      {renderSection("Applications", applicationSettings)}
      {renderSection("Job Postings", jobSettings)}
      {renderSection("Training Programs", trainingSettings)}
      {renderSection("Events", eventSettings)}
      {renderSection("Products & Services", productServiceSettings)}
      {renderSection("Scholarships & Grants", scholarshipGrantSettings)}
      {renderSection("Team", teamSettings)}
      {renderSection("Digests & Updates", digestSettings)}

      <div className="mt-8 p-4 rounded-xl bg-slate-800/30 border border-[var(--card-border)]/30">
        <p className="text-sm text-[var(--text-muted)]">
          You will always receive essential notifications like security alerts and account-related emails regardless of these settings.
        </p>
      </div>
    </div>
  );
}
