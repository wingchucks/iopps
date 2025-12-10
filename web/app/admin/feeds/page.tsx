"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
    listRSSFeeds,
    createRSSFeed,
    deleteRSSFeed,
    updateRSSFeed,
    listEmployers,
} from "@/lib/firestore";
import type { RSSFeed, EmployerProfile } from "@/lib/types";
import FeedForm from "./FeedForm";

export default function AdminFeedsPage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const [feeds, setFeeds] = useState<RSSFeed[]>([]);
    const [employers, setEmployers] = useState<EmployerProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingFeed, setEditingFeed] = useState<RSSFeed | null>(null);
    const [syncing, setSyncing] = useState<string | null>(null);

    // Form state
    const [feedName, setFeedName] = useState("");
    const [feedUrl, setFeedUrl] = useState("");
    const [employerId, setEmployerId] = useState("");
    const [employerName, setEmployerName] = useState("");
    const [syncFrequency, setSyncFrequency] = useState<"manual" | "hourly" | "daily" | "weekly">("manual");
    // New SmartJobBoard-like fields
    const [jobExpirationDays, setJobExpirationDays] = useState<number>(30);
    const [utmTrackingTag, setUtmTrackingTag] = useState("");
    const [noIndexByGoogle, setNoIndexByGoogle] = useState(false);
    const [updateExistingJobs, setUpdateExistingJobs] = useState(false);
    const [jobExpirationType, setJobExpirationType] = useState<"days" | "feed" | "never">("feed");

    useEffect(() => {
        if (authLoading) return;

        if (!user || (role !== "admin" && role !== "moderator")) {
            router.push("/");
            return;
        }

        loadData();
    }, [user, role, authLoading, router]);

    async function loadData() {
        try {
            setLoading(true);
            const [feedsData, employersData] = await Promise.all([
                listRSSFeeds(),
                listEmployers("approved"),
            ]);
            setFeeds(feedsData);
            setEmployers(employersData);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    }

    function resetForm() {
        setFeedName("");
        setFeedUrl("");
        setEmployerId("");
        setEmployerName("");
        setSyncFrequency("manual");
        setJobExpirationType("feed");
        setJobExpirationDays(30);
        setUtmTrackingTag("");
        setNoIndexByGoogle(false);
        setUpdateExistingJobs(false);
    }

    function openAddModal() {
        resetForm();
        setShowAddModal(true);
    }

    function openEditModal(feed: RSSFeed) {
        setEditingFeed(feed);
        setFeedName(feed.feedName);
        setFeedUrl(feed.feedUrl);
        setEmployerId(feed.employerId);
        setEmployerName(feed.employerName || "");
        setSyncFrequency(feed.syncFrequency);
        setJobExpirationType(feed.jobExpiration?.type || "feed");
        setJobExpirationDays(feed.jobExpiration?.daysAfterImport || 30);
        setUtmTrackingTag(feed.utmTrackingTag || "");
        setNoIndexByGoogle(feed.noIndexByGoogle || false);
        setUpdateExistingJobs(feed.updateExistingJobs || false);
        setShowEditModal(true);
    }

    function handleEmployerSelect(id: string) {
        setEmployerId(id);
        const employer = employers.find(e => e.userId === id || e.id === id);
        if (employer) {
            setEmployerName(employer.organizationName);
        }
    }

    async function handleAddFeed(e: React.FormEvent) {
        e.preventDefault();
        if (!feedName || !feedUrl || !employerId) {
            alert("Please fill in all required fields");
            return;
        }

        try {
            await createRSSFeed({
                feedName,
                feedUrl,
                employerId,
                employerName: employerName || undefined,
                active: true,
                syncFrequency,
                jobExpiration: {
                    type: jobExpirationType,
                    ...(jobExpirationType === "days" && { daysAfterImport: jobExpirationDays }),
                },
                utmTrackingTag: utmTrackingTag || undefined,
                noIndexByGoogle,
                updateExistingJobs,
            });

            resetForm();
            setShowAddModal(false);
            loadData();
        } catch (error) {
            console.error("Error adding feed:", error);
            alert("Failed to add feed");
        }
    }

    async function handleUpdateFeed(e: React.FormEvent) {
        e.preventDefault();
        if (!editingFeed || !feedName || !feedUrl || !employerId) {
            alert("Please fill in all required fields");
            return;
        }

        try {
            await updateRSSFeed(editingFeed.id, {
                feedName,
                feedUrl,
                employerId,
                employerName: employerName || undefined,
                syncFrequency,
                jobExpiration: {
                    type: jobExpirationType,
                    ...(jobExpirationType === "days" && { daysAfterImport: jobExpirationDays }),
                },
                utmTrackingTag: utmTrackingTag || undefined,
                noIndexByGoogle,
                updateExistingJobs,
            });

            resetForm();
            setEditingFeed(null);
            setShowEditModal(false);
            loadData();
        } catch (error) {
            console.error("Error updating feed:", error);
            alert("Failed to update feed");
        }
    }

    async function syncFeed(feedId: string) {
        if (!user) return;
        setSyncing(feedId);

        try {
            const token = await user.getIdToken();
            const response = await fetch("/api/jobs/scrape", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ feedId }),
            });

            const result = await response.json();
            if (response.ok) {
                alert(
                    `Success!\n\nImported: ${result.jobsImported} jobs\nUpdated: ${result.jobsUpdated || 0} jobs\nSkipped (duplicates): ${result.jobsSkipped}\nTotal in feed: ${result.totalJobsInFeed}${result.errors.length > 0 ? `\n\nWarnings:\n${result.errors.slice(0, 3).join("\n")}` : ""
                    }`
                );
                loadData();
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error("Sync error:", error);
            alert("Failed to sync feed");
        } finally {
            setSyncing(null);
        }
    }

    async function toggleFeedStatus(feedId: string, currentStatus: boolean) {
        try {
            await updateRSSFeed(feedId, { active: !currentStatus });
            loadData();
        } catch (error) {
            console.error("Error toggling feed:", error);
            alert("Failed to update feed status");
        }
    }

    async function handleDeleteFeed(feedId: string, feedName: string) {
        if (!confirm(`Are you sure you want to delete the feed "${feedName}"?`)) {
            return;
        }

        try {
            await deleteRSSFeed(feedId);
            loadData();
        } catch (error) {
            console.error("Error deleting feed:", error);
            alert("Failed to delete feed");
        }
    }

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <p className="text-slate-400">Loading feeds...</p>
            </div>
        );
    }

    if (!user || (role !== "admin" && role !== "moderator")) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Job Auto Import</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Import jobs automatically from XML/JSON feed or employer ATS.
                    </p>
                </div>
                <button
                    onClick={openAddModal}
                    className="rounded-lg bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#0F9488]"
                >
                    Add new auto import
                </button>
            </div>

            {/* Feeds Table */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                {feeds.length === 0 ? (
                    <div className="p-12 text-center">
                        <svg className="mx-auto h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                        <p className="mt-4 text-slate-400">
                            No auto imports configured yet. Add one to start importing jobs automatically.
                        </p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800 text-left text-sm text-slate-400">
                                <th className="px-6 py-4 font-medium">Name</th>
                                <th className="px-6 py-4 font-medium">Employer</th>
                                <th className="px-6 py-4 font-medium">Last Import</th>
                                <th className="px-6 py-4 font-medium">Jobs</th>
                                <th className="px-6 py-4 font-medium">Settings</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {feeds.map((feed) => (
                                <tr key={feed.id} className="text-sm hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-100">{feed.feedName}</div>
                                        <div className="text-xs text-slate-500 truncate max-w-[200px]" title={feed.feedUrl}>
                                            {feed.feedUrl}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-300">
                                        {feed.employerName || feed.employerId}
                                    </td>
                                    <td className="px-6 py-4 text-slate-300">
                                        {feed.lastSyncedAt ? (
                                            new Date(feed.lastSyncedAt.seconds * 1000).toLocaleString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })
                                        ) : (
                                            <span className="text-slate-500">Never</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-300">
                                        {feed.totalJobsImported ?? 0}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {feed.updateExistingJobs && (
                                                <span className="inline-flex items-center rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400">
                                                    Updates
                                                </span>
                                            )}
                                            {feed.noIndexByGoogle && (
                                                <span className="inline-flex items-center rounded bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
                                                    NoIndex
                                                </span>
                                            )}
                                            {feed.utmTrackingTag && (
                                                <span className="inline-flex items-center rounded bg-purple-500/20 px-1.5 py-0.5 text-xs text-purple-400">
                                                    UTM
                                                </span>
                                            )}
                                            {feed.jobExpiration?.type === "days" && (
                                                <span className="inline-flex items-center rounded bg-slate-500/20 px-1.5 py-0.5 text-xs text-slate-400">
                                                    {feed.jobExpiration.daysAfterImport}d
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {feed.active ? (
                                            <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                                                Inactive
                                            </span>
                                        )}
                                        {feed.syncErrors && feed.syncErrors.length > 0 && (
                                            <span className="ml-2 text-xs text-amber-400" title={feed.syncErrors.join("\n")}>
                                                ({feed.syncErrors.length} warnings)
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => syncFeed(feed.id)}
                                                disabled={syncing === feed.id || !feed.active}
                                                className="rounded-md bg-[#14B8A6] px-3 py-1.5 text-xs font-medium text-slate-900 transition hover:bg-[#0F9488] disabled:opacity-50"
                                                title="Import jobs now"
                                            >
                                                {syncing === feed.id ? "Importing..." : "Import"}
                                            </button>
                                            <button
                                                onClick={() => openEditModal(feed)}
                                                className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
                                                title="Edit"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => toggleFeedStatus(feed.id, feed.active)}
                                                className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
                                                title={feed.active ? "Deactivate" : "Activate"}
                                            >
                                                {feed.active ? "Pause" : "Resume"}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteFeed(feed.id, feed.feedName)}
                                                className="rounded-md p-1.5 text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
                                                title="Delete"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add Feed Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6">
                        <h2 className="text-xl font-bold text-slate-50">Add New Auto Import</h2>
                        <p className="mt-1 text-sm text-slate-400">Connect an XML/JSON job feed to automatically import jobs.</p>
                        <form onSubmit={handleAddFeed} className="mt-6">
                            <FeedForm
                                feedUrl={feedUrl}
                                setFeedUrl={setFeedUrl}
                                feedName={feedName}
                                setFeedName={setFeedName}
                                employerId={employerId}
                                handleEmployerSelect={handleEmployerSelect}
                                employers={employers}
                                employerName={employerName}
                                setEmployerName={setEmployerName}
                                jobExpirationType={jobExpirationType}
                                setJobExpirationType={setJobExpirationType}
                                jobExpirationDays={jobExpirationDays}
                                setJobExpirationDays={setJobExpirationDays}
                                syncFrequency={syncFrequency}
                                setSyncFrequency={setSyncFrequency}
                                utmTrackingTag={utmTrackingTag}
                                setUtmTrackingTag={setUtmTrackingTag}
                                noIndexByGoogle={noIndexByGoogle}
                                setNoIndexByGoogle={setNoIndexByGoogle}
                                updateExistingJobs={updateExistingJobs}
                                setUpdateExistingJobs={setUpdateExistingJobs}
                            />
                            <div className="flex gap-3 pt-6 border-t border-slate-800 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#0F9488]"
                                >
                                    Add Import
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Feed Modal */}
            {showEditModal && editingFeed && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6">
                        <h2 className="text-xl font-bold text-slate-50">Edit Auto Import</h2>
                        <p className="mt-1 text-sm text-slate-400">Update the feed configuration for &ldquo;{editingFeed.feedName}&rdquo;</p>
                        <form onSubmit={handleUpdateFeed} className="mt-6">
                            <FeedForm
                                feedUrl={feedUrl}
                                setFeedUrl={setFeedUrl}
                                feedName={feedName}
                                setFeedName={setFeedName}
                                employerId={employerId}
                                handleEmployerSelect={handleEmployerSelect}
                                employers={employers}
                                employerName={employerName}
                                setEmployerName={setEmployerName}
                                jobExpirationType={jobExpirationType}
                                setJobExpirationType={setJobExpirationType}
                                jobExpirationDays={jobExpirationDays}
                                setJobExpirationDays={setJobExpirationDays}
                                syncFrequency={syncFrequency}
                                setSyncFrequency={setSyncFrequency}
                                utmTrackingTag={utmTrackingTag}
                                setUtmTrackingTag={setUtmTrackingTag}
                                noIndexByGoogle={noIndexByGoogle}
                                setNoIndexByGoogle={setNoIndexByGoogle}
                                updateExistingJobs={updateExistingJobs}
                                setUpdateExistingJobs={setUpdateExistingJobs}
                            />
                            <div className="flex gap-3 pt-6 border-t border-slate-800 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingFeed(null);
                                        resetForm();
                                    }}
                                    className="flex-1 rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#0F9488]"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
