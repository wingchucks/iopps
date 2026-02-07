"use client";

import { Opportunity } from "@/lib/types";
import { useAuth } from "@/components/AuthProvider";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { BriefcaseIcon, AcademicCapIcon, CalendarDaysIcon, VideoCameraIcon, BuildingStorefrontIcon } from "@heroicons/react/24/outline";

interface OpportunityCardProps {
    opportunity: Opportunity;
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
    const { type, title, organizationName, location, postedAt, tags, imageUrl, trcAligned, matchScore, salary, connectionCount } = opportunity;

    const TypeIcon = {
        job: BriefcaseIcon,
        scholarship: AcademicCapIcon,
        event: CalendarDaysIcon,
        training: VideoCameraIcon,
        business: BuildingStorefrontIcon,
    }[type] || BriefcaseIcon;

    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    const typeColor = {
        job: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        scholarship: "text-purple-400 bg-purple-500/10 border-purple-500/20",
        event: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        training: "text-accent bg-accent/10 border-accent/20",
        business: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    }[type];

    const formattedDate = (date: any) => {
        if (!date) return "";
        const d = date.toDate ? date.toDate() : new Date(date);
        return formatDistanceToNow(d, { addSuffix: true });
    };

    const { user, role } = useAuth();
    const isEmployer = role === 'employer';

    const getDetailLink = () => {
        switch (type) {
            case 'job': return `/careers/${opportunity.id}`;
            case 'scholarship': return `/education/scholarships/${opportunity.id}`;
            case 'event': return `/conferences/${opportunity.id}`; // or /events
            default: return '#';
        }
    };

    return (
        <div className="group relative overflow-hidden rounded-2xl bg-surface border border-[var(--card-border)] hover:border-[var(--card-border)] transition-all active:scale-[0.98]">
            <Link href={getDetailLink()} className="absolute inset-0 z-0" />

            {/* Match Score Badge (Only for Community Members) */}
            {!isEmployer && matchScore && matchScore > 80 && (
                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                    <div className="flex items-center gap-1 rounded-full bg-accent/20 backdrop-blur-md px-2 py-0.5 border border-accent/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span className="text-[10px] font-bold text-emerald-300">{matchScore}% Match</span>
                    </div>
                </div>
            )}

            {/* Image / Header */}
            {imageUrl ? (
                <div className="relative h-32 w-full">
                    <Image src={imageUrl} alt={title} fill className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />

                    {/* Type Badge on Image */}
                    <div className="absolute bottom-3 left-3 z-10">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium border backdrop-blur-md shadow-sm ${typeColor}`}>
                            <TypeIcon className="h-3 w-3" />
                            {typeLabel}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="p-4 pb-0 flex items-start justify-between relative z-10">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium border ${typeColor}`}>
                        <TypeIcon className="h-3 w-3" />
                        {typeLabel}
                    </span>
                    <span className="text-xs text-foreground0">{formattedDate(postedAt)}</span>
                </div>
            )}

            {/* Content */}
            <div className="p-4 pt-3 relative z-10 pointer-events-none">
                {imageUrl && (
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[var(--text-muted)]">{organizationName}</span>
                        <span className="text-xs text-foreground0">{formattedDate(postedAt)}</span>
                    </div>
                )}
                {!imageUrl && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 mb-1">{organizationName}</p>
                )}

                <h3 className="text-lg font-bold text-foreground leading-tight mb-2 line-clamp-2">
                    {title}
                </h3>

                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-3">
                    <span>📍 {location}</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {/* Salary Tag for Jobs */}
                    {salary && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-surface text-accent border border-[var(--card-border)] font-mono">
                            {salary}
                        </span>
                    )}
                    {tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-surface text-[var(--text-secondary)] border border-[var(--card-border)]">
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Connection Trust Signal (Only for Community) */}
                {!isEmployer && connectionCount && connectionCount > 0 && (
                    <div className="mb-3 flex items-center gap-[-4px]">
                        <div className="flex -space-x-1.5 overflow-hidden">
                            {/* Mock Avatars */}
                            {[...Array(Math.min(3, connectionCount))].map((_, i) => (
                                <div key={i} className={`inline-block h-4 w-4 rounded-full ring-2 ring-slate-900 ${['bg-orange-400', 'bg-blue-400', 'bg-purple-400'][i % 3]
                                    }`} />
                            ))}
                        </div>
                        <span className="ml-2 text-[10px] text-accent font-medium">
                            {connectionCount} {type === 'event' ? 'attending' : 'work here'}
                        </span>
                    </div>
                )}

                {/* Actions / TRC */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--card-border)]">
                    <div className="flex items-center gap-2">
                        {trcAligned && (
                            <div className="flex items-center gap-1 group/trc">
                                <span className="text-amber-500 text-xs">🪶</span>
                                <span className="text-[10px] text-foreground0 group-hover/trc:text-amber-500 transition-colors">TRC Aligned</span>
                            </div>
                        )}
                    </div>

                    <span className={`text-sm font-semibold hover:underline pointer-events-auto z-20 ${isEmployer ? 'text-[var(--text-muted)]' : 'text-accent hover:text-teal-300'
                        }`}>
                        {isEmployer ? 'View Market Intel' : 'View Details →'}
                    </span>
                </div>
            </div>
        </div>
    );
}
