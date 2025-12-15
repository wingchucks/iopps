"use client";

import { useAuth } from "@/components/AuthProvider";
import { PageShell } from "@/components/PageShell";
import {
    getMemberLearning,
    listSavedJobIds,
    listJobPostings,
    listMemberApplications,
} from "@/lib/firestore";
import type {
    MemberLearning,
    JobPosting,
    JobApplication
} from "@/lib/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
    AcademicCapIcon,
    BriefcaseIcon,
    BookmarkIcon,
    ChevronRightIcon
} from "@heroicons/react/24/outline";

// Local extended type for UI display
type EnrichedJobApplication = JobApplication & {
    jobTitle?: string;
    employerName?: string;
    appliedAt?: any;
};

export default function CareerDashboard() {
    const { user, role } = useAuth();
    const [learning, setLearning] = useState<MemberLearning[]>([]);
    const [applications, setApplications] = useState<EnrichedJobApplication[]>([]);
    const [savedJobs, setSavedJobs] = useState<JobPosting[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            if (!user || role !== "community") return;

            try {
                setLoading(true);
                // Parallel data fetching
                const [learningData, appsData, savedIds] = await Promise.all([
                    getMemberLearning(user.uid),
                    listMemberApplications(user.uid),
                    listSavedJobIds(user.uid)
                ]);

                setLearning(learningData);

                // For applications, we need to fetch job details
                // We'll get all jobs to be safe and simple for now, or fetch individual docs if performance becomes an issue
                // Given this is a dashboard, doing a list of all active jobs is a reasonable subset, 
                // but applications might be for expired jobs. 
                // Let's just fetch the jobs for the applications we have.
                const appJobIds = appsData.map(a => a.jobId);
                const uniqueJobIds = Array.from(new Set([...appJobIds, ...savedIds]));

                // Fetch relevant jobs (in a real app, use a batch get or where-in query)
                // For now, let's just list all active jobs and try to find them, 
                // fallback to "Unknown Job" if not active/found.
                const allActiveJobs = await listJobPostings({ activeOnly: false });
                const jobMap = new Map(allActiveJobs.map(j => [j.id, j]));

                const enrichedApps = appsData.map(app => ({
                    ...app,
                    jobTitle: jobMap.get(app.jobId)?.title || "Unknown Job",
                    employerName: jobMap.get(app.jobId)?.employerName || "Unknown Employer",
                    appliedAt: app.createdAt
                }));

                setApplications(enrichedApps);

                // Fetch details for saved jobs if any
                if (savedIds.length > 0) {
                    // This is efficient? Maybe not for many jobs, but okay for now.
                    // Ideally we'd have a getJobsByIds function or similar.
                    // For now, let's just fetch recent active jobs and filter.
                    // Optimization: Create getJobPostingsByIds(ids)
                    const allJobs = await listJobPostings({ activeOnly: true });
                    setSavedJobs(allJobs.filter(j => savedIds.includes(j.id)));
                }

            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setLoading(false);
            }
        }

        if (user) loadData();
    }, [user, role]);

    if (!user) {
        return (
            <PageShell>
                <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
                    <h1 className="text-2xl font-bold text-white">Please Sign In</h1>
                    <p className="mt-2 text-slate-400">You need to be signed in to view your career dashboard.</p>
                    <Link href="/login" className="mt-6 rounded-full bg-teal-500 px-6 py-2 text-sm font-bold text-white">
                        Sign In
                    </Link>
                </div>
            </PageShell>
        );
    }

    return (
        <PageShell>
            <div className="mx-auto max-w-7xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white">Career Dashboard</h1>
                    <p className="text-slate-400">Welcome back, {user.displayName}</p>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Main Column */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* My Learning */}
                        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                        <AcademicCapIcon className="h-6 w-6 text-purple-400" />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">My Learning</h2>
                                </div>
                                <Link href="/jobs/training" className="text-sm font-semibold text-purple-400 hover:text-purple-300">
                                    Browse Training
                                </Link>
                            </div>

                            {learning.length > 0 ? (
                                <div className="space-y-4">
                                    {learning.map(item => (
                                        <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4 border border-slate-700 hover:border-purple-500/30 transition-colors">
                                            <div>
                                                <h3 className="font-semibold text-white">{item.programTitle}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                        item.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-slate-700 text-slate-300'
                                                        }`}>
                                                        {item.status.replace('_', ' ')}
                                                    </span>
                                                    {item.progressPercent > 0 && (
                                                        <span className="text-xs text-slate-400">{item.progressPercent}% Complete</span>
                                                    )}
                                                </div>
                                            </div>
                                            <Link href={`/jobs/training/${item.programId}`} className="p-2 text-slate-400 hover:text-white">
                                                <ChevronRightIcon className="h-5 w-5" />
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-slate-400 mb-4">You haven't enrolled in any training programs yet.</p>
                                    <Link href="/jobs/training" className="inline-flex items-center gap-2 rounded-lg bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300 hover:bg-purple-500/20">
                                        Find Programs
                                    </Link>
                                </div>
                            )}
                        </section>

                        {/* My Applications */}
                        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                        <BriefcaseIcon className="h-6 w-6 text-blue-400" />
                                    </div>
                                    <h2 className="text-xl font-bold text-white">Job Applications</h2>
                                </div>
                                <Link href="/jobs" className="text-sm font-semibold text-blue-400 hover:text-blue-300">
                                    Find Jobs
                                </Link>
                            </div>

                            {applications.length > 0 ? (
                                <div className="space-y-4">
                                    {applications.map(app => (
                                        <div key={app.id} className="flex items-center justify-between rounded-xl bg-slate-800/50 p-4 border border-slate-700">
                                            <div>
                                                <h3 className="font-semibold text-white">{app.jobTitle}</h3>
                                                <p className="text-sm text-slate-400">{app.employerName}</p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Applied: {app.appliedAt && typeof app.appliedAt.toDate === 'function' ? app.appliedAt.toDate().toLocaleDateString() : 'N/A'}
                                                </p>
                                            </div>
                                            <span className="px-3 py-1 rounded-full bg-slate-700 text-xs text-slate-300 capitalize">
                                                {app.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-slate-400 mb-4">No active job applications.</p>
                                    <Link href="/jobs" className="inline-flex items-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-500/20">
                                        Search Opportunities
                                    </Link>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-8">
                        {/* Saved Jobs */}
                        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <BookmarkIcon className="h-6 w-6 text-emerald-400" />
                                <h2 className="text-lg font-bold text-white">Saved Jobs</h2>
                            </div>

                            {savedJobs.length > 0 ? (
                                <div className="space-y-4">
                                    {savedJobs.slice(0, 5).map(job => (
                                        <Link key={job.id} href={`/jobs/${job.id}`} className="block group">
                                            <div className="p-3 rounded-xl bg-slate-800/50 hover:bg-slate-700 transition-colors">
                                                <h4 className="font-semibold text-slate-200 text-sm group-hover:text-emerald-300 line-clamp-1">{job.title}</h4>
                                                <p className="text-xs text-slate-400">{job.employerName}</p>
                                            </div>
                                        </Link>
                                    ))}
                                    {savedJobs.length > 5 && (
                                        <Link href="/jobs?saved=true" className="block text-center text-sm text-emerald-400 hover:text-emerald-300 mt-4">
                                            View all {savedJobs.length} saved jobs
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400">No saved jobs yet.</p>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </PageShell>
    );
}
