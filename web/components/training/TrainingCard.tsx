
import Link from "next/link";
import {
    AcademicCapIcon,
    MapPinIcon,
    CalendarIcon,
    CurrencyDollarIcon,
    CheckBadgeIcon
} from "@heroicons/react/24/outline";
import type { TrainingProgram } from "@/lib/types";

interface TrainingCardProps {
    program: TrainingProgram;
    featured?: boolean;
}

export default function TrainingCard({ program, featured = false }: TrainingCardProps) {
    const getFormatBadgeColor = (format: string) => {
        switch (format.toLowerCase()) {
            case 'online': return 'bg-blue-500/20 text-blue-300';
            case 'in-person': return 'bg-accent/20 text-emerald-300';
            case 'hybrid': return 'bg-purple-500/20 text-purple-300';
            case 'self-paced': return 'bg-amber-500/20 text-amber-300';
            default: return 'bg-slate-700 text-[var(--text-secondary)]';
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'On-demand';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Check if cost indicates free
    const isFree = !program.cost || program.cost.toLowerCase().includes('free') || program.cost === '$0';

    return (
        <div className={`group flex flex-col overflow-hidden rounded-2xl border transition-all hover:-translate-y-1 ${featured
            ? "border-accent/30 bg-gradient-to-br from-teal-500/10 to-emerald-500/5 hover:border-accent/50"
            : "border-[var(--card-border)] bg-surface hover:border-accent/30"
            }`}>
            {/* Header / Banner */}
            <div className="relative px-5 py-4 border-b border-[var(--card-border)] bg-surface">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getFormatBadgeColor(program.format)}`}>
                            {program.format.replace('-', ' ')}
                        </span>
                        {program.category && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700 text-[var(--text-secondary)]">
                                {program.category}
                            </span>
                        )}
                    </div>
                    {isFree && (
                        <span className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 text-xs font-bold border border-green-500/30">
                            FREE
                        </span>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-5 flex flex-col">
                {program.providerName && (
                    <div className="flex items-center gap-1.5 mb-2 text-sm font-medium text-accent/90">
                        {program.providerName}
                        {program.status === 'approved' && (
                            <span title="Verified Provider"><CheckBadgeIcon className="h-4 w-4 text-blue-400" /></span>
                        )}
                    </div>
                )}

                <Link href={`/careers/training/${program.id}`} className="mb-3 block">
                    <h3 className="text-xl font-bold text-white group-hover:text-teal-300 transition-colors line-clamp-2">
                        {program.title}
                    </h3>
                </Link>

                <p className="text-[var(--text-muted)] text-sm line-clamp-2 mb-4 flex-1">
                    {program.shortDescription || program.description}
                </p>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-[var(--text-secondary)] mb-5">
                    {program.duration && (
                        <div className="flex items-center gap-1.5">
                            <CalendarIcon className="h-4 w-4 text-foreground0" />
                            <span>{program.duration}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-1.5">
                        <MapPinIcon className="h-4 w-4 text-foreground0" />
                        <span>{program.format === 'online' ? 'Remote' : program.location || 'Location varies'}</span>
                    </div>

                    {program.startDate && (
                        <div className="flex items-center gap-1.5 col-span-2">
                            <span className="text-foreground0 text-xs uppercase tracking-wide">Starts:</span>
                            <span>{formatDate(program.startDate)}</span>
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-4 border-t border-[var(--card-border)] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-foreground font-medium">
                        {isFree ? (
                            <span className="text-green-400">No Cost</span>
                        ) : (
                            <span>{program.cost}</span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/careers"
                            className="text-xs font-semibold text-blue-400 hover:text-blue-300"
                        >
                            Find Jobs
                        </Link>
                        <Link
                            href={`/careers/training/${program.id}`}
                            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-accent text-white text-sm font-medium transition-colors"
                        >
                            View Details
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
