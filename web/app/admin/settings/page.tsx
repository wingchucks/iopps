"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
    getPlatformSettings,
    updatePlatformSettings,
} from "@/lib/firestore";
import type { PlatformSettings } from "@/lib/types";

const DEFAULT_SETTINGS: PlatformSettings = {
    maintenanceMode: false,
    announcementBanner: {
        active: false,
        message: "",
        type: "info",
    },
    features: {
        enableStripe: true,
        enableJobPosting: true,
        enableScholarships: true,
    },
};

export default function AdminSettingsPage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);

    useEffect(() => {
        if (authLoading) return;

        if (!user || (role !== "admin" && role !== "moderator")) {
            router.push("/");
            return;
        }

        loadSettings();
    }, [user, role, authLoading, router]);

    async function loadSettings() {
        try {
            setLoading(true);
            const data = await getPlatformSettings();
            if (data) {
                setSettings(data);
            }
        } catch (error) {
            console.error("Error loading settings:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!user) return;

        try {
            setSaving(true);
            await updatePlatformSettings(settings, user.uid);
            alert("Settings saved successfully!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[#020306] px-4 py-10">
                <div className="mx-auto max-w-7xl">
                    <p className="text-slate-400">Loading settings...</p>
                </div>
            </div>
        );
    }

    if (!user || (role !== "admin" && role !== "moderator")) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#020306]">
            {/* Header */}
            <div className="border-b border-slate-800 bg-[#08090C]">
                <div className="mx-auto max-w-7xl px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Link
                                href="/admin"
                                className="text-sm text-slate-400 hover:text-[#14B8A6]"
                            >
                                ← Admin Dashboard
                            </Link>
                            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50">
                                Platform Settings
                            </h1>
                            <p className="mt-1 text-sm text-slate-400">
                                Configure global platform settings and feature flags
                            </p>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="rounded-md bg-[#14B8A6] px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#0F9488] disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
                {/* Maintenance Mode */}
                <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-50">Maintenance Mode</h2>
                            <p className="mt-1 text-sm text-slate-400">
                                Disable the site for non-admin users. Use this during updates.
                            </p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                            <input
                                type="checkbox"
                                checked={settings.maintenanceMode}
                                onChange={(e) =>
                                    setSettings({ ...settings, maintenanceMode: e.target.checked })
                                }
                                className="peer sr-only"
                            />
                            <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#14B8A6] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14B8A6]/30"></div>
                        </label>
                    </div>
                </section>

                {/* Announcement Banner */}
                <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-50">Announcement Banner</h2>
                            <p className="mt-1 text-sm text-slate-400">
                                Display a global banner message at the top of the site.
                            </p>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                            <input
                                type="checkbox"
                                checked={settings.announcementBanner.active}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        announcementBanner: {
                                            ...settings.announcementBanner,
                                            active: e.target.checked,
                                        },
                                    })
                                }
                                className="peer sr-only"
                            />
                            <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#14B8A6] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14B8A6]/30"></div>
                        </label>
                    </div>

                    {settings.announcementBanner.active && (
                        <div className="space-y-4 border-t border-slate-800 pt-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300">
                                    Message
                                </label>
                                <input
                                    type="text"
                                    value={settings.announcementBanner.message}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            announcementBanner: {
                                                ...settings.announcementBanner,
                                                message: e.target.value,
                                            },
                                        })
                                    }
                                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                                    placeholder="e.g., Scheduled maintenance tonight at 10 PM EST."
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300">
                                        Link (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.announcementBanner.link || ""}
                                        onChange={(e) =>
                                            setSettings({
                                                ...settings,
                                                announcementBanner: {
                                                    ...settings.announcementBanner,
                                                    link: e.target.value,
                                                },
                                            })
                                        }
                                        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                                        placeholder="https://..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300">
                                        Type
                                    </label>
                                    <select
                                        value={settings.announcementBanner.type}
                                        onChange={(e) =>
                                            setSettings({
                                                ...settings,
                                                announcementBanner: {
                                                    ...settings.announcementBanner,
                                                    type: e.target.value as any,
                                                },
                                            })
                                        }
                                        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                                    >
                                        <option value="info">Info (Blue)</option>
                                        <option value="warning">Warning (Yellow)</option>
                                        <option value="error">Error (Red)</option>
                                        <option value="success">Success (Green)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* Feature Flags */}
                <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                    <h2 className="text-lg font-semibold text-slate-50 mb-6">Feature Flags</h2>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-medium text-slate-200">Stripe Payments</h3>
                                <p className="mt-1 text-xs text-slate-400">
                                    Enable or disable payment processing for jobs and conferences.
                                </p>
                            </div>
                            <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                    type="checkbox"
                                    checked={settings.features.enableStripe}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            features: {
                                                ...settings.features,
                                                enableStripe: e.target.checked,
                                            },
                                        })
                                    }
                                    className="peer sr-only"
                                />
                                <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#14B8A6] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14B8A6]/30"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-medium text-slate-200">Job Posting</h3>
                                <p className="mt-1 text-xs text-slate-400">
                                    Allow employers to post new jobs.
                                </p>
                            </div>
                            <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                    type="checkbox"
                                    checked={settings.features.enableJobPosting}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            features: {
                                                ...settings.features,
                                                enableJobPosting: e.target.checked,
                                            },
                                        })
                                    }
                                    className="peer sr-only"
                                />
                                <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#14B8A6] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14B8A6]/30"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-medium text-slate-200">Scholarships</h3>
                                <p className="mt-1 text-xs text-slate-400">
                                    Enable the scholarships section.
                                </p>
                            </div>
                            <label className="relative inline-flex cursor-pointer items-center">
                                <input
                                    type="checkbox"
                                    checked={settings.features.enableScholarships}
                                    onChange={(e) =>
                                        setSettings({
                                            ...settings,
                                            features: {
                                                ...settings.features,
                                                enableScholarships: e.target.checked,
                                            },
                                        })
                                    }
                                    className="peer sr-only"
                                />
                                <div className="peer h-6 w-11 rounded-full bg-slate-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#14B8A6] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#14B8A6]/30"></div>
                            </label>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
