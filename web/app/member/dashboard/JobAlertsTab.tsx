"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getMemberJobAlerts, deleteJobAlert, updateJobAlert, createJobAlert } from "@/lib/firestore";
import type { JobAlert, JobAlertFrequency } from "@/lib/types";
import toast from "react-hot-toast";

export default function JobAlertsTab() {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState<JobAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Form state
    const [alertName, setAlertName] = useState("");
    const [keyword, setKeyword] = useState("");
    const [location, setLocation] = useState("");
    const [employmentType, setEmploymentType] = useState("");
    const [remoteOnly, setRemoteOnly] = useState(false);
    const [indigenousOnly, setIndigenousOnly] = useState(false);
    const [frequency, setFrequency] = useState<JobAlertFrequency>("daily");

    useEffect(() => {
        if (!user) return;
        loadAlerts();
    }, [user]);

    const loadAlerts = async () => {
        if (!user) return;
        try {
            const data = await getMemberJobAlerts(user.uid);
            setAlerts(data);
        } catch (error) {
            console.error("Error loading alerts:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this alert?")) return;
        try {
            await deleteJobAlert(id);
            setAlerts(alerts.filter((a) => a.id !== id));
        } catch (error) {
            console.error("Error deleting alert:", error);
        }
    };

    const handleToggle = async (id: string, active: boolean) => {
        try {
            await updateJobAlert(id, { active });
            setAlerts(alerts.map((a) => (a.id === id ? { ...a, active } : a)));
        } catch (error) {
            console.error("Error updating alert:", error);
        }
    };

    const resetForm = () => {
        setAlertName("");
        setKeyword("");
        setLocation("");
        setEmploymentType("");
        setRemoteOnly(false);
        setIndigenousOnly(false);
        setFrequency("daily");
        setShowCreateModal(false);
    };

    const handleCreateAlert = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Validate that at least one filter is set
        if (!keyword && !location && !employmentType && !remoteOnly && !indigenousOnly) {
            toast.error("Please set at least one filter for your job alert.");
            return;
        }

        try {
            setProcessing(true);
            // Build alertData without undefined values (Firestore doesn't accept undefined)
            const alertData: Omit<JobAlert, "id" | "createdAt" | "updatedAt"> = {
                memberId: user.uid,
                frequency,
                active: true,
                ...(alertName && { alertName }),
                ...(keyword && { keyword }),
                ...(location && { location }),
                ...(employmentType && { employmentType }),
                ...(remoteOnly && { remoteOnly }),
                ...(indigenousOnly && { indigenousOnly }),
            };

            const newAlertId = await createJobAlert(alertData);

            // Construct the alert object for local state
            const newAlert: JobAlert = {
                id: newAlertId,
                ...alertData,
                createdAt: null,
                updatedAt: null,
            };

            setAlerts([newAlert, ...alerts]);
            resetForm();
        } catch (error) {
            console.error("Error creating alert:", error);
            toast.error("Failed to create job alert. Please try again.");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return <div className="text-slate-400">Loading alerts...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Job Alerts</h2>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="rounded-lg bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#16cdb8]"
                >
                    + Create New Alert
                </button>
            </div>

            {/* Create Alert Modal */}
            {showCreateModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) resetForm();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") resetForm();
                    }}
                >
                    <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-white">Create Job Alert</h3>
                            <button
                                onClick={resetForm}
                                className="text-slate-400 hover:text-white"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleCreateAlert} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                    Alert Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={alertName}
                                    onChange={(e) => setAlertName(e.target.value)}
                                    placeholder="e.g., Software Developer Jobs"
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                        Keywords
                                    </label>
                                    <input
                                        type="text"
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        placeholder="e.g., developer, analyst"
                                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                        Location
                                    </label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="e.g., Vancouver, BC"
                                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                    Employment Type
                                </label>
                                <select
                                    value={employmentType}
                                    onChange={(e) => setEmploymentType(e.target.value)}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
                                >
                                    <option value="">All Types</option>
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Temporary">Temporary</option>
                                    <option value="Internship">Internship</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={remoteOnly}
                                        onChange={(e) => setRemoteOnly(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6]"
                                    />
                                    Remote/Hybrid jobs only
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={indigenousOnly}
                                        onChange={(e) => setIndigenousOnly(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6]"
                                    />
                                    Indigenous preference jobs only
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                    Alert Frequency
                                </label>
                                <select
                                    value={frequency}
                                    onChange={(e) => setFrequency(e.target.value as JobAlertFrequency)}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
                                >
                                    <option value="instant">Instant (as jobs are posted)</option>
                                    <option value="daily">Daily digest</option>
                                    <option value="weekly">Weekly digest</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 rounded-lg bg-[#14B8A6] px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-[#16cdb8] disabled:opacity-50"
                                >
                                    {processing ? "Creating..." : "Create Alert"}
                                </button>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {alerts.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
                        <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white">No job alerts yet</h3>
                    <p className="mt-2 text-slate-400">
                        Create alerts to get notified when new jobs match your interests.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {alerts.map((alert) => (
                        <div
                            key={alert.id}
                            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-all hover:border-slate-700"
                        >
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-white">
                                        {alert.alertName || (alert.keyword ? `${alert.keyword} Jobs` : "Job Alert")}
                                    </h3>
                                    <span
                                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${alert.active
                                                ? "bg-emerald-500/10 text-emerald-400"
                                                : "bg-slate-700/50 text-slate-400"
                                            }`}
                                    >
                                        {alert.active ? "Active" : "Paused"}
                                    </span>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
                                    {alert.keyword && (
                                        <span>Keywords: <span className="text-slate-300">{alert.keyword}</span></span>
                                    )}
                                    {alert.location && (
                                        <span>Location: <span className="text-slate-300">{alert.location}</span></span>
                                    )}
                                    <span>Frequency: <span className="text-slate-300 capitalize">{alert.frequency}</span></span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => handleToggle(alert.id, !alert.active)}
                                    className={`text-sm font-medium ${alert.active ? "text-amber-400 hover:text-amber-300" : "text-emerald-400 hover:text-emerald-300"
                                        }`}
                                >
                                    {alert.active ? "Pause" : "Resume"}
                                </button>
                                <button
                                    onClick={() => handleDelete(alert.id)}
                                    className="text-sm font-medium text-red-400 hover:text-red-300"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
