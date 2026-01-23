"use client";

import Link from "next/link";
import { MemberProfile, JobApplication, JobPosting } from "@/lib/types";
import { ProfileCompletionCard } from "@/components/profile/ProfileCompletionCard";
import EngagementStats from "@/components/member/EngagementStats";
import BadgeDisplay from "@/components/member/BadgeDisplay";
import StreakDisplay from "@/components/member/StreakDisplay";

export type ApplicationWithJob = JobApplication & {
    job?: JobPosting | null;
};

export type TabType = "overview" | "profile" | "applications" | "saved" | "training" | "alerts" | "messages" | "settings";

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
        <div className="space-y-8">
            {/* Engagement Stats Section */}
            <EngagementStats onNavigate={onNavigate} />

            {/* Achievement Badges Section */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur">
                <BadgeDisplay showProgress />
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Application Tracker */}
                    <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white">Recent Applications</h3>
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

                    {/* Quick Actions */}
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Link
                            href="/careers"
                            className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-all hover:border-emerald-500/30 hover:bg-slate-900/70"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                    💼
                                </div>
                                <div>
                                    <p className="font-medium text-white">Browse Jobs</p>
                                    <p className="text-xs text-slate-500">Find opportunities</p>
                                </div>
                            </div>
                        </Link>
                        <Link
                            href="/members"
                            className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-all hover:border-blue-500/30 hover:bg-slate-900/70"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                    👥
                                </div>
                                <div>
                                    <p className="font-medium text-white">Community</p>
                                    <p className="text-xs text-slate-500">Connect with others</p>
                                </div>
                            </div>
                        </Link>
                        <Link
                            href="/conferences"
                            className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-all hover:border-purple-500/30 hover:bg-slate-900/70"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                    📅
                                </div>
                                <div>
                                    <p className="font-medium text-white">Events</p>
                                    <p className="text-xs text-slate-500">Upcoming conferences</p>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Activity Streak */}
                    <StreakDisplay />

                    {/* Profile Completion Card */}
                    <ProfileCompletionCard
                        profile={profile}
                        onNavigateToProfile={() => onNavigate("profile")}
                    />

                    {/* Community Links */}
                    <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur">
                        <h3 className="text-lg font-bold text-white mb-4">Explore</h3>
                        <div className="space-y-3">
                            <Link
                                href="/scholarships"
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 transition-colors group"
                            >
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                                    🎓
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-200 group-hover:text-white">Scholarships</p>
                                    <p className="text-xs text-slate-500">Find funding opportunities</p>
                                </div>
                            </Link>
                            <Link
                                href="/training"
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 transition-colors group"
                            >
                                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                                    📚
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-200 group-hover:text-white">Training Programs</p>
                                    <p className="text-xs text-slate-500">Develop new skills</p>
                                </div>
                            </Link>
                            <Link
                                href="/powwows"
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800/50 transition-colors group"
                            >
                                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                                    🪶
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-slate-200 group-hover:text-white">Pow Wows</p>
                                    <p className="text-xs text-slate-500">Cultural gatherings</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
