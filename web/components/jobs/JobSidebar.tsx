import Link from "next/link";
import { JobPosting, EmployerProfile } from "@/lib/types";
import ShareButtons from "@/components/ShareButtons";

interface JobSidebarProps {
    job: JobPosting;
    employerProfile: EmployerProfile | null;
}

const SALARY_PERIOD_LABELS: Record<string, string> = {
    hourly: "per hour",
    daily: "per day",
    weekly: "per week",
    monthly: "per month",
    yearly: "per year",
};

function formatSalaryRange(salaryRange: JobPosting["salaryRange"]): string {
    if (!salaryRange) return "";
    if (typeof salaryRange === "string") return salaryRange;
    if (!salaryRange.disclosed) return "";

    const { min, max, currency = "CAD", period = "yearly" } = salaryRange;
    const periodLabel = SALARY_PERIOD_LABELS[period] || "per year";

    if (min && max) {
        return `$${min.toLocaleString()} - $${max.toLocaleString()} ${currency} ${periodLabel}`;
    }
    if (min) return `$${min.toLocaleString()}+ ${currency} ${periodLabel}`;
    if (max) return `Up to $${max.toLocaleString()} ${currency} ${periodLabel}`;
    return "";
}

// Get salary display, checking both structured and legacy formats
function getSalaryDisplay(job: JobPosting): string {
    // Check structured salaryRange first
    const structured = formatSalaryRange(job.salaryRange);
    if (structured) return structured;

    // Fallback to legacy salary.display field (from RSS imports)
    const legacySalary = (job as any).salary;
    if (legacySalary?.display) return legacySalary.display;

    return "";
}

export default function JobSidebar({ job, employerProfile }: JobSidebarProps) {
    const formatDate = (timestamp: any) => {
        if (!timestamp) return null;
        try {
            let date: Date;

            // Handle Firestore Timestamp objects
            if (timestamp.toDate && typeof timestamp.toDate === "function") {
                date = timestamp.toDate();
            }
            // Handle serialized Firestore timestamps (from server components)
            else if (timestamp._seconds !== undefined) {
                date = new Date(timestamp._seconds * 1000);
            }
            // Handle seconds timestamp (number)
            else if (typeof timestamp === "number" && timestamp > 1000000000 && timestamp < 10000000000) {
                date = new Date(timestamp * 1000);
            }
            // Handle milliseconds timestamp
            else if (typeof timestamp === "number") {
                date = new Date(timestamp);
            }
            // Handle ISO string or other string formats
            else if (typeof timestamp === "string") {
                date = new Date(timestamp);
            }
            // Handle Date object
            else if (timestamp instanceof Date) {
                date = timestamp;
            }
            // Fallback
            else {
                date = new Date(timestamp);
            }

            // Validate the date
            if (isNaN(date.getTime())) {
                return null;
            }

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
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
                <h3 className="mb-4 text-lg font-bold text-[var(--text-primary)]">Job Overview</h3>

                <div className="space-y-4">
                    {/* Date Posted */}
                    <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-foreground0">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground0">Date Posted</p>
                            <p className="text-sm font-semibold text-[var(--text-secondary)]">{postedDate || "Recently"}</p>
                        </div>
                    </div>

                    {/* Closing Date */}
                    {deadline && (
                        <div className="flex items-start gap-3">
                            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--amber-bg)] text-amber-500">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground0">Closing Date</p>
                                <p className="text-sm font-semibold text-[var(--text-secondary)]">{deadline}</p>
                            </div>
                        </div>
                    )}

                    {/* Location */}
                    <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-foreground0">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground0">Location</p>
                            <p className="text-sm font-semibold text-[var(--text-secondary)]">{job.location}</p>
                            {job.remoteFlag && (
                                <span className="mt-1 inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                                    Remote Available
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Salary */}
                    {getSalaryDisplay(job) && (
                        <div className="flex items-start gap-3">
                            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-foreground0">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground0">Salary</p>
                                <p className="text-sm font-semibold text-[var(--text-secondary)]">{getSalaryDisplay(job)}</p>
                            </div>
                        </div>
                    )}

                    {/* Employment Type */}
                    <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-foreground0">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground0">Job Type</p>
                            <p className="text-sm font-semibold text-[var(--text-secondary)]">{job.employmentType}</p>
                        </div>
                    </div>

                    {/* Category */}
                    {job.category && (
                        <div className="flex items-start gap-3">
                            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-foreground0">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground0">Category</p>
                                <p className="text-sm font-semibold text-[var(--text-secondary)]">{job.category}</p>
                            </div>
                        </div>
                    )}

                    {/* CPIC Required */}
                    {job.cpicRequired && (
                        <div className="flex items-start gap-3">
                            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--amber-bg)] text-amber-500">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground0">Background Check</p>
                                <p className="text-sm font-semibold text-[var(--amber)]">CPIC Required</p>
                            </div>
                        </div>
                    )}

                    {/* Will Train */}
                    {job.willTrain && (
                        <div className="flex items-start gap-3">
                            <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-bg)] text-accent">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-foreground0">Training</p>
                                <p className="text-sm font-semibold text-accent">Will Train</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Employer Card */}
            {job.employerName && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
                    <h3 className="mb-4 text-lg font-bold text-[var(--text-primary)]">About the Employer</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0D9488]/20 to-blue-500/20 text-lg font-bold text-[#0D9488]">
                            {job.employerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            {job.employerId ? (
                                <Link
                                    href={`/employers/${job.employerId}`}
                                    className="font-bold text-[var(--text-primary)] hover:text-[#0D9488] transition-colors"
                                >
                                    {job.employerName}
                                </Link>
                            ) : (
                                <p className="font-bold text-[var(--text-primary)]">{job.employerName}</p>
                            )}
                            {employerProfile?.website && (
                                <a
                                    href={employerProfile.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-[#0D9488] hover:underline"
                                >
                                    Visit Website
                                </a>
                            )}
                        </div>
                    </div>
                    {employerProfile?.description && (
                        <p className="mt-4 text-sm text-foreground0 line-clamp-4">
                            {employerProfile.description}
                        </p>
                    )}
                    {job.employerId && (
                        <Link
                            href={`/employers/${job.employerId}`}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#0D9488]/30 bg-[#0D9488]/10 px-4 py-2.5 text-sm font-semibold text-[#0D9488] transition-colors hover:bg-[#0D9488]/20"
                        >
                            View Employer Profile
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    )}
                </div>
            )}

            {/* Share Job */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
                <h3 className="mb-4 text-lg font-bold text-[var(--text-primary)]">Share this Job</h3>
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
