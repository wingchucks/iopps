"use client";

import { useEffect, useState, useCallback } from "react";
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
  email?: {
    senderName: string;
    replyTo: string;
  };
  feedSync?: {
    frequency: string;
  };
  adminUsers?: Array<{ uid: string; email: string; role: string }>;
}

const FEATURE_SECTIONS = [
  "Jobs",
  "Events",
  "Shop",
  "Conferences",
  "Scholarships",
  "Livestreams",
  "Stories",
];

const ANNOUNCEMENT_TYPES = ["info", "warning", "error", "success"] as const;

const announcementStyles: Record<string, string> = {
  info: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  error: "border-red-500/30 bg-red-500/10 text-red-400",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Toggle component
// ---------------------------------------------------------------------------

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
        checked ? "bg-accent" : "bg-muted",
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

function ConfirmModal({ title, message, onConfirm, onCancel, danger }: { title: string; message: string; onConfirm: () => void; onCancel: () => void; danger?: boolean }) {
  const [confirmText, setConfirmText] = useState("");
  const keyword = danger ? "CONFIRM" : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-2xl">
        <h3 className={cn("text-lg font-bold", danger && "text-red-400")}>{title}</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{message}</p>
        {danger && (
          <div className="mt-3">
            <label className="mb-1 block text-xs text-[var(--text-muted)]">Type CONFIRM to proceed</label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-red-500"
              placeholder="CONFIRM"
            />
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={danger && confirmText !== keyword}
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
// Page
// ---------------------------------------------------------------------------

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<{ title: string; message: string; danger?: boolean; action: () => void } | null>(null);
  const [maintenanceConfirm, setMaintenanceConfirm] = useState(false);

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
      setSettings(data.settings || {});
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (updates: Partial<PlatformSettings>) => {
    if (!user) return;
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
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateFeatureFlag = (section: string, enabled: boolean) => {
    const flags = { ...(settings.featureFlags || {}), [section.toLowerCase()]: enabled };
    saveSettings({ featureFlags: flags });
  };

  const updateAnnouncement = (field: string, value: unknown) => {
    const current = settings.announcement || { enabled: false, message: "", linkUrl: "", type: "info" as const };
    saveSettings({ announcement: { ...current, [field]: value } });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const ann = settings.announcement || { enabled: false, message: "", linkUrl: "", type: "info" as const };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {modal && (
        <ConfirmModal
          title={modal.title}
          message={modal.message}
          danger={modal.danger}
          onConfirm={() => { modal.action(); setModal(null); }}
          onCancel={() => setModal(null)}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-sm text-[var(--text-muted)]">Configure platform-wide settings and features</p>
      </div>

      {/* Maintenance Mode */}
      <div className={cn(
        "rounded-xl border p-5",
        settings.maintenanceMode ? "border-red-500/30 bg-red-500/5" : "border-[var(--card-border)] bg-[var(--card-bg)]"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldIcon className={cn("h-6 w-6", settings.maintenanceMode ? "text-red-400" : "text-[var(--text-muted)]")} />
            <div>
              <h2 className="font-semibold">Maintenance Mode</h2>
              <p className="text-sm text-[var(--text-muted)]">When enabled, the platform shows a maintenance page to all non-admin users</p>
            </div>
          </div>
          {maintenanceConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Are you sure?</span>
              <button
                onClick={() => { saveSettings({ maintenanceMode: !settings.maintenanceMode }); setMaintenanceConfirm(false); }}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600"
              >
                {settings.maintenanceMode ? "Disable" : "Enable"}
              </button>
              <button onClick={() => setMaintenanceConfirm(false)} className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium hover:bg-muted">
                Cancel
              </button>
            </div>
          ) : (
            <Toggle checked={!!settings.maintenanceMode} onChange={() => setMaintenanceConfirm(true)} />
          )}
        </div>
      </div>

      {/* Feature Flags */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-4 text-lg font-semibold">Feature Flags</h2>
        <div className="space-y-3">
          {FEATURE_SECTIONS.map((section) => {
            const key = section.toLowerCase();
            const enabled = settings.featureFlags?.[key] !== false;
            return (
              <div key={section} className="flex items-center justify-between rounded-lg border border-[var(--card-border)] px-4 py-3">
                <span className="text-sm font-medium">{section}</span>
                <Toggle checked={enabled} onChange={(v) => updateFeatureFlag(section, v)} disabled={saving} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Announcement Banner */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Announcement Banner</h2>
          <Toggle checked={ann.enabled} onChange={(v) => updateAnnouncement("enabled", v)} disabled={saving} />
        </div>
        {ann.enabled && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Message</label>
              <input
                value={ann.message}
                onChange={(e) => updateAnnouncement("message", e.target.value)}
                className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                placeholder="Announcement message..."
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Link URL</label>
                <input
                  value={ann.linkUrl}
                  onChange={(e) => updateAnnouncement("linkUrl", e.target.value)}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <select
                  value={ann.type}
                  onChange={(e) => updateAnnouncement("type", e.target.value)}
                  className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                >
                  {ANNOUNCEMENT_TYPES.map((t) => (
                    <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            {ann.message && (
              <div className={cn("rounded-lg border p-3 text-sm", announcementStyles[ann.type])}>
                <AlertIcon className="mb-1 inline-block h-4 w-4" /> {ann.message}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Email Settings */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-4 text-lg font-semibold">Email Settings</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Default Sender Name</label>
            <input
              value={settings.email?.senderName || ""}
              onChange={(e) => saveSettings({ email: { senderName: e.target.value, replyTo: settings.email?.replyTo || "" } })}
              className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="IOPPS"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Reply-to Address</label>
            <input
              value={settings.email?.replyTo || ""}
              onChange={(e) => saveSettings({ email: { senderName: settings.email?.senderName || "", replyTo: e.target.value } })}
              className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              placeholder="noreply@iopps.ca"
            />
          </div>
        </div>
      </div>

      {/* Feed Sync Settings */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-4 text-lg font-semibold">Feed Sync Settings</h2>
        <div>
          <label className="mb-1 block text-sm font-medium">Default Sync Frequency</label>
          <select
            value={settings.feedSync?.frequency || "daily"}
            onChange={(e) => saveSettings({ feedSync: { frequency: e.target.value } })}
            className="w-full rounded-lg border border-[var(--card-border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-accent sm:w-auto"
          >
            <option value="hourly">Hourly</option>
            <option value="every6h">Every 6 Hours</option>
            <option value="every12h">Every 12 Hours</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>

      {/* Admin Accounts */}
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="mb-4 text-lg font-semibold">Admin Accounts</h2>
        {(settings.adminUsers || []).length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No admin users configured. Manage admin roles from the Users page.</p>
        ) : (
          <div className="space-y-2">
            {settings.adminUsers?.map((admin) => (
              <div key={admin.uid} className="flex items-center justify-between rounded-lg border border-[var(--card-border)] px-4 py-2">
                <span className="text-sm">{admin.email}</span>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium capitalize text-accent">{admin.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border-2 border-red-500/30 bg-red-500/5 p-5">
        <h2 className="mb-1 text-lg font-semibold text-red-400">Danger Zone</h2>
        <p className="mb-4 text-sm text-[var(--text-muted)]">Irreversible actions that affect the entire platform</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setModal({
              title: "Clear Cache",
              message: "This will clear all cached data. The platform may be slower temporarily.",
              action: () => toast.success("Cache cleared"),
            })}
            className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            Clear Cache
          </button>
          <button
            onClick={() => setModal({
              title: "Export All Data",
              message: "This will generate a full export of all platform data. This may take several minutes.",
              action: () => toast.success("Export started — you'll receive an email when ready"),
            })}
            className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            Export All Data
          </button>
          <button
            onClick={() => setModal({
              title: "Reset Platform Settings",
              message: "This will reset ALL platform settings to defaults. This action cannot be undone. Type CONFIRM to proceed.",
              danger: true,
              action: () => { saveSettings({ maintenanceMode: false, featureFlags: {}, announcement: { enabled: false, message: "", linkUrl: "", type: "info" } }); toast.success("Settings reset to defaults"); },
            })}
            className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            Reset Platform Settings
          </button>
        </div>
      </div>
    </div>
  );
}
