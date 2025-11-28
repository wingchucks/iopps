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
                        {job.remoteFlag && (
                            <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400">
                                Remote
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
