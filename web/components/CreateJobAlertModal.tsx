"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import { createJobAlert } from "@/lib/firestore";
import type { JobAlertFrequency } from "@/lib/types";

interface CreateJobAlertModalProps {
    initialKeywords?: string;
    initialLocation?: string;
    onClose: () => void;
}

export default function CreateJobAlertModal({
    initialKeywords = "",
    initialLocation = "",
    onClose,
}: CreateJobAlertModalProps) {
    const { user } = useAuth();
    const [alertName, setAlertName] = useState(
        initialKeywords ? `${initialKeywords} Jobs` : "New Job Alert"
    );
    const [keyword, setKeyword] = useState(initialKeywords);
    const [location, setLocation] = useState(initialLocation);
    const [frequency, setFrequency] = useState<JobAlertFrequency>("daily");
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        try {
            await createJobAlert({
                memberId: user.uid,
                alertName,
                keyword,
                location,
                frequency,
                active: true,
            });
            toast.success("Job alert created! You'll receive notifications based on your settings.");
            onClose();
        } catch (error) {
            console.error("Error creating alert:", error);
            toast.error("Failed to create alert. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--card-border)] bg-surface p-6 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-foreground">Create Job Alert</h2>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-foreground">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                            Alert Name
                        </label>
                        <input
                            type="text"
                            required
                            value={alertName}
                            onChange={(e) => setAlertName(e.target.value)}
                            className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                            Keywords
                        </label>
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="e.g. Developer, Manager"
                            className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                            Location
                        </label>
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g. Toronto, Remote"
                            className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-[var(--text-secondary)]">
                            Frequency
                        </label>
                        <select
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value as JobAlertFrequency)}
                            className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-3 py-2 text-foreground focus:border-accent focus:outline-none"
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="instant">Instant</option>
                        </select>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full rounded-lg bg-accent px-4 py-2 font-semibold text-slate-900 hover:bg-accent-hover disabled:opacity-50"
                        >
                            {saving ? "Creating..." : "Create Alert"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
