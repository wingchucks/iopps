"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import type { EmailPreferences, EmailDigestFrequency } from "@/lib/types";
import {
  BellIcon,
  BellSlashIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  BuildingStorefrontIcon,
  AcademicCapIcon,
  NewspaperIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const FREQUENCY_OPTIONS: { value: EmailDigestFrequency; label: string }[] = [
  { value: "instant", label: "Instant" },
  { value: "daily", label: "Daily Digest" },
  { value: "weekly", label: "Weekly Digest" },
  { value: "never", label: "Never" },
];

export default function EmailPreferencesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preferences, setPreferences] = useState<EmailPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    loadPreferences();
  }, [user, authLoading, router]);

  async function loadPreferences() {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const idToken = await user.getIdToken();
      const response = await fetch("/api/emails/preferences", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load preferences");
      }

      const data = await response.json();
      setPreferences(data.preferences);
    } catch (err) {
      console.error("Error loading preferences:", err);
      setError("Failed to load email preferences. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function savePreferences(updates: Partial<EmailPreferences>) {
    if (!user || !preferences) return;

    try {
      setSaving(true);
      setSaved(false);
      setError(null);

      const idToken = await user.getIdToken();
      const response = await fetch("/api/emails/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to save preferences");
      }

      const data = await response.json();
      setPreferences(data.preferences);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error saving preferences:", err);
      setError("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleToggle(field: keyof EmailPreferences) {
    if (!preferences) return;
    const currentValue = preferences[field];
    if (typeof currentValue === "boolean") {
      const newValue = !currentValue;
      setPreferences({ ...preferences, [field]: newValue });
      savePreferences({ [field]: newValue });
    }
  }

  function handleFrequencyChange(field: keyof EmailPreferences, value: EmailDigestFrequency) {
    if (!preferences) return;
    setPreferences({ ...preferences, [field]: value });
    savePreferences({ [field]: value });
  }

  function handleUnsubscribeAll() {
    if (!preferences) return;
    const newValue = !preferences.unsubscribedAll;

    if (newValue) {
      // Unsubscribing from all
      const confirmed = confirm(
        "Are you sure you want to unsubscribe from all marketing emails? You will still receive important account notifications."
      );
      if (!confirmed) return;
    }

    setPreferences({ ...preferences, unsubscribedAll: newValue });
    savePreferences({ unsubscribedAll: newValue });
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <p className="text-slate-400">Loading email preferences...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error && !preferences) {
    return (
      <div className="min-h-screen bg-[#020306] px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-lg border border-red-800 bg-red-950/30 p-4 text-red-400">
            {error}
          </div>
          <button
            onClick={loadPreferences}
            className="mt-4 rounded-lg bg-[#14B8A6] px-4 py-2 font-medium text-slate-900"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!preferences) return null;

  const isUnsubscribed = preferences.unsubscribedAll;

  return (
    <div className="min-h-screen bg-[#020306]">
      {/* Header */}
      <div className="border-b border-slate-800 bg-[#08090C]">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/member"
                className="text-sm text-slate-400 hover:text-[#14B8A6]"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">
                Email Preferences
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Control what emails you receive from IOPPS
              </p>
            </div>
            {saved && (
              <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-400">
                <CheckCircleIcon className="h-4 w-4" />
                Saved
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-3xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/30 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Global Unsubscribe */}
        <div className={`mb-8 rounded-xl border p-6 ${isUnsubscribed ? "border-red-800/50 bg-red-950/20" : "border-slate-800 bg-[#08090C]"}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {isUnsubscribed ? (
                <BellSlashIcon className="h-8 w-8 text-red-400" />
              ) : (
                <BellIcon className="h-8 w-8 text-[#14B8A6]" />
              )}
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  {isUnsubscribed ? "You've unsubscribed from all marketing emails" : "Email Notifications Active"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {isUnsubscribed
                    ? "You will only receive essential account notifications. Click to resubscribe."
                    : "You're receiving personalized updates based on your preferences below."
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleUnsubscribeAll}
              disabled={saving}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                isUnsubscribed
                  ? "bg-[#14B8A6] text-slate-900 hover:bg-[#0D9488]"
                  : "border border-red-800 text-red-400 hover:bg-red-950/50"
              }`}
            >
              {isUnsubscribed ? "Resubscribe" : "Unsubscribe All"}
            </button>
          </div>
        </div>

        {/* Preference Sections */}
        <div className={`space-y-6 ${isUnsubscribed ? "pointer-events-none opacity-50" : ""}`}>

          {/* Job Alerts */}
          <PreferenceSection
            icon={<BriefcaseIcon className="h-6 w-6" />}
            title="Job Alerts"
            description="Get notified about new jobs matching your criteria"
            enabled={preferences.jobAlertsEnabled}
            onToggle={() => handleToggle("jobAlertsEnabled")}
            saving={saving}
          >
            <p className="text-sm text-slate-500">
              Manage your job alerts on the{" "}
              <Link href="/member/alerts" className="text-[#14B8A6] hover:underline">
                Job Alerts page
              </Link>
            </p>
          </PreferenceSection>

          {/* Conference Updates */}
          <PreferenceSection
            icon={<BuildingOfficeIcon className="h-6 w-6" />}
            title="Conference Updates"
            description="New conferences and registration reminders"
            enabled={preferences.conferenceUpdates}
            onToggle={() => handleToggle("conferenceUpdates")}
            saving={saving}
          >
            {preferences.conferenceUpdates && (
              <FrequencySelect
                value={preferences.conferenceFrequency}
                onChange={(val) => handleFrequencyChange("conferenceFrequency", val)}
                disabled={saving}
              />
            )}
          </PreferenceSection>

          {/* Pow Wows & Events */}
          <PreferenceSection
            icon={<SparklesIcon className="h-6 w-6" />}
            title="Pow Wows & Events"
            description="Upcoming pow wows, cultural gatherings, and community events"
            enabled={preferences.powwowUpdates}
            onToggle={() => handleToggle("powwowUpdates")}
            saving={saving}
          >
            {preferences.powwowUpdates && (
              <FrequencySelect
                value={preferences.powwowFrequency}
                onChange={(val) => handleFrequencyChange("powwowFrequency", val)}
                disabled={saving}
              />
            )}
          </PreferenceSection>

          {/* Shop Indigenous */}
          <PreferenceSection
            icon={<BuildingStorefrontIcon className="h-6 w-6" />}
            title="Shop Indigenous"
            description="New vendors, featured products, and special offers"
            enabled={preferences.shopUpdates}
            onToggle={() => handleToggle("shopUpdates")}
            saving={saving}
          >
            {preferences.shopUpdates && (
              <FrequencySelect
                value={preferences.shopFrequency}
                onChange={(val) => handleFrequencyChange("shopFrequency", val)}
                disabled={saving}
              />
            )}
          </PreferenceSection>

          {/* Training Programs */}
          <PreferenceSection
            icon={<AcademicCapIcon className="h-6 w-6" />}
            title="Training Programs"
            description="New training opportunities, certifications, and skills development"
            enabled={preferences.trainingUpdates}
            onToggle={() => handleToggle("trainingUpdates")}
            saving={saving}
          >
            {preferences.trainingUpdates && (
              <FrequencySelect
                value={preferences.trainingFrequency}
                onChange={(val) => handleFrequencyChange("trainingFrequency", val)}
                disabled={saving}
              />
            )}
          </PreferenceSection>

          {/* Weekly Digest */}
          <PreferenceSection
            icon={<NewspaperIcon className="h-6 w-6" />}
            title="Weekly Digest"
            description="A weekly summary of new opportunities and community highlights"
            enabled={preferences.weeklyDigest}
            onToggle={() => handleToggle("weeklyDigest")}
            saving={saving}
          />

          {/* Divider */}
          <div className="border-t border-slate-800 pt-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Account Notifications
            </h3>
          </div>

          {/* Application Updates */}
          <PreferenceSection
            icon={<EnvelopeIcon className="h-6 w-6" />}
            title="Application Updates"
            description="Status changes for your job applications"
            enabled={preferences.applicationUpdates}
            onToggle={() => handleToggle("applicationUpdates")}
            saving={saving}
          />

          {/* Message Notifications */}
          <PreferenceSection
            icon={<ChatBubbleLeftIcon className="h-6 w-6" />}
            title="Message Notifications"
            description="Get notified when you receive new messages"
            enabled={preferences.messageNotifications}
            onToggle={() => handleToggle("messageNotifications")}
            saving={saving}
          />
        </div>

        {/* Footer */}
        <div className="mt-12 rounded-lg border border-slate-800 bg-[#08090C] p-6 text-center">
          <p className="text-sm text-slate-400">
            Need help? Contact us at{" "}
            <a href="mailto:support@iopps.ca" className="text-[#14B8A6] hover:underline">
              support@iopps.ca
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Preference Section Component
function PreferenceSection({
  icon,
  title,
  description,
  enabled,
  onToggle,
  saving,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  saving: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#08090C] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`${enabled ? "text-[#14B8A6]" : "text-slate-600"}`}>
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">{title}</h3>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
            {children && <div className="mt-3">{children}</div>}
          </div>
        </div>
        <button
          onClick={onToggle}
          disabled={saving}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            enabled ? "bg-[#14B8A6]" : "bg-slate-700"
          }`}
        >
          <div
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

// Frequency Select Component
function FrequencySelect({
  value,
  onChange,
  disabled,
}: {
  value: EmailDigestFrequency;
  onChange: (value: EmailDigestFrequency) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-2">
      {FREQUENCY_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          disabled={disabled}
          className={`rounded-full px-3 py-1 text-xs font-medium transition disabled:opacity-50 ${
            value === option.value
              ? "bg-[#14B8A6] text-slate-900"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
