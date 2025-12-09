"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { JobPosting } from "@/lib/types";
import { toast } from "react-hot-toast";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const EMPLOYMENT_TYPES = [
    "Full-time",
    "Part-time",
    "Contract",
    "Temporary",
    "Internship",
    "Casual",
];

export default function AdminJobEditPage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const jobId = params.jobId as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [job, setJob] = useState<JobPosting | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        location: "",
        employmentType: "Full-time",
        salaryRange: "",
        remoteFlag: false,
        active: true,
    });

    useEffect(() => {
        if (authLoading) return;

        if (!user || (role !== "admin" && role !== "moderator")) {
            router.push("/");
            return;
        }

        loadJob();
    }, [user, role, authLoading, router, jobId]);

    async function loadJob() {
        try {
            setLoading(true);
            const jobRef = doc(db!, "jobs", jobId);
            const jobSnap = await getDoc(jobRef);

            if (!jobSnap.exists()) {
                toast.error("Job not found");
                router.push("/admin/jobs");
                return;
            }

            const data = jobSnap.data() as JobPosting;
            setJob({ ...data, id: jobSnap.id });
            setFormData({
                title: data.title || "",
                description: data.description || "",
                location: data.location || "",
                employmentType: data.employmentType || "Full-time",
                salaryRange: typeof data.salaryRange === "string" ? data.salaryRange : "",
                remoteFlag: data.remoteFlag || false,
                active: data.active ?? true,
            });
        } catch (error) {
            console.error("Error loading job:", error);
            toast.error("Failed to load job");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!job) return;

        setSaving(true);
        try {
            const jobRef = doc(db!, "jobs", jobId);
            await updateDoc(jobRef, {
                ...formData,
                quickApplyEnabled: true, // Always enable Quick Apply as the only application method
                updatedAt: serverTimestamp(),
            });

            toast.success("Job updated successfully!");
            router.push("/admin/jobs");
        } catch (error) {
            console.error("Error updating job:", error);
            toast.error("Failed to update job");
        } finally {
            setSaving(false);
        }
    }

    if (authLoading || loading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-48 animate-pulse rounded bg-slate-800" />
                <div className="h-96 animate-pulse rounded-xl bg-slate-800" />
            </div>
        );
    }

    if (!user || (role !== "admin" && role !== "moderator") || !job) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <Link
                    href="/admin/jobs"
                    className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#14B8A6]"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Jobs
                </Link>
                <h1 className="mt-4 text-2xl font-bold text-slate-100">Edit Job</h1>
                <p className="mt-1 text-sm text-slate-400">
                    Posted by: {job.employerName}
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-200">
                            Job Title *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={(e) =>
                                setFormData({ ...formData, title: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-200">
                            Description *
                        </label>
                        <textarea
                            required
                            rows={8}
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 focus:border-[#14B8A6] focus:outline-none resize-none"
                        />
                    </div>

                    {/* Location & Type */}
                    <div className="grid gap-6 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-slate-200">
                                Location
                            </label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) =>
                                    setFormData({ ...formData, location: e.target.value })
                                }
                                placeholder="e.g., Toronto, ON"
                                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-200">
                                Employment Type
                            </label>
                            <select
                                value={formData.employmentType}
                                onChange={(e) =>
                                    setFormData({ ...formData, employmentType: e.target.value })
                                }
                                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                            >
                                {EMPLOYMENT_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Salary Range */}
                    <div>
                        <label className="block text-sm font-medium text-slate-200">
                            Salary Range
                        </label>
                        <input
                            type="text"
                            value={formData.salaryRange}
                            onChange={(e) =>
                                setFormData({ ...formData, salaryRange: e.target.value })
                            }
                            placeholder="e.g., $50,000 - $70,000"
                            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                        />
                    </div>

                    {/* Application Method - Quick Apply Only */}
                    <div className="rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/5 p-4">
                        <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-[#14B8A6] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-100 mb-1">Application Method</h3>
                                <p className="text-xs text-slate-300">
                                    All applications are received through IOPPS using the <strong>Quick Apply</strong> button.
                                    Employers can view and manage applications in their dashboard.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Toggles */}
                    <div className="flex flex-wrap gap-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.remoteFlag}
                                onChange={(e) =>
                                    setFormData({ ...formData, remoteFlag: e.target.checked })
                                }
                                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-[#14B8A6] focus:ring-[#14B8A6]"
                            />
                            <span className="text-slate-300">Remote Position</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.active}
                                onChange={(e) =>
                                    setFormData({ ...formData, active: e.target.checked })
                                }
                                className="h-5 w-5 rounded border-slate-600 bg-slate-700 text-[#14B8A6] focus:ring-[#14B8A6]"
                            />
                            <span className="text-slate-300">Active (Visible on site)</span>
                        </label>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => router.push("/admin/jobs")}
                        className="rounded-lg border border-slate-700 px-6 py-3 text-slate-300 transition hover:border-slate-600"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="rounded-lg bg-[#14B8A6] px-8 py-3 font-semibold text-slate-900 transition hover:bg-[#16cdb8] disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}
