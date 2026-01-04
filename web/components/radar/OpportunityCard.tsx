"use client";

import { Opportunity } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { BriefcaseIcon, AcademicCapIcon, CalendarDaysIcon, VideoCameraIcon } from "@heroicons/react/24/outline";

interface OpportunityCardProps {
    opportunity: Opportunity;
}

export function OpportunityCard({ opportunity }: OpportunityCardProps) {
    const { type, title, organizationName, location, postedAt, tags, imageUrl, trcAligned, matchScore } = opportunity;

    const TypeIcon = {
        job: BriefcaseIcon,
        scholarship: AcademicCapIcon,
        event: CalendarDaysIcon,
        training: VideoCameraIcon,
    }[type] || BriefcaseIcon;

    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    const typeColor = {
        job: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        scholarship: "text-purple-400 bg-purple-500/10 border-purple-500/20",
        event: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        training: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    }[type];

    const formattedDate = (date: any) => {
        if (!date) return "";
        const d = date.toDate ? date.toDate() : new Date(date);
        return formatDistanceToNow(d, { addSuffix: true });
    };

    return (
        <div className="group relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all active:scale-[0.98]">
            {/* Match Score Badge (if high) */}
            {matchScore && matchScore > 80 && (
                <div className="absolute top-3 right-3 z-10">
                    <div className="flex items-center gap-1 rounded-full bg-emerald-500/20 backdrop-blur-md px-2 py-0.5 border border-emerald-500/30">
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
                    <div className="absolute bottom-3 left-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium border backdrop-blur-md shadow-sm ${typeColor}`}>
                            <TypeIcon className="h-3 w-3" />
                            {typeLabel}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="p-4 pb-0 flex items-start justify-between">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium border ${typeColor}`}>
                        <TypeIcon className="h-3 w-3" />
                        {typeLabel}
                    </span>
                    <span className="text-xs text-slate-500">{formattedDate(postedAt)}</span>
                </div>
            )}

            {/* Content */}
            <div className="p-4 pt-3">
                {imageUrl && (
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">{organizationName}</span>
                        <span className="text-xs text-slate-500">{formattedDate(postedAt)}</span>
                    </div>
                )}
                {!imageUrl && (
                    <p className="text-xs text-slate-400 mt-1 mb-1">{organizationName}</p>
                )}

                <h3 className="text-lg font-bold text-slate-100 leading-tight mb-2 line-clamp-2">
                    {title}
                </h3>

                <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                    <span>📍 {location}</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Actions / TRC */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <div className="flex items-center gap-2">
                        {trcAligned && (
                            <div className="flex items-center gap-1 group/trc">
                                <span className="text-amber-500 text-xs">🪶</span>
                                <span className="text-[10px] text-slate-500 group-hover/trc:text-amber-500 transition-colors">TRC Aligned</span>
                            </div>
                        )}
                    </div>

                    <button className="text-sm font-semibold text-teal-400 hover:text-teal-300">
                        View Details →
                    </button>
                </div>
            </div>
        </div>
    );
}
