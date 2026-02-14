"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, Button } from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_NOTIFICATIONS: NotificationPreference[] = [
  {
    id: "new_application",
    label: "New Applications",
    description: "Get notified when someone applies to your job postings.",
    enabled: true,
  },
  {
    id: "application_update",
    label: "Application Updates",
    description: "Receive updates when applicants respond to your messages.",
    enabled: true,
  },
  {
    id: "job_expiry",
    label: "Job Expiry Reminders",
    description: "Get reminded before your job postings expire.",
    enabled: false,
  },
  {
    id: "billing_alerts",
    label: "Billing Alerts",
    description: "Receive notifications about billing and subscription changes.",
    enabled: true,
  },
  {
    id: "marketing",
    label: "Tips & Updates",
    description: "Receive tips on improving your job postings and platform news.",
    enabled: false,
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ToggleSwitch({
  enabled,
  onChange,
  id,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  id: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      id={id}
      onClick={() => onChange(!enabled)}
      className={[
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200",
        enabled ? "bg-accent" : "border-2 border-card-border bg-surface",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          enabled ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
      <dt className="w-32 shrink-0 text-sm font-medium text-text-muted">
        {label}
      </dt>
      <dd className="text-sm text-text-primary">
        {value || <span className="text-text-muted italic">Not set</span>}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrganizationSettingsPage() {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationPreference[]>(
    INITIAL_NOTIFICATIONS
  );
  const [editingProfile, setEditingProfile] = useState(false);

  function toggleNotification(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    );
  }

  const displayName = userProfile?.displayName || "Your Organization";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your organization profile and preferences.
        </p>
      </div>

      {/* Organization profile */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">
              Organization Profile
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditingProfile(!editingProfile)}
            >
              {editingProfile ? "Cancel" : "Edit"}
            </Button>
          </div>

          {editingProfile ? (
            <div className="space-y-4">
              <p className="text-sm text-text-muted">
                Profile editing will be available once the API is connected.
                For now, profile data is read-only.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditingProfile(false)}
              >
                Close
              </Button>
            </div>
          ) : (
            <dl className="space-y-4">
              <InfoRow label="Name" value={displayName} />
              <InfoRow
                label="Description"
                value=""
              />
              <InfoRow
                label="Website"
                value=""
              />
              <InfoRow
                label="Location"
                value=""
              />
            </dl>
          )}
        </CardContent>
      </Card>

      {/* Notification preferences */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="mb-6 text-lg font-semibold text-text-primary">
            Notification Preferences
          </h2>

          <div className="divide-y divide-card-border">
            {notifications.map((pref) => (
              <div
                key={pref.id}
                className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <label
                    htmlFor={`toggle-${pref.id}`}
                    className="block text-sm font-medium text-text-primary cursor-pointer"
                  >
                    {pref.label}
                  </label>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {pref.description}
                  </p>
                </div>
                <ToggleSwitch
                  id={`toggle-${pref.id}`}
                  enabled={pref.enabled}
                  onChange={() => toggleNotification(pref.id)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-error/30">
        <CardContent className="p-6">
          <h2 className="mb-2 text-lg font-semibold text-error">
            Danger Zone
          </h2>
          <p className="mb-4 text-sm text-text-muted">
            Permanently delete your organization and all associated data. This
            action cannot be undone.
          </p>
          <Button variant="danger" disabled>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            Delete Organization
          </Button>
          <p className="mt-2 text-xs text-text-muted">
            Contact support to delete your organization account.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
