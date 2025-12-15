import Link from "next/link";
import { JobPosting } from "@/lib/types";

interface JobHeaderProps {
    job: JobPosting;
}

export default function JobHeader({ job }: JobHeaderProps) {
    return (
        <div className="mb-8">
            {/* Breadcrumb */}
            <nav className="mb-4 flex items-center text-sm text-slate-400">
                <Link href="/jobs" className="hover:text-[#14B8A6] transition-colors">
                    Jobs
                </Link>
                <svg className="mx-2 h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-slate-200 truncate max-w-[200px] sm:max-w-md">{job.title}</span>
            </nav>

            {/* Title & Badges */}
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-50 sm:text-4xl">{job.title}</h1>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        {job.employerName && (
                            <span className="text-lg font-medium text-[#14B8A6]">
                                {job.employerName}
                            </span>
                        )}
                        {/* Location Type Badge */}
                        {job.locationType === "remote" ? (
                            <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                                <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Remote
                            </span>
                        ) : job.locationType === "hybrid" ? (
                            <span className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400">
                                <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Hybrid
                            </span>
                        ) : job.remoteFlag ? (
                            <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                                Remote Available
                            </span>
                        ) : null}
                        {/* Category Badge */}
                        {job.category && (
                            <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-300">
                                {job.category}
                            </span>
                        )}
                        {job.indigenousPreference && (
                            <span className="inline-flex items-center rounded-full border border-[#14B8A6]/30 bg-[#14B8A6]/10 px-3 py-1 text-xs font-medium text-[#14B8A6]">
                                Indigenous Preference
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
