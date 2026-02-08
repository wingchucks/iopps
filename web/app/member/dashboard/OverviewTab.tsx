"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { MemberProfile, JobApplication, JobPosting } from "@/lib/types";
import { ProfileCompletionCard } from "@/components/profile/ProfileCompletionCard";
import EngagementStats from "@/components/member/EngagementStats";
import BadgeDisplay from "@/components/member/BadgeDisplay";
import StreakDisplay from "@/components/member/StreakDisplay";
import RecommendationsWidget from "@/components/member/RecommendationsWidget";
import { getMemberSettings } from "@/lib/firestore";
import type { UserIntent } from "@/lib/firestore";
import {
    Briefcase,
    GraduationCap,
    Calendar,
    Users,
    TrendingUp,
    Sparkles,
    Building2,
    DollarSign,
} from "lucide-react";

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

// Map intents to quick actions
const INTENT_ACTIONS: Record<UserIntent, { href: string; icon: React.ReactNode; label: string; description: string; color: string }[]> = {
    "find-job": [
        { href: "/careers", icon: <Briefcase className="h-5 w-5" />, label: "Browse Jobs", description: "Find your next opportunity", color: "emerald" },
        { href: "/careers/programs", icon: <TrendingUp className="h-5 w-5" />, label: "Training Programs", description: "Build new skills", color: "cyan" },
        { href: "/members/discover", icon: <Users className="h-5 w-5" />, label: "Network", description: "Connect with professionals", color: "blue" },
    ],
    "explore-careers": [
        { href: "/careers", icon: <Briefcase className="h-5 w-5" />, label: "Explore Careers", description: "See what's out there", color: "emerald" },
        { href: "/careers/programs", icon: <GraduationCap className="h-5 w-5" />, label: "Skills Training", description: "Develop your career", color: "amber" },
        { href: "/education", icon: <Building2 className="h-5 w-5" />, label: "Education Programs", description: "Formal education paths", color: "purple" },
    ],
    "attend-events": [
        { href: "/conferences", icon: <Calendar className="h-5 w-5" />, label: "Conferences", description: "Professional events", color: "purple" },
        { href: "/powwows", icon: <Sparkles className="h-5 w-5" />, label: "Pow Wows", description: "Cultural gatherings", color: "rose" },
        { href: "/members", icon: <Users className="h-5 w-5" />, label: "Community", description: "Meet others", color: "blue" },
    ],
    "find-scholarships": [
        { href: "/scholarships", icon: <GraduationCap className="h-5 w-5" />, label: "Scholarships", description: "Find funding", color: "amber" },
        { href: "/education/programs", icon: <Building2 className="h-5 w-5" />, label: "Programs", description: "Education opportunities", color: "purple" },
        { href: "/business/funding", icon: <DollarSign className="h-5 w-5" />, label: "Grants", description: "Business funding", color: "emerald" },
    ],
    "connect-professionals": [
        { href: "/members/discover", icon: <Sparkles className="h-5 w-5" />, label: "People to Meet", description: "Suggested connections", color: "purple" },
        { href: "/members", icon: <Users className="h-5 w-5" />, label: "Directory", description: "Browse community", color: "blue" },
        { href: "/conferences", icon: <Calendar className="h-5 w-5" />, label: "Networking Events", description: "Meet in person", color: "emerald" },
    ],
    "browse-community": [
        { href: "/members", icon: <Users className="h-5 w-5" />, label: "Community", description: "Explore members", color: "blue" },
        { href: "/radar", icon: <TrendingUp className="h-5 w-5" />, label: "Community Feed", description: "Latest updates", color: "emerald" },
        { href: "/community/leaderboard", icon: <Sparkles className="h-5 w-5" />, label: "Leaderboard", description: "Top contributors", color: "amber" },
    ],
};

export default function OverviewTab({
    profile,
    profileCompletion,
    stats,
    applications,
    onNavigate
}: OverviewTabProps) {
    const { user } = useAuth();
    const [intents, setIntents] = useState<UserIntent[]>([]);
    const [loadingIntents, setLoadingIntents] = useState(true);

    useEffect(() => {
        if (!user) return;

        const loadIntents = async () => {
            try {
                const settings = await getMemberSettings(user.uid);
                setIntents(settings.onboarding.intents || []);
            } catch (error) {
                console.error("Error loading user intents:", error);
            } finally {
                setLoadingIntents(false);
            }
        };

        loadIntents();
    }, [user]);

    // Get personalized quick actions based on intents
    const getQuickActions = () => {
        if (intents.length === 0) {
            // Default actions if no intents set
            return [
                { href: "/careers", icon: <Briefcase className="h-5 w-5" />, label: "Browse Jobs", description: "Find opportunities", color: "emerald" },
                { href: "/members", icon: <Users className="h-5 w-5" />, label: "Community", description: "Connect with others", color: "blue" },
                { href: "/conferences", icon: <Calendar className="h-5 w-5" />, label: "Events", description: "Upcoming conferences", color: "purple" },
            ];
        }

        // Combine actions from user's intents, prioritizing first intent
        const actionSet = new Map<string, typeof INTENT_ACTIONS["find-job"][0]>();
        for (const intent of intents) {
            const intentActions = INTENT_ACTIONS[intent] || [];
            for (const action of intentActions) {
                if (!actionSet.has(action.href)) {
                    actionSet.set(action.href, action);
                }
            }
        }

        return Array.from(actionSet.values()).slice(0, 3);
    };

    const quickActions = getQuickActions();

    const getColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; text: string; hover: string }> = {
            emerald: { bg: "bg-accent/10", text: "text-accent", hover: "hover:border-accent/30" },
            blue: { bg: "bg-blue-500/10", text: "text-blue-400", hover: "hover:border-blue-500/30" },
            purple: { bg: "bg-purple-500/10", text: "text-purple-400", hover: "hover:border-purple-500/30" },
            amber: { bg: "bg-amber-500/10", text: "text-amber-400", hover: "hover:border-amber-500/30" },
            rose: { bg: "bg-rose-500/10", text: "text-rose-400", hover: "hover:border-rose-500/30" },
            cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", hover: "hover:border-cyan-500/30" },
        };
        return colors[color] || colors.emerald;
    };

    return (
        <div className="space-y-8">
            {/* Opportunity Feed Banner */}
            <Link href="/discover" className="block group">
                <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-r from-teal-500/10 via-teal-500/5 to-slate-900/50 p-6 backdrop-blur transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-teal-500/10 focus-within:border-accent/50 focus-within:shadow-lg focus-within:shadow-teal-500/10 active:shadow-lg active:shadow-teal-500/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-2xl">
                                ✨
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Explore the Opportunity Feed</h3>
                                <p className="text-sm text-[var(--text-muted)]">Discover jobs, scholarships, events, and more — all in one place</p>
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent text-sm font-medium group-hover:bg-accent/30 transition-colors">
                            Open Feed
                            <span className="transform group-hover:translate-x-1 group-active:translate-x-1 transition-transform">→</span>
                        </div>
                    </div>
                </div>
            </Link>

            {/* Recommendations Section */}
            <RecommendationsWidget variant="compact" />

            {/* Engagement Stats Section */}
            <EngagementStats onNavigate={onNavigate} />

            {/* Achievement Badges Section */}
            <div className="rounded-3xl border border-[var(--card-border)] bg-surface p-6 backdrop-blur">
                <BadgeDisplay showProgress />
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Application Tracker */}
                    <div className="rounded-3xl border border-[var(--card-border)] bg-surface p-6 backdrop-blur">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white">Recent Applications</h3>
                            <button onClick={() => onNavigate("applications")} className="text-sm text-accent hover:text-emerald-300">
                                View All
                            </button>
                        </div>

                        <div className="space-y-3">
                            {applications.slice(0, 3).map((app) => (
                                <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[var(--card-border)] bg-slate-900/80 p-4 transition hover:border-[var(--card-border)]">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 flex shrink-0 items-center justify-center rounded-lg bg-surface text-xl">
                                            🏢
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-semibold text-foreground truncate">{app.job?.title || "Job Application"}</h4>
                                            <p className="text-xs text-foreground0 truncate">{app.job?.employerName || "Employer"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pl-14 sm:pl-0">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${app.status === 'reviewed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                            (app.status === 'hired' || app.status === 'shortlisted') ? 'bg-accent/10 text-accent border-accent/20' :
                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                            {app.status ? (app.status.charAt(0).toUpperCase() + app.status.slice(1)) : "Submitted"}
                                        </span>
                                        <button className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-surface text-[var(--text-muted)]">
                                            →
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {applications.length === 0 && (
                                <div className="text-center py-8 text-foreground0">
                                    No active applications. <Link href="/careers" className="text-accent underline">Start applying!</Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Personalized Quick Actions */}
                    <div className="grid gap-4 sm:grid-cols-3">
                        {quickActions.map((action) => {
                            const colors = getColorClasses(action.color);
                            return (
                                <Link
                                    key={action.href}
                                    href={action.href}
                                    className={`group rounded-2xl border border-[var(--card-border)] bg-surface p-5 transition-all ${colors.hover} hover:bg-slate-900/70`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>
                                            {action.icon}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{action.label}</p>
                                            <p className="text-xs text-foreground0">{action.description}</p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
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
                    <div className="rounded-3xl border border-[var(--card-border)] bg-surface p-6 backdrop-blur">
                        <h3 className="text-lg font-bold text-white mb-4">Explore</h3>
                        <div className="space-y-3">
                            <Link
                                href="/education/scholarships"
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface transition-colors group"
                            >
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                                    🎓
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground group-hover:text-white">Scholarships</p>
                                    <p className="text-xs text-foreground0">Find funding opportunities</p>
                                </div>
                            </Link>
                            <Link
                                href="/careers/programs"
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface transition-colors group"
                            >
                                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                                    📚
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground group-hover:text-white">Training Programs</p>
                                    <p className="text-xs text-foreground0">Develop new skills</p>
                                </div>
                            </Link>
                            <Link
                                href="/community"
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface transition-colors group"
                            >
                                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                                    🪶
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground group-hover:text-white">Pow Wows</p>
                                    <p className="text-xs text-foreground0">Cultural gatherings</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
