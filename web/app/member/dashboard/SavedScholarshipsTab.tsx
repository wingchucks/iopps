"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { getMemberProfile, upsertMemberProfile as updateMemberProfile } from "@/lib/firestore";
import { getScholarshipsByIds } from "@/lib/firestore/scholarships";
import type { Scholarship } from "@/lib/types";
import { toast } from "react-hot-toast";

type StatusFilter = "all" | "active" | "expired";

export default function SavedScholarshipsTab() {
    const { user } = useAuth();
    const [savedScholarships, setSavedScholarships] = useState<Scholarship[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [keyword, setKeyword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [listLoading, setListLoading] = useState(true);

    // Fetch saved scholarships
    useEffect(() => {
        if (!user) return;
        (async () => {
            try {
                setError(null);
                // 1. Get profile to find saved IDs
                const profile = await getMemberProfile(user.uid);
                if (profile?.savedScholarshipIds?.length) {
                    // 2. Fetch scholarships by ID
                    const data = await getScholarshipsByIds(profile.savedScholarshipIds);
                    setSavedScholarships(data);
                } else {
                    setSavedScholarships([]);
                }
            } catch (err) {
                console.error(err);
                setError("Unable to load saved scholarships right now.");
            } finally {
                setListLoading(false);
            }
        })();
    }, [user]);

    const handleUnsave = async (scholarshipId: string) => {
        if (!user) return;
        try {
            const profile = await getMemberProfile(user.uid);
            if (!profile) return;

            const newSavedIds = (profile.savedScholarshipIds || []).filter(id => id !== scholarshipId);

            await updateMemberProfile(user.uid, {
                savedScholarshipIds: newSavedIds
            });

            // Update local state
            setSavedScholarships(prev => prev.filter(s => s.id !== scholarshipId));
            toast.success("Scholarship removed from saved items");
        } catch (err) {
            console.error("Failed to unsave scholarship:", err);
            toast.error("Failed to remove scholarship");
        }
    };

    const filteredScholarships = useMemo(() => {
        return savedScholarships.filter((scholarship) => {
            // Filter by status
            if (statusFilter === "active" && scholarship.active === false) return false;
            // Simple expiry check (if implemented in types consistently, otherwise rely on active flag or deadline)
            // For now, assuming active flag is main indicator.

            // Filter by keyword
            if (
                keyword &&
                !`${scholarship.title} ${scholarship.providerName || ''}`
                    .toLowerCase()
                    .includes(keyword.toLowerCase())
            ) {
                return false;
            }
            return true;
        });
    }, [keyword, savedScholarships, statusFilter]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
                <h2 className="text-2xl font-bold text-white">Saved Scholarships</h2>
                <p className="mt-2 text-slate-400">
                    Track funding opportunities you're interested in. Applications are managed separately.
                </p>
            </div>

            {/* Stats */}
            <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Total Saved
                    </p>
                    <h3 className="mt-2 text-3xl font-semibold text-white">
                        {savedScholarships.length}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                        {savedScholarships.filter(s => s.active !== false).length} active opportunities
                    </p>
                </div>
                <div className="rounded-3xl bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-teal-500/10 p-8 shadow-xl shadow-blue-900/20">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Quick Actions
                    </p>
                    <div className="mt-3 flex flex-col gap-2">
                        <Link
                            href="/education/scholarships"
                            className="rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-4 py-2 text-sm font-semibold text-emerald-400 transition-all hover:from-emerald-500/30 hover:to-teal-500/30"
                        >
                            Browse Scholarships →
                        </Link>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                        Search
                    </label>
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="Search saved scholarships..."
                        className="w-full rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 placeholder-slate-500 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                        Status
                    </label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="rounded-xl border border-emerald-500/20 bg-slate-900/50 px-4 py-3 text-slate-100 transition-all focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                        <option value="all">All</option>
                        <option value="active">Active only</option>
                        <option value="expired">Expired</option>
                    </select>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                    {error}
                </div>
            )}

            {/* List */}
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 p-8 shadow-xl shadow-emerald-900/20">
                {listLoading ? (
                    <p className="text-center text-slate-400">Loading saved items...</p>
                ) : filteredScholarships.length === 0 ? (
                    <div className="rounded-xl bg-slate-900/50 p-8 text-center">
                        <p className="text-slate-300">
                            {savedScholarships.length === 0
                                ? "You haven't saved any scholarships yet."
                                : "No scholarships match your filters."}
                        </p>
                        <Link
                            href="/education/scholarships"
                            className="mt-4 inline-block rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/50"
                        >
                            Find Funding
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredScholarships.map((scholarship) => (
                            <article
                                key={scholarship.id}
                                className="rounded-xl border border-emerald-500/20 bg-slate-900/50 p-6"
                            >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex-1">
                                        <Link
                                            href={`/education/scholarships/${scholarship.id}`}
                                            className="text-lg font-semibold text-white transition-colors hover:text-emerald-400"
                                        >
                                            {scholarship.title}
                                        </Link>
                                        <p className="mt-1 text-sm text-emerald-400">
                                            {scholarship.providerName || "Scholarship Provider"}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                                            Amount: {scholarship.amount || "Varies"}
                                        </span>
                                        <button
                                            onClick={() => handleUnsave(scholarship.id)}
                                            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            Unsave
                                        </button>
                                    </div>
                                </div>

                                {scholarship.description && (
                                    <p className="mt-3 text-sm text-slate-300">
                                        {scholarship.description.slice(0, 180)}
                                        {scholarship.description.length > 180 ? "..." : ""}
                                    </p>
                                )}

                                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                                    {scholarship.deadline && (
                                        <span className="flex items-center gap-1">
                                            Deadline: {new Date(
                                                typeof scholarship.deadline === 'string'
                                                    ? scholarship.deadline
                                                    : (scholarship.deadline as any).toDate()
                                            ).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-4 flex gap-3">
                                    <Link
                                        href={`/education/scholarships/${scholarship.id}`}
                                        className="text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
                                    >
                                        View details →
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
