"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
    listRSSFeeds,
    createRSSFeed,
    deleteRSSFeed,
    updateRSSFeed,
} from "@/lib/firestore";
import type { RSSFeed } from "@/lib/types";

export default function AdminFeedsPage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const [feeds, setFeeds] = useState<RSSFeed[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [syncing, setSyncing] = useState<string | null>(null);

    // Form state
    const [feedName, setFeedName] = useState("");
    const [feedUrl, setFeedUrl] = useState("");
    const [employerId, setEmployerId] = useState("");
    const [employerName, setEmployerName] = useState("");

    useEffect(() => {
        if (authLoading) return;

        if (!user || (role !== "admin" && role !== "moderator")) {
            router.push("/");
            return;
        }

        loadFeeds();
    }, [user, role, authLoading, router]);

    async function loadFeeds() {
        try {
            setLoading(true);
            const data = await listRSSFeeds();
            setFeeds(data);
        } catch (error) {
            console.error("Error loading feeds:", error);
        } finally {
            setLoading(false);
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
                syncFrequency: "manual",
            });

            setFeedName("");
            setFeedUrl("");
            setEmployerId("");
            setEmployerName("");
            setShowAddModal(false);
            loadFeeds();
        } catch (error) {
            console.error("Error adding feed:", error);
            alert("Failed to add feed");
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
                    `Success!\n\nImported: ${result.jobsImported} jobs\nSkipped (duplicates): ${result.jobsSkipped}\nTotal in feed: ${result.totalJobsInFeed}${result.errors.length > 0 ? `\n\nWarnings:\n${result.errors.slice(0, 3).join("\n")}` : ""
                    }`
                );
                loadFeeds();
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
            loadFeeds();
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
            loadFeeds();
        } catch (error) {
            console.error("Error deleting feed:", error);
            alert("Failed to delete feed");
        }
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-[#020306] px-4 py-10">
                <div className="mx-auto max-w-7xl">
                    <p className="text-slate-400">Loading feeds...</p>
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
                                RSS Job Feeds
                            </h1>
                            <p className="mt-1 text-sm text-slate-400">
                                Import jobs automatically from employer RSS feeds
                            </p>
                        </div>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#0F9488]"
                        >
                            + Add Feed
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="mx-auto max-w-7xl px-4 py-8">
                {/* Feeds List */}
                {feeds.length === 0 ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
                        <p className="text-slate-400">
                            No RSS feeds configured yet. Add one to start importing jobs automatically.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {feeds.map((feed) => (
                            <div
                                key={feed.id}
                                className="rounded-xl border border-slate-800 bg-slate-900/60 p-6"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-slate-50">{feed.feedName}</h3>
                                            {!feed.active && (
                                                <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-slate-400 break-all">{feed.feedUrl}</p>
                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                                            {feed.employerName && <span>Employer: {feed.employerName}</span>}
                                            {feed.totalJobsImported !== undefined && (
                                                <span>Total imported: {feed.totalJobsImported}</span>
                                            )}
                                            {feed.lastSyncedAt && (
                                                <span>
                                                    Last synced: {new Date(feed.lastSyncedAt.seconds * 1000).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                        {feed.syncErrors && feed.syncErrors.length > 0 && (
                                            <div className="mt-2 text-xs text-red-400">
                                                <details>
                                                    <summary className="cursor-pointer">
                                                        {feed.syncErrors.length} error(s) in last sync
                                                    </summary>
                                                    <ul className="mt-1 list-disc pl-4">
                                                        {feed.syncErrors.slice(0, 3).map((error, idx) => (
                                                            <li key={idx}>{error}</li>
                                                        ))}
                                                    </ul>
                                                </details>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            onClick={() => syncFeed(feed.id)}
                                            disabled={syncing === feed.id || !feed.active}
                                            className="rounded-md bg-[#14B8A6] px-3 py-1 text-sm font-medium text-slate-900 transition hover:bg-[#0F9488] disabled:opacity-50"
                                        >
                                            {syncing === feed.id ? "Syncing..." : "Sync Now"}
                                        </button>
                                        <button
                                            onClick={() => toggleFeedStatus(feed.id, feed.active)}
                                            className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-300 transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
                                        >
                                            {feed.active ? "Deactivate" : "Activate"}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteFeed(feed.id, feed.feedName)}
                                            className="rounded-md border border-red-500/30 px-3 py-1 text-sm text-red-400 transition hover:bg-red-500/10"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Feed Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
                        <h2 className="text-xl font-bold text-slate-50">Add RSS Feed</h2>
                        <form onSubmit={handleAddFeed} className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-200">
                                    Feed Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={feedName}
                                    onChange={(e) => setFeedName(e.target.value)}
                                    placeholder="e.g., SIGA Jobs"
                                    required
                                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-200">
                                    Feed URL <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="url"
                                    value={feedUrl}
                                    onChange={(e) => setFeedUrl(e.target.value)}
                                    placeholder="https://example.com/feed/jobs.xml"
                                    required
                                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-200">
                                    Employer ID <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={employerId}
                                    onChange={(e) => setEmployerId(e.target.value)}
                                    placeholder="Firebase user ID"
                                    required
                                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    The Firebase UID of the employer account
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-200">
                                    Employer Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={employerName}
                                    onChange={(e) => setEmployerName(e.target.value)}
                                    placeholder="e.g., Saskatchewan Indian Gaming Authority"
                                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#0F9488]"
                                >
                                    Add Feed
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
