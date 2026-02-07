"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  getMemberSettings,
  updatePrivacySettings,
  type MemberSettings,
  type ProfileVisibility,
  type FieldVisibility,
} from "@/lib/firestore/memberSettings";
import {
  Shield,
  Eye,
  Users,
  Globe,
  Lock,
  Search,
  LayoutGrid,
  MessageCircle,
  Activity,
  Calendar,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

const PROFILE_VISIBILITY_OPTIONS: { value: ProfileVisibility; label: string }[] = [
  { value: "public", label: "Public (All IOPPS Members)" },
  { value: "connections", label: "Connections Only" },
  { value: "private", label: "Private" },
];

const FIELD_VISIBILITY_OPTIONS: { value: FieldVisibility; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "connections", label: "Connections" },
  { value: "employers", label: "Employers" },
  { value: "private", label: "Private" },
];

const MESSAGES_FROM_OPTIONS: { value: "everyone" | "connections" | "none"; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "connections", label: "Connections Only" },
  { value: "none", label: "No One" },
];

export default function PrivacySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<MemberSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const memberSettings = await getMemberSettings(user.uid);
        setSettings(memberSettings);
      } catch (error) {
        console.error("Error loading privacy settings:", error);
        toast.error("Failed to load privacy settings");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  const savePrivacy = async (
    updates: Parameters<typeof updatePrivacySettings>[1]
  ) => {
    if (!user) return;

    try {
      setSaving(true);
      await updatePrivacySettings(user.uid, updates);
      toast.success("Setting saved");
    } catch (error) {
      console.error("Error saving privacy settings:", error);
      toast.error("Failed to save setting");
    } finally {
      setSaving(false);
    }
  };

  const handleProfileVisibility = (value: ProfileVisibility) => {
    setSettings((prev) => prev ? { ...prev, profileVisibility: value } : null);
    savePrivacy({ profileVisibility: value });
  };

  const handleToggle = (
    key: "showInTalentSearch" | "showInDirectory" | "allowConnectionRequests" | "showActivityInFeed" | "showEventAttendance"
  ) => {
    if (!settings) return;
    const newValue = !settings[key];
    setSettings((prev) => prev ? { ...prev, [key]: newValue } : null);
    savePrivacy({ [key]: newValue });
  };

  const handleMessagesFrom = (value: "everyone" | "connections" | "none") => {
    setSettings((prev) => prev ? { ...prev, allowMessagesFrom: value } : null);
    savePrivacy({ allowMessagesFrom: value });
  };

  const handleFieldPrivacy = (field: keyof MemberSettings["fieldPrivacy"], value: FieldVisibility) => {
    if (!settings) return;
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            fieldPrivacy: {
              ...prev.fieldPrivacy,
              [field]: value,
            },
          }
        : null
    );
    savePrivacy({ fieldPrivacy: { [field]: value } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto text-amber-400 mb-3" />
        <p className="text-slate-400">Unable to load privacy settings</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* OCAP/CARE Compliance Banner */}
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="flex items-start gap-4">
          <Shield className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-emerald-300">Indigenous Data Sovereignty</h3>
            <p className="mt-1 text-sm text-slate-400">
              IOPPS respects OCAP (Ownership, Control, Access, Possession) and CARE
              (Collective benefit, Authority to control, Responsibility, Ethics) principles.
              You have full control over your data and how it is shared.
            </p>
            <Link
              href="/privacy"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Learn more about our data principles
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Profile Visibility */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Eye className="h-5 w-5 text-emerald-400" />
          Profile Visibility
        </h3>

        {/* Profile Visibility Selector */}
        <div className="flex items-center justify-between py-4 border-b border-slate-800">
          <div>
            <p className="font-medium text-white">Profile Visibility</p>
            <p className="text-sm text-slate-400">Who can view your full profile</p>
          </div>
          <select
            value={settings.profileVisibility}
            onChange={(e) => handleProfileVisibility(e.target.value as ProfileVisibility)}
            disabled={saving}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 focus:border-emerald-500/50 focus:outline-none disabled:opacity-50"
          >
            {PROFILE_VISIBILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Show in Talent Search */}
        <ToggleRow
          icon={<Search className="h-5 w-5 text-slate-400" />}
          label="Show in Talent Search"
          description="Allow employers to find you when searching for candidates"
          enabled={settings.showInTalentSearch}
          onToggle={() => handleToggle("showInTalentSearch")}
          saving={saving}
          border
        />

        {/* Show in Directory */}
        <ToggleRow
          icon={<LayoutGrid className="h-5 w-5 text-slate-400" />}
          label="Show in Member Directory"
          description="Appear in the community member directory"
          enabled={settings.showInDirectory}
          onToggle={() => handleToggle("showInDirectory")}
          saving={saving}
        />
      </div>

      {/* Identity Information */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-emerald-400" />
          Identity Information
        </h3>
        <p className="text-sm text-slate-400 mb-4">
          Control who can see your identity and professional information
        </p>

        <FieldVisibilityRow
          label="Nation / Affiliation"
          description="Your Indigenous nation, territory, or affiliation"
          value={settings.fieldPrivacy.affiliation}
          onChange={(val) => handleFieldPrivacy("affiliation", val)}
          saving={saving}
          border
        />
        <FieldVisibilityRow
          label="Bio"
          description="Your personal bio and tagline"
          value={settings.fieldPrivacy.bio}
          onChange={(val) => handleFieldPrivacy("bio", val)}
          saving={saving}
          border
        />
        <FieldVisibilityRow
          label="Skills"
          description="Your listed skills and competencies"
          value={settings.fieldPrivacy.skills}
          onChange={(val) => handleFieldPrivacy("skills", val)}
          saving={saving}
          border
        />
        <FieldVisibilityRow
          label="Experience"
          description="Your work experience history"
          value={settings.fieldPrivacy.experience}
          onChange={(val) => handleFieldPrivacy("experience", val)}
          saving={saving}
          border
        />
        <FieldVisibilityRow
          label="Education"
          description="Your education and certifications"
          value={settings.fieldPrivacy.education}
          onChange={(val) => handleFieldPrivacy("education", val)}
          saving={saving}
          border
        />
        <FieldVisibilityRow
          label="Portfolio"
          description="Your portfolio items and projects"
          value={settings.fieldPrivacy.portfolio}
          onChange={(val) => handleFieldPrivacy("portfolio", val)}
          saving={saving}
          border
        />
        <FieldVisibilityRow
          label="Resume"
          description="Your uploaded resume or CV"
          value={settings.fieldPrivacy.resume}
          onChange={(val) => handleFieldPrivacy("resume", val)}
          saving={saving}
          border
        />
        <FieldVisibilityRow
          label="Availability"
          description="Your interview availability status"
          value={settings.fieldPrivacy.availability}
          onChange={(val) => handleFieldPrivacy("availability", val)}
          saving={saving}
        />
      </div>

      {/* Contact & Messaging */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-emerald-400" />
          Contact & Messaging
        </h3>

        <FieldVisibilityRow
          label="Email Address"
          description="Your email visibility on your profile"
          value={settings.fieldPrivacy.email}
          onChange={(val) => handleFieldPrivacy("email", val)}
          saving={saving}
          border
        />
        <FieldVisibilityRow
          label="Phone Number"
          description="Your phone number visibility on your profile"
          value={settings.fieldPrivacy.phone}
          onChange={(val) => handleFieldPrivacy("phone", val)}
          saving={saving}
          border
        />

        {/* Allow Connection Requests */}
        <ToggleRow
          icon={<Users className="h-5 w-5 text-slate-400" />}
          label="Allow Connection Requests"
          description="Let other members send you connection requests"
          enabled={settings.allowConnectionRequests}
          onToggle={() => handleToggle("allowConnectionRequests")}
          saving={saving}
          border
        />

        {/* Who Can Message */}
        <div className="flex items-center justify-between py-4">
          <div>
            <p className="font-medium text-white">Who Can Message Me</p>
            <p className="text-sm text-slate-400">Control who can send you direct messages</p>
          </div>
          <select
            value={settings.allowMessagesFrom}
            onChange={(e) => handleMessagesFrom(e.target.value as "everyone" | "connections" | "none")}
            disabled={saving}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 focus:border-emerald-500/50 focus:outline-none disabled:opacity-50"
          >
            {MESSAGES_FROM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-400" />
          Activity
        </h3>

        <ToggleRow
          icon={<Activity className="h-5 w-5 text-slate-400" />}
          label="Show Activity in Community Feed"
          description="Your activity may appear in the community feed"
          enabled={settings.showActivityInFeed}
          onToggle={() => handleToggle("showActivityInFeed")}
          saving={saving}
          border
        />
        <ToggleRow
          icon={<Calendar className="h-5 w-5 text-slate-400" />}
          label="Show Event Attendance"
          description="Let others see which events you're attending"
          enabled={settings.showEventAttendance}
          onToggle={() => handleToggle("showEventAttendance")}
          saving={saving}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  enabled,
  onToggle,
  saving,
  border,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  saving: boolean;
  border?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-4 ${border ? "border-b border-slate-800" : ""}`}>
      <div className="flex items-center gap-3 flex-1">
        {icon}
        <div>
          <p className="font-medium text-white">{label}</p>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={saving}
        className={`relative h-7 w-12 rounded-full transition-colors flex-shrink-0 ${
          enabled ? "bg-emerald-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function FieldVisibilityRow({
  label,
  description,
  value,
  onChange,
  saving,
  border,
}: {
  label: string;
  description: string;
  value: FieldVisibility;
  onChange: (value: FieldVisibility) => void;
  saving: boolean;
  border?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-4 ${border ? "border-b border-slate-800" : ""}`}>
      <div className="flex items-center gap-3 flex-1">
        <Lock className="h-5 w-5 text-slate-400" />
        <div>
          <p className="font-medium text-white">{label}</p>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FieldVisibility)}
        disabled={saving}
        className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 focus:border-emerald-500/50 focus:outline-none disabled:opacity-50"
      >
        {FIELD_VISIBILITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
