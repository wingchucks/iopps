"use client";

import Link from "next/link";
import { MemberProfile, JobApplication, JobPosting } from "@/lib/types";

export type ApplicationWithJob = JobApplication & {
    job?: JobPosting | null;
};

export type TabType = "overview" | "profile" | "applications" | "saved" | "training" | "alerts" | "messages";

interface OverviewTabProps {
    profile: MemberProfile | null;
    profileCompletion: number;
    stats: { totalApplications: number; recentApplications: number; profileCompletion: number };
    applications: ApplicationWithJob[];
    onNavigate: (tab: TabType) => void;
}

export default function OverviewTab({
    profile,
    profileCompletion,
    stats,
    applications,
    onNavigate
}: OverviewTabProps) {
    return (
        <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-6">
                {/* Welcome & Stats Row */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-5 shadow-lg shadow-emerald-900/10">
                        <p className="text-sm font-medium text-emerald-400">Total Applications</p>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white">{stats.totalApplications}</span>
                            {stats.recentApplications > 0 && (
                                <span className="text-xs text-emerald-300">+{stats.recentApplications} new</span>
                            )}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-5 shadow-lg shadow-blue-900/10">
                        <p className="text-sm font-medium text-blue-400">Profile Views</p>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white">12</span>
                            <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300">
                                +3 this week
                            </span>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-5 shadow-lg shadow-amber-900/10">
                        <p className="text-sm font-medium text-amber-400">New Matches</p>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white">3</span>
                        </div>
                    </div>
                </div>

                {/* Application Tracker */}
                <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Application Tracker</h3>
                        <button onClick={() => onNavigate("applications")} className="text-sm text-emerald-400 hover:text-emerald-300">
                            View All
                        </button>
                    </div>

                    <div className="space-y-3">
                        {applications.slice(0, 3).map((app) => (
                            <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-slate-700">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 flex shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xl">
                                        🏢
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-semibold text-slate-200 truncate">{app.job?.title || "Job Application"}</h4>
                                        <p className="text-xs text-slate-500 truncate">{app.job?.employerName || "Employer"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pl-14 sm:pl-0">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${app.status === 'reviewed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                        (app.status === 'hired' || app.status === 'shortlisted') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        }`}>
                                        {app.status ? (app.status.charAt(0).toUpperCase() + app.status.slice(1)) : "Submitted"}
                                    </span>
                                    <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-400">
                                        →
                                    </button>
                                </div>
                            </div>
                        ))}
                        {applications.length === 0 && (
                            <div className="text-center py-8 text-slate-500">
                                No active applications. <Link href="/careers" className="text-emerald-400 underline">Start applying!</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column (Goals) */}
            <div className="space-y-6">
                <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur">
                    <h3 className="text-lg font-bold text-white mb-4">Recommended Goals</h3>

                    <div className="space-y-5">
                        {/* Goal 1: Profile */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-300">Complete your portfolio</span>
                                <span className="text-emerald-400">{profileCompletion}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${profileCompletion}%` }} />
                            </div>
                            {profileCompletion < 100 && (
                                <button onClick={() => onNavigate("profile")} className="mt-2 text-xs font-semibold text-slate-400 hover:text-white">
                                    Continue →
                                </button>
                            )}
                        </div>

                        <hr className="border-slate-800" />

                        {/* Goal 2: Networking */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-300">Connect with 5 peers</span>
                                <span className="text-slate-500">2/5</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                                <div className="h-full bg-blue-500 w-[40%]" />
                            </div>
                            <Link href="/network" className="mt-2 block text-xs font-semibold text-blue-400 hover:text-blue-300">
                                Find Peers →
                            </Link>
                        </div>

                        <hr className="border-slate-800" />

                        {/* Goal 3: Events */}
                        <div className="group cursor-pointer">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                                    📅
                                </div>
                                <p className="text-sm font-medium text-slate-200 group-hover:text-purple-400 transition-colors">Attend a Networking Event</p>
                            </div>
                            <Link href="/conferences" className="ml-11 text-xs text-slate-500 group-hover:text-slate-300">
                                View upcoming events
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
