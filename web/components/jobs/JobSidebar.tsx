import Link from "next/link";
import { JobPosting, EmployerProfile } from "@/lib/types";
import ShareButtons from "@/components/ShareButtons";

interface JobSidebarProps {
    job: JobPosting;
    employerProfile: EmployerProfile | null;
}

function formatSalaryRange(salaryRange: JobPosting["salaryRange"]): string {
    if (!salaryRange) return "";
    if (typeof salaryRange === "string") return salaryRange;
    if (!salaryRange.disclosed) return "";

    const { min, max, currency = "CAD" } = salaryRange;
    if (min && max) {
        return `$${min.toLocaleString()} - $${max.toLocaleString()} ${currency}`;
    }
    if (min) return `$${min.toLocaleString()}+ ${currency}`;
    if (max) return `Up to $${max.toLocaleString()} ${currency}`;
    return "";
}

export default function JobSidebar({ job, employerProfile }: JobSidebarProps) {
    const formatDate = (timestamp: any) => {
        if (!timestamp) return null;
        try {
            const date =
                timestamp.toDate?.() instanceof Date
                    ? timestamp.toDate()
                    : new Date(timestamp);
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        } catch {
            return null;
        }
    };

    const deadline = formatDate(job.closingDate);
    const postedDate = formatDate(job.createdAt);

    return (
        <div className="space-y-6">
            {/* Job Overview Card */}
            <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
                <h3 className="mb-4 text-lg font-bold text-slate-200">Job Overview</h3>

                <div className="space-y-4">
                    {/* Date Posted */}
                    <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/50 text-slate-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-400">Date Posted</p>
                            <p className="text-sm font-semibold text-slate-200">{postedDate || "Recently"}</p>
                        </div>
                    </div>

                    {/* Closing Date */}
                    {deadline && (
                        <div className="flex items-start gap-3">
                            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-400">Closing Date</p>
                                <p className="text-sm font-semibold text-slate-200">{deadline}</p>
                            </div>
                        </div>
                    )}

                    {/* Location */}
                    <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/50 text-slate-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-400">Location</p>
                            <p className="text-sm font-semibold text-slate-200">{job.location}</p>
                            {job.remoteFlag && (
                                <span className="mt-1 inline-flex items-center rounded bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                                    Remote Available
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Salary */}
                    {job.salaryRange && formatSalaryRange(job.salaryRange) && (
                        <div className="flex items-start gap-3">
                            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/50 text-slate-400">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-400">Salary</p>
                                <p className="text-sm font-semibold text-slate-200">{formatSalaryRange(job.salaryRange)}</p>
                            </div>
                        </div>
                    )}

                    {/* Employment Type */}
                    <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/50 text-slate-400">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-400">Job Type</p>
                            <p className="text-sm font-semibold text-slate-200">{job.employmentType}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Employer Card */}
            {job.employerName && (
                <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
                    <h3 className="mb-4 text-lg font-bold text-slate-200">About the Employer</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-blue-500/20 text-lg font-bold text-[#14B8A6]">
                            {job.employerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-slate-200">{job.employerName}</p>
                            {employerProfile?.website && (
                                <a
                                    href={employerProfile.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-[#14B8A6] hover:underline"
                                >
                                    Visit Website
                                </a>
                            )}
                        </div>
                    </div>
                    {employerProfile?.description && (
                        <p className="mt-4 text-sm text-slate-400 line-clamp-4">
                            {employerProfile.description}
                        </p>
                    )}
                </div>
            )}

            {/* Share Job */}
            <div className="rounded-2xl border border-slate-800 bg-[#08090C] p-6">
                <h3 className="mb-4 text-lg font-bold text-slate-200">Share this Job</h3>
                <ShareButtons
                    item={{
                        id: job.id,
                        title: `${job.title} at ${job.employerName || 'IOPPS'}`,
                        description: job.description?.substring(0, 150) + '...' || 'Check out this job opportunity on IOPPS',
                        type: 'job'
                    }}
                />
            </div>
        </div>
    );
}
