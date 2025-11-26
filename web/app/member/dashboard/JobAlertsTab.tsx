"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getMemberJobAlerts, deleteJobAlert, updateJobAlert } from "@/lib/firestore";
import type { JobAlert } from "@/lib/types";
import Link from "next/link";

export default function JobAlertsTab() {
    const { user } = useAuth();
    const [alerts, setAlerts] = useState<JobAlert[]>([]);
    const [loading, setLoading] = useState(true);

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

    if (loading) {
        return <div className="text-slate-400">Loading alerts...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Job Alerts</h2>
                <Link
                    href="/jobs"
                    className="rounded-lg bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#16cdb8]"
                >
                    + Create New Alert
                </Link>
            </div>

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
