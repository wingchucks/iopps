"use client";

import { MemberProfile } from "@/lib/types";
import Image from "next/image";
import { UserCircleIcon, TrophyIcon, UsersIcon, StarIcon, CheckCircleIcon, ChatBubbleLeftIcon } from "@heroicons/react/24/solid";
import { formatDistanceToNow } from "date-fns";

interface MemberProfileViewProps {
    profile: MemberProfile | null;
}

export default function MemberProfileView({ profile }: MemberProfileViewProps) {
    // Mock Data for "Sarah Bear" feel if profile is empty
    const displayProfile = {
        displayName: profile?.displayName || "Sarah Bear",
        indigenousAffiliation: profile?.indigenousAffiliation || "Nehiyaw / Cree",
        headline: profile?.tagline || "Project Manager & Community Builder",
        photoURL: profile?.photoURL || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        location: profile?.location || "Saskatoon, SK",
        level: 5,
        wins: 15,
        connections: 842,
    };

    const mockTimeline = [
        {
            id: 1,
            type: "win",
            content: "Just finished my PMP certification! Officially a Project Management Professional. Thank you to my study group!",
            date: new Date(Date.now() - 86400000 * 2), // 2 days ago
            likes: 45,
            comments: 12,
            image: "https://images.unsplash.com/photo-1544531585-9847b68c8c86?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60"
        },
        {
            id: 2,
            type: "update",
            content: "Spoke at the Indigenous Youth Tech Conference yesterday. The energy was incredible! So many future leaders.",
            date: new Date(Date.now() - 86400000 * 5), // 5 days ago
            likes: 128,
            comments: 34,
            image: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=60"
        },
        {
            id: 3,
            type: "milestone",
            content: "Mentored 3 new members in the IOPPS community this month.",
            date: new Date(Date.now() - 86400000 * 12),
            likes: 22,
            comments: 4,
        }
    ];

    return (
        <div className="pb-20">
            {/* Passport Header Card */}
            <div className="relative overflow-hidden rounded-3xl border border-[var(--card-border)] bg-[#0F172A] shadow-2xl">
                {/* Decorative Background Elements */}
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
                <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

                <div className="relative z-10 flex flex-col items-center p-8 text-center pt-12">
                    {/* Logo Badge */}
                    <div className="absolute top-6 right-6 opacity-30">
                        <div className="rounded-lg border border-white/20 p-2">
                            <span className="font-mono text-[10px] font-bold tracking-widest text-white">IOPPS</span>
                        </div>
                    </div>

                    <div className="absolute top-6 left-6 opacity-50">
                        <span className="text-[10px] font-bold tracking-widest text-accent">COMMUNITY PASSPORT</span>
                    </div>

                    {/* Avatar with Glow */}
                    <div className="relative mb-6">
                        <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-teal-400 to-amber-500 opacity-70 blur-md" />
                        <div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-[var(--card-border)] bg-surface ring-4 ring-slate-900/50">
                            <Image
                                src={displayProfile.photoURL}
                                alt={displayProfile.displayName}
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-white">{displayProfile.displayName}</h1>
                    <p className="mt-1 text-sm font-medium text-amber-500">
                        {displayProfile.indigenousAffiliation}
                    </p>
                    <p className="mt-2 max-w-xs text-sm text-[var(--text-muted)]">
                        {displayProfile.headline}
                    </p>

                    {/* Stats Row */}
                    <div className="mt-8 grid w-full grid-cols-3 divide-x divide-[var(--card-border)]/50 rounded-2xl border border-[var(--card-border)] bg-slate-800/30 backdrop-blur-md">
                        <div className="flex flex-col items-center py-4">
                            <TrophyIcon className="mb-1 h-5 w-5 text-amber-400" />
                            <span className="text-lg font-bold text-white">{displayProfile.wins}</span>
                            <span className="text-[10px] uppercase tracking-wider text-foreground0">Wins</span>
                        </div>
                        <div className="flex flex-col items-center py-4">
                            <UsersIcon className="mb-1 h-5 w-5 text-accent" />
                            <span className="text-lg font-bold text-white">{displayProfile.connections}</span>
                            <span className="text-[10px] uppercase tracking-wider text-foreground0">Connections</span>
                        </div>
                        <div className="flex flex-col items-center py-4">
                            <StarIcon className="mb-1 h-5 w-5 text-purple-400" />
                            <span className="text-lg font-bold text-white">Lvl {displayProfile.level}</span>
                            <span className="text-[10px] uppercase tracking-wider text-foreground0">Status</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Section */}
            <div className="mt-8 px-2">
                <h3 className="mb-4 text-lg font-bold text-foreground">My Wins Timeline</h3>

                <div className="space-y-6 border-l-2 border-[var(--card-border)] ml-3 pl-6 relative">
                    {mockTimeline.map((item) => (
                        <div key={item.id} className="relative">
                            {/* Timeline Node */}
                            <div className={`absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-900 shadow-xl ${item.type === 'win' ? 'bg-amber-500 text-white' :
                                item.type === 'milestone' ? 'bg-accent text-white' : 'bg-slate-700 text-[var(--text-secondary)]'
                                }`}>
                                {item.type === 'win' && <TrophyIcon className="h-3 w-3" />}
                                {item.type === 'milestone' && <CheckCircleIcon className="h-3 w-3" />}
                                {item.type === 'update' && <ChatBubbleLeftIcon className="h-3 w-3" />}
                            </div>

                            {/* Card */}
                            <div className="overflow-hidden rounded-2xl border border-[var(--card-border)] bg-slate-900/80 shadow-sm transition-all hover:border-[var(--card-border)]">
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {item.type === 'win' && (
                                                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500 uppercase tracking-wide">
                                                    Celebrated Win
                                                </span>
                                            )}
                                            {item.type === 'milestone' && (
                                                <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent uppercase tracking-wide">
                                                    Milestone
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-foreground0">
                                            {formatDistanceToNow(item.date, { addSuffix: true })}
                                        </span>
                                    </div>

                                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                        {item.content}
                                    </p>

                                    {item.image && (
                                        <div className="mt-3 relative h-32 w-full overflow-hidden rounded-lg">
                                            <Image src={item.image} alt="Post attachment" fill className="object-cover" />
                                        </div>
                                    )}

                                    <div className="mt-4 flex items-center gap-4 border-t border-[var(--card-border)]/50 pt-3">
                                        <button className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-white transition-colors">
                                            <span className="text-foreground0">❤️</span> {item.likes}
                                        </button>
                                        <button className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-white transition-colors">
                                            <span className="text-foreground0">💬</span> {item.comments}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
