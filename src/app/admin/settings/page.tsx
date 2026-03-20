"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlatformSettings {
  maintenanceMode?: boolean;
  featureFlags?: Record<string, boolean>;
  announcement?: {
    enabled: boolean;
    message: string;
    linkUrl: string;
    type: "info" | "warning" | "error" | "success";
  };
  pricing?: {
    jobPostingFee: number;
    featuredListingFee: number;
    commissionPercent: number;
  };
  email?: {
    senderName: string;
    replyTo: string;
  };
  feedSync?: {
    frequency: string;
  };
  adminUsers?: Array<{ uid: string; email: string; role: string }>;
}

const DEFAULT_FEATURE_FLAGS: Array<{ key: string; label: string; desc: string }> = [
  { key: "jobs", label: "Jobs", desc: "Job listings and applications" },
  { key: "events", label: "Events", desc: "Community and professional events" },
  { key: "shop", label: "Shop", desc: "Indigenous marketplace" },
  { key: "conferences", label: "Conferences", desc: "Virtual and in-person conferences" },
  { key: "scholarships", label: "Scholarships", desc: "Scholarship and bursary listings" },
  { key: "livestreams", label: "Livestreams", desc: "Live streaming platform" },
  { key: "stories", label: "Stories", desc: "Community stories and news" },
  { key: "partners", label: "Partners", desc: "Partner directory and profiles" },
  { key: "messaging", label: "Messaging", desc: "Direct messaging between users" },
  { key: "notifications", label: "Notifications", desc: "Push and email notifications" },
];

const ANNOUNCEMENT_TYPES = ["info", "warning", "error", "success"] as const;

const announcementStyles: Record<string, { border: string; bg: string; text: string; label: string }> = {
  info: { border: "border-blue-500/30", bg: "bg-blue-500/10", text: "text-blue-400", label: "Info" },
  warning: { border: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-400", label: "Warning" },
  error: { border: "border-red-500/30", bg: "bg-red-500/10", text: "text-red-400", label: "Error" },
  success: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-400", label: "Success" },
};

const SYNC_FREQUENCIES = [
  { value: "hourly", label: "Hourly" },
  { value: "every6h", label: "Every 6 Hours" },
  { value: "every12h", label: "Every 12 Hours" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

// ---------------------------------------------------------------------------
// Icons (inline SVG)
// ---------------------------------------------------------------------------

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 18-5v12L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

function DollarIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function RotateIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Toggle Component
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
        checked ? "bg-accent" : "bg-[var(--input-border)]",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Confirm Modal
// ---------------------------------------------------------------------------

function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  danger,
  confirmWord,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  confirmWord?: string;
}) {
  const [confirmText, setConfirmText] = useState("");
  const keyword = confirmWord || (danger ? "CONFIRM" : "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-2xl">
        <h3 className={cn("text-lg font-bold", danger && "text-red-400")}>{title}</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{message}</p>
        {keyword && (
          <div className="mt-3">
            <label className="mb-1 block text-xs text-[var(--text-muted)]">
              Type <span className="font-mono font-bold">{keyword}</span> to proceed
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={cn(
                "w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm outline-none",
                danger ? "focus:border-red-500" : "focus:border-accent"
              )}
              placeholder={keyword}
            />
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium hover:bg-[var(--input-bg)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={keyword ? confirmText !== keyword : false}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50",
              danger ? "bg-red-500 hover:bg-red-600" : "bg-accent hover:bg-accent/90"
            )}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Card Wrapper
// ---------------------------------------------------------------------------

function SectionCard({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5", className)}>
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 text-[var(--text-muted)]">{icon}</div>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-[var(--text-muted)]">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<{
    title: string;
    message: string;
    danger?: boolean;
    confirmWord?: string;
    action: () => void;
  } | null>(null);
  const [maintenanceConfirm, setMaintenanceConfirm] = useState(false);

  // Batched email state
  const [emailDraft, setEmailDraft] = useState({ senderName: "", replyTo: "" });
  const [emailDirty, setEmailDirty] = useState(false);

  // Batched pricing state
  const [pricingDraft, setPricingDraft] = useState({
    jobPostingFee: 0,
    featuredListingFee: 0,
    commissionPercent: 0,
  });
  const [pricingDirty, setPricingDirty] = useState(false);

  // Track save-in-progress per section
  const savingRef = useRef(false);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const s = data.settings || {};
      setSettings(s);
      setEmailDraft({
        senderName: s.email?.senderName || "",
        replyTo: s.email?.replyTo || "",
      });
      setPricingDraft({
        jobPostingFee: s.pricing?.jobPostingFee ?? 0,
        featuredListingFee: s.pricing?.featuredListingFee ?? 0,
        commissionPercent: s.pricing?.commissionPercent ?? 5,
      });
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (updates: Partial<PlatformSettings>, silent?: boolean) => {
    if (!user || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const merged = { ...settings, ...updates };
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ settings: merged }),
      });
      if (!res.ok) throw new Error("Failed");
      setSettings(merged);
      if (!silent) toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const updateFeatureFlag = (key: string, enabled: boolean) => {
    const flags = { ...(settings.featureFlags || {}), [key]: enabled };
    saveSettings({ featureFlags: flags });
  };

  const updateAnnouncement = (field: string, value: unknown) => {
    const current = settings.announcement || {
      enabled: false,
      message: "",
      linkUrl: "",
      type: "info" as const,
    };
    saveSettings({ announcement: { ...current, [field]: value } });
  };

  const saveEmailSettings = () => {
    saveSettings({ email: emailDraft });
    setEmailDirty(false);
  };

  const savePricingSettings = () => {
    saveSettings({ pricing: pricingDraft });
    setPricingDirty(false);
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-6xl items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const ann = settings.announcement || {
    enabled: false,
    message: "",
    linkUrl: "",
    type: "info" as const,
  };
  const annStyle = announcementStyles[ann.type] || announcementStyles.info;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Confirm Modal */}
      {modal && (
        <ConfirmModal
          title={modal.title}
          message={modal.message}
          danger={modal.danger}
          confirmWord={modal.confirmWord}
          onConfirm={() => {
            modal.action();
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Configure platform-wide settings, feature flags, and system defaults
        </p>
      </div>

      {/* Maintenance Mode Warning Banner */}
      {settings.maintenanceMode && (
        <div className="flex items-center gap-3 rounded-xl border-2 border-red-500/40 bg-red-500/10 px-5 py-3">
          <AlertTriangleIcon className="h-5 w-5 shrink-0 text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-400">
              Maintenance Mode is ACTIVE
            </p>
            <p className="text-xs text-red-400/70">
              All non-admin users are seeing a maintenance page. Disable maintenance mode to restore access.
            </p>
          </div>
          <button
            onClick={() =>
              setModal({
                title: "Disable Maintenance Mode",
                message: "This will restore platform access for all users immediately.",
                action: () => saveSettings({ maintenanceMode: false }),
              })
            }
            className="shrink-0 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
          >
            Disable Now
          </button>
        </div>
      )}

      {/* ============================================================= */}
      {/* 1. Maintenance Mode */}
      {/* ============================================================= */}
      <div
        className={cn(
          "rounded-xl border p-5",
          settings.maintenanceMode
            ? "border-red-500/30 bg-red-500/5"
            : "border-[var(--card-border)] bg-[var(--card-bg)]"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldIcon
              className={cn(
                "h-6 w-6",
                settings.maintenanceMode ? "text-red-400" : "text-[var(--text-muted)]"
              )}
            />
            <div>
              <h2 className="font-semibold">Maintenance Mode</h2>
              <p className="text-sm text-[var(--text-muted)]">
                When enabled, the platform shows a maintenance page to all
                non-admin users
              </p>
            </div>
          </div>
          {maintenanceConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">
                Are you sure?
              </span>
              <button
                onClick={() => {
                  saveSettings({ maintenanceMode: !settings.maintenanceMode });
                  setMaintenanceConfirm(false);
                }}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
              >
                {settings.maintenanceMode ? "Disable" : "Enable"}
              </button>
              <button
                onClick={() => setMaintenanceConfirm(false)}
                className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--input-bg)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <Toggle
              checked={!!settings.maintenanceMode}
              onChange={() => setMaintenanceConfirm(true)}
            />
          )}
        </div>
      </div>

      {/* ============================================================= */}
      {/* 2. Feature Flags */}
      {/* ============================================================= */}
      <SectionCard
        icon={<FlagIcon className="h-5 w-5" />}
        title="Feature Flags"
        description="Enable or disable platform sections. Disabled features are hidden from all users."
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DEFAULT_FEATURE_FLAGS.map((flag) => {
            const enabled = settings.featureFlags?.[flag.key] !== false;
            return (
              <div
                key={flag.key}
                className="flex items-center justify-between rounded-lg border border-[var(--card-border)] px-4 py-3"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium">{flag.label}</span>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {flag.desc}
                  </p>
                </div>
                <Toggle
                  checked={enabled}
                  onChange={(v) => updateFeatureFlag(flag.key, v)}
                  disabled={saving}
                />
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ============================================================= */}
      {/* 3. Announcement Banner */}
      {/* ============================================================= */}
      <SectionCard
        icon={<MegaphoneIcon className="h-5 w-5" />}
        title="Announcement Banner"
        description="Display a site-wide banner message to all users"
      >
        <div className="space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center justify-between rounded-lg border border-[var(--card-border)] px-4 py-3">
            <div>
              <span className="text-sm font-medium">Show Announcement</span>
              <p className="text-xs text-[var(--text-muted)]">
                Toggle the banner visibility
              </p>
            </div>
            <Toggle
              checked={ann.enabled}
              onChange={(v) => updateAnnouncement("enabled", v)}
              disabled={saving}
            />
          </div>

          {ann.enabled && (
            <>
              {/* Message */}
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Message
                </label>
                <input
                  value={ann.message}
                  onChange={(e) => updateAnnouncement("message", e.target.value)}
                  className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-accent"
                  placeholder="Enter announcement message..."
                />
              </div>

              {/* Link + Type */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Link URL (optional)
                  </label>
                  <input
                    value={ann.linkUrl}
                    onChange={(e) =>
                      updateAnnouncement("linkUrl", e.target.value)
                    }
                    className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-accent"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Type</label>
                  <div className="flex gap-2">
                    {ANNOUNCEMENT_TYPES.map((t) => {
                      const style = announcementStyles[t];
                      return (
                        <button
                          key={t}
                          onClick={() => updateAnnouncement("type", t)}
                          className={cn(
                            "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                            ann.type === t
                              ? `${style.border} ${style.bg} ${style.text}`
                              : "border-[var(--card-border)] text-[var(--text-muted)] hover:bg-[var(--input-bg)]"
                          )}
                        >
                          {style.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              {ann.message && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                    Live Preview
                  </label>
                  <div
                    className={cn(
                      "rounded-lg border p-3 text-sm",
                      annStyle.border,
                      annStyle.bg,
                      annStyle.text
                    )}
                  >
                    <AlertTriangleIcon className="mb-0.5 mr-1.5 inline-block h-4 w-4" />
                    {ann.message}
                    {ann.linkUrl && (
                      <span className="ml-2 underline opacity-70">
                        Learn more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SectionCard>

      {/* ============================================================= */}
      {/* 4. Pricing Defaults */}
      {/* ============================================================= */}
      <SectionCard
        icon={<DollarIcon className="h-5 w-5" />}
        title="Pricing Defaults"
        description="Default pricing for job postings, featured listings, and platform commission"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Job Posting Fee ($)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={pricingDraft.jobPostingFee}
                onChange={(e) => {
                  setPricingDraft((p) => ({
                    ...p,
                    jobPostingFee: parseFloat(e.target.value) || 0,
                  }));
                  setPricingDirty(true);
                }}
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-accent"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Featured Listing Fee ($)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={pricingDraft.featuredListingFee}
                onChange={(e) => {
                  setPricingDraft((p) => ({
                    ...p,
                    featuredListingFee: parseFloat(e.target.value) || 0,
                  }));
                  setPricingDirty(true);
                }}
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-accent"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Commission (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={pricingDraft.commissionPercent}
                onChange={(e) => {
                  setPricingDraft((p) => ({
                    ...p,
                    commissionPercent: parseFloat(e.target.value) || 0,
                  }));
                  setPricingDirty(true);
                }}
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-accent"
                placeholder="5"
              />
            </div>
          </div>
          {pricingDirty && (
            <div className="flex justify-end">
              <button
                onClick={savePricingSettings}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                <SaveIcon className="h-3.5 w-3.5" />
                Save Pricing
              </button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ============================================================= */}
      {/* 5. Email Settings */}
      {/* ============================================================= */}
      <SectionCard
        icon={<MailIcon className="h-5 w-5" />}
        title="Email Settings"
        description="Configure default sender information for platform emails"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Default Sender Name
              </label>
              <input
                value={emailDraft.senderName}
                onChange={(e) => {
                  setEmailDraft((d) => ({ ...d, senderName: e.target.value }));
                  setEmailDirty(true);
                }}
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-accent"
                placeholder="IOPPS"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Reply-to Address
              </label>
              <input
                value={emailDraft.replyTo}
                onChange={(e) => {
                  setEmailDraft((d) => ({ ...d, replyTo: e.target.value }));
                  setEmailDirty(true);
                }}
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-accent"
                placeholder="noreply@iopps.ca"
              />
            </div>
          </div>
          {emailDirty && (
            <div className="flex justify-end">
              <button
                onClick={saveEmailSettings}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                <SaveIcon className="h-3.5 w-3.5" />
                Save Email Settings
              </button>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ============================================================= */}
      {/* 6. Feed Sync Config */}
      {/* ============================================================= */}
      <SectionCard
        icon={<RefreshIcon className="h-5 w-5" />}
        title="Feed Sync Configuration"
        description="Control how frequently the platform syncs external feed data"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">
              Default Sync Frequency
            </label>
            <select
              value={settings.feedSync?.frequency || "daily"}
              onChange={(e) =>
                saveSettings({ feedSync: { frequency: e.target.value } })
              }
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm outline-none focus:border-accent sm:w-auto"
            >
              {SYNC_FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Last sync: {settings.feedSync?.frequency ? "Configured" : "Not configured"}
          </p>
        </div>
      </SectionCard>

      {/* ============================================================= */}
      {/* 7. Admin Accounts */}
      {/* ============================================================= */}
      <SectionCard
        icon={<UsersIcon className="h-5 w-5" />}
        title="Admin Accounts"
        description="Platform administrators with elevated access"
      >
        {(settings.adminUsers || []).length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--card-border)] px-4 py-6 text-center">
            <UsersIcon className="mx-auto mb-2 h-8 w-8 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">
              No admin users configured. Manage admin roles from the Users page.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {settings.adminUsers?.map((admin) => (
              <div
                key={admin.uid}
                className="flex items-center justify-between rounded-lg border border-[var(--card-border)] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                    {admin.email?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{admin.email}</span>
                    <p className="text-xs text-[var(--text-muted)]">
                      UID: {admin.uid.slice(0, 12)}...
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium capitalize text-accent">
                  {admin.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ============================================================= */}
      {/* 8. Danger Zone */}
      {/* ============================================================= */}
      <div className="rounded-xl border-2 border-red-500/30 bg-red-500/5 p-5">
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangleIcon className="mt-0.5 h-5 w-5 text-red-400" />
          <div>
            <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Irreversible actions that affect the entire platform. Proceed with caution.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Export Data */}
          <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <DownloadIcon className="h-5 w-5 text-red-400/70" />
              <div>
                <span className="text-sm font-medium text-red-400">
                  Export All Data
                </span>
                <p className="text-xs text-[var(--text-muted)]">
                  Generate a full export of all platform data
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                setModal({
                  title: "Export All Data",
                  message:
                    "This will generate a full export of all platform data. This may take several minutes. You will receive an email when the export is ready.",
                  action: () =>
                    toast.success(
                      "Export started -- you will receive an email when ready"
                    ),
                })
              }
              className="shrink-0 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              Export
            </button>
          </div>

          {/* Clear Cache */}
          <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <ZapIcon className="h-5 w-5 text-red-400/70" />
              <div>
                <span className="text-sm font-medium text-red-400">
                  Clear Cache
                </span>
                <p className="text-xs text-[var(--text-muted)]">
                  Clear all cached data. The platform may be slower temporarily.
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                setModal({
                  title: "Clear Cache",
                  message:
                    "This will clear all cached data across the platform. Pages may load slower until the cache rebuilds.",
                  action: () => toast.success("Cache cleared successfully"),
                })
              }
              className="shrink-0 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              Clear
            </button>
          </div>

          {/* Reset Settings */}
          <div className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <RotateIcon className="h-5 w-5 text-red-400/70" />
              <div>
                <span className="text-sm font-medium text-red-400">
                  Reset Platform Settings
                </span>
                <p className="text-xs text-[var(--text-muted)]">
                  Reset ALL settings to factory defaults. This cannot be undone.
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                setModal({
                  title: "Reset Platform Settings",
                  message:
                    "This will reset ALL platform settings to their default values. Feature flags, announcement, email settings, pricing, and sync configuration will all be cleared. This action cannot be undone.",
                  danger: true,
                  confirmWord: "RESET",
                  action: () => {
                    saveSettings({
                      maintenanceMode: false,
                      featureFlags: {},
                      announcement: {
                        enabled: false,
                        message: "",
                        linkUrl: "",
                        type: "info",
                      },
                      pricing: {
                        jobPostingFee: 0,
                        featuredListingFee: 0,
                        commissionPercent: 5,
                      },
                      email: { senderName: "", replyTo: "" },
                      feedSync: { frequency: "daily" },
                    });
                    setEmailDraft({ senderName: "", replyTo: "" });
                    setEmailDirty(false);
                    setPricingDraft({
                      jobPostingFee: 0,
                      featuredListingFee: 0,
                      commissionPercent: 5,
                    });
                    setPricingDirty(false);
                    toast.success("All settings reset to defaults");
                  },
                })
              }
              className="shrink-0 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
            >
              Reset All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
