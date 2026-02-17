"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  getMemberSettings,
  updatePrivacySettings,
  type MemberSettings,
  type FieldVisibility,
} from "@/lib/firestore/memberSettings";
import ProtectedRoute from "@/components/ProtectedRoute";
import NavBar from "@/components/NavBar";
import Card from "@/components/Card";
import PageSkeleton from "@/components/PageSkeleton";

const visibilityOptions: { value: FieldVisibility; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "members", label: "Members Only" },
  { value: "only_me", label: "Only Me" },
];

const profileVisOptions: {
  value: MemberSettings["profileVisibility"];
  label: string;
  desc: string;
}[] = [
  { value: "public", label: "Public", desc: "Anyone can see your profile" },
  {
    value: "members_only",
    label: "Members Only",
    desc: "Only IOPPS members can view",
  },
  {
    value: "private",
    label: "Private",
    desc: "Only you can see your profile",
  },
];

const fieldLabels: Record<string, string> = {
  email: "Email Address",
  community: "Community / First Nation",
  location: "Location",
  bio: "Bio",
  interests: "Interests",
};

export default function PrivacySettingsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-bg">
        <NavBar />
        <PrivacyContent />
      </div>
    </ProtectedRoute>
  );
}

function PrivacyContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<MemberSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getMemberSettings(user.uid);
      setSettings(data);
    } catch (err) {
      console.error("Failed to load privacy settings:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!user || !settings) return;
    setSaving(true);
    try {
      await updatePrivacySettings(user.uid, {
        profileVisibility: settings.profileVisibility,
        fieldVisibility: settings.fieldVisibility,
        showOnlineStatus: settings.showOnlineStatus,
        allowDirectMessages: settings.allowDirectMessages,
        showInDirectory: settings.showInDirectory,
      });
      showToast("Privacy settings saved");
    } catch (err) {
      console.error("Failed to save privacy settings:", err);
      showToast("Failed to save settings. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSkeleton variant="list" />;
  }

  if (!settings) return null;

  return (
    <div className="max-w-[700px] mx-auto px-4 py-8 md:px-10">
      <Link
        href="/settings"
        className="text-sm text-teal font-semibold no-underline hover:underline mb-4 inline-block"
      >
        &larr; Back to Settings
      </Link>
      <h1 className="text-2xl font-extrabold text-text mb-1">
        Privacy & Visibility
      </h1>
      <p className="text-sm text-text-muted mb-6">
        Control who can see your profile and personal information.
      </p>

      {/* Profile Visibility */}
      <Card className="mb-4">
        <div className="p-5">
          <h3 className="text-[15px] font-bold text-text mb-3">
            Profile Visibility
          </h3>
          <div className="flex flex-col gap-2">
            {profileVisOptions.map(({ value, label, desc }) => (
              <label
                key={value}
                className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
                style={{
                  background:
                    settings.profileVisibility === value
                      ? "rgba(13,148,136,.06)"
                      : "transparent",
                  border:
                    settings.profileVisibility === value
                      ? "1.5px solid rgba(13,148,136,.2)"
                      : "1.5px solid transparent",
                }}
              >
                <input
                  type="radio"
                  name="profileVisibility"
                  value={value}
                  checked={settings.profileVisibility === value}
                  onChange={() =>
                    setSettings({ ...settings, profileVisibility: value })
                  }
                  className="accent-teal w-4 h-4"
                />
                <div>
                  <span className="text-sm font-semibold text-text">
                    {label}
                  </span>
                  <p className="text-xs text-text-muted m-0">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </Card>

      {/* Field-Level Visibility */}
      <Card className="mb-4">
        <div className="p-5">
          <h3 className="text-[15px] font-bold text-text mb-1">
            Field Visibility
          </h3>
          <p className="text-xs text-text-muted mb-4">
            Choose who can see each piece of your profile information.
          </p>
          <div className="flex flex-col gap-3">
            {(
              Object.keys(settings.fieldVisibility) as Array<
                keyof typeof settings.fieldVisibility
              >
            ).map((field) => (
              <div
                key={field}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-sm font-medium text-text-sec">
                  {fieldLabels[field] || field}
                </span>
                <select
                  value={settings.fieldVisibility[field]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      fieldVisibility: {
                        ...settings.fieldVisibility,
                        [field]: e.target.value as FieldVisibility,
                      },
                    })
                  }
                  className="px-3 py-2 rounded-lg border border-border bg-card text-text text-sm outline-none"
                >
                  {visibilityOptions.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Toggle Settings */}
      <Card className="mb-6">
        <div className="p-5">
          <h3 className="text-[15px] font-bold text-text mb-4">
            Privacy Controls
          </h3>
          <div className="flex flex-col gap-4">
            <ToggleRow
              label="Show Online Status"
              desc="Let others see when you're active"
              checked={settings.showOnlineStatus}
              onChange={(v) =>
                setSettings({ ...settings, showOnlineStatus: v })
              }
            />
            <ToggleRow
              label="Allow Direct Messages"
              desc="Let other members send you messages"
              checked={settings.allowDirectMessages}
              onChange={(v) =>
                setSettings({ ...settings, allowDirectMessages: v })
              }
            />
            <ToggleRow
              label="Show in Member Directory"
              desc="Appear in the community member directory"
              checked={settings.showInDirectory}
              onChange={(v) =>
                setSettings({ ...settings, showInDirectory: v })
              }
            />
          </div>
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

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-text m-0">{label}</p>
        <p className="text-xs text-text-muted m-0">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative h-7 w-12 rounded-full border-none cursor-pointer transition-colors shrink-0"
        style={{
          background: checked ? "var(--teal)" : "var(--border)",
        }}
      >
        <span
          className="absolute top-1 h-5 w-5 rounded-full bg-white transition-all shadow-sm"
          style={{
            left: checked ? 24 : 4,
          }}
        />
      </button>
    </div>
  );
}
