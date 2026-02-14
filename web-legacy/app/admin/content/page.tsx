"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
    listContactSubmissions,
    updateContactSubmissionStatus,
} from "@/lib/firestore";
import type { ContactSubmission } from "@/lib/types";
import toast from "react-hot-toast";

export default function AdminContentPage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
    const [filter, setFilter] = useState<"all" | "new" | "read" | "responded">("all");
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;

        if (!user || (role !== "admin" && role !== "moderator")) {
            router.push("/");
            return;
        }

        loadSubmissions();
    }, [user, role, authLoading, router]);

    async function loadSubmissions() {
        try {
            setLoading(true);
            const data = await listContactSubmissions();
            setSubmissions(data);
        } catch (error) {
            console.error("Error loading submissions:", error);
        } finally {
            setLoading(false);
        }
    }

    async function updateStatus(id: string, newStatus: "new" | "read" | "responded") {
        try {
            setProcessing(id);
            await updateContactSubmissionStatus(id, newStatus);
            setSubmissions((prev) =>
                prev.map((sub) =>
                    sub.id === id ? { ...sub, status: newStatus } : sub
                )
            );
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Failed to update status");
        } finally {
            setProcessing(null);
        }
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-background px-4 py-10">
                <div className="mx-auto max-w-7xl">
                    <p className="text-[var(--text-muted)]">Loading content...</p>
                </div>
            </div>
        );
    }

    if (!user || (role !== "admin" && role !== "moderator")) {
        return null;
    }

    const filteredSubmissions = submissions.filter((sub) => {
        if (filter === "all") return true;
        return (sub.status || "new") === filter;
    });

    const newCount = submissions.filter((s) => (s.status || "new") === "new").length;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-[var(--card-border)] bg-surface">
                <div className="mx-auto max-w-7xl px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <Link
                                href="/admin"
                                className="text-sm text-[var(--text-muted)] hover:text-[#14B8A6]"
                            >
                                ← Admin Dashboard
                            </Link>
                            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                                Content Moderation
                            </h1>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">
                                Manage contact submissions and platform content
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="mx-auto max-w-7xl px-4 py-8">
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-foreground">Contact Messages</h2>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Review and manage messages from the contact form.
                    </p>
                </div>

                {/* Filters */}
                <div className="mb-6 flex flex-wrap gap-3">
                    <button
                        onClick={() => setFilter("all")}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "all"
                                ? "bg-accent text-[var(--text-primary)]"
                                : "border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[#14B8A6]"
                            }`}
                    >
                        All ({submissions.length})
                    </button>
                    <button
                        onClick={() => setFilter("new")}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "new"
                                ? "bg-blue-500 text-white"
                                : "border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-blue-500"
                            }`}
                    >
                        New ({newCount})
                    </button>
                    <button
                        onClick={() => setFilter("read")}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "read"
                                ? "bg-slate-700 text-white"
                                : "border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-slate-500"
                            }`}
                    >
                        Read
                    </button>
                    <button
                        onClick={() => setFilter("responded")}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === "responded"
                                ? "bg-green-600 text-white"
                                : "border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-green-600"
                            }`}
                    >
                        Responded
                    </button>
                </div>

                {/* Messages List */}
                <div className="space-y-4">
                    {filteredSubmissions.length === 0 ? (
                        <div className="rounded-2xl border border-[var(--card-border)] bg-slate-900/60 p-12 text-center">
                            <p className="text-[var(--text-muted)]">No messages found.</p>
                        </div>
                    ) : (
                        filteredSubmissions.map((sub) => (
                            <div
                                key={sub.id}
                                className={`rounded-xl border p-6 transition ${(sub.status || "new") === "new"
                                        ? "border-blue-500/30 bg-blue-500/5"
                                        : "border-[var(--card-border)] bg-slate-900/60"
                                    }`}
                            >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-foreground">{sub.subject || "No Subject"}</h3>
                                            {(sub.status || "new") === "new" && (
                                                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                                                    New
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
                                            <span>{sub.name}</span>
                                            <span>&bull;</span>
                                            <a href={`mailto:${sub.email}`} className="hover:text-[#14B8A6]">
                                                {sub.email}
                                            </a>
                                            <span>&bull;</span>
                                            <span>
                                                {sub.createdAt
                                                    ? new Date(sub.createdAt.seconds * 1000).toLocaleString()
                                                    : "Unknown date"}
                                            </span>
                                        </div>
                                        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                                            {sub.message}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 gap-2 sm:flex-col">
                                        {(sub.status || "new") !== "read" && (sub.status || "new") !== "responded" && (
                                            <button
                                                onClick={() => updateStatus(sub.id, "read")}
                                                disabled={processing === sub.id}
                                                className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-surface disabled:opacity-50"
                                            >
                                                Mark as Read
                                            </button>
                                        )}
                                        {(sub.status || "new") !== "responded" && (
                                            <button
                                                onClick={() => updateStatus(sub.id, "responded")}
                                                disabled={processing === sub.id}
                                                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[#12a695] disabled:opacity-50"
                                            >
                                                Mark Responded
                                            </button>
                                        )}
                                        <a
                                            href={`mailto:${sub.email}?subject=Re: ${sub.subject || "IOPPS Inquiry"}`}
                                            className="rounded-md border border-[var(--card-border)] px-3 py-1.5 text-center text-xs font-medium text-[var(--text-secondary)] hover:bg-surface"
                                        >
                                            Reply via Email
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
