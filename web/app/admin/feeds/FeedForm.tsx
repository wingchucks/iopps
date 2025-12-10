"use client";

import type { EmployerProfile } from "@/lib/types";

interface FeedFormProps {
    feedUrl: string;
    setFeedUrl: (value: string) => void;
    feedName: string;
    setFeedName: (value: string) => void;
    employerId: string;
    handleEmployerSelect: (id: string) => void;
    employers: EmployerProfile[];
    employerName: string;
    setEmployerName: (value: string) => void;
    jobExpirationType: "days" | "feed" | "never";
    setJobExpirationType: (value: "days" | "feed" | "never") => void;
    jobExpirationDays: number;
    setJobExpirationDays: (value: number) => void;
    syncFrequency: "manual" | "hourly" | "daily" | "weekly";
    setSyncFrequency: (value: "manual" | "hourly" | "daily" | "weekly") => void;
    utmTrackingTag: string;
    setUtmTrackingTag: (value: string) => void;
    noIndexByGoogle: boolean;
    setNoIndexByGoogle: (value: boolean) => void;
    updateExistingJobs: boolean;
    setUpdateExistingJobs: (value: boolean) => void;
}

export default function FeedForm({
    feedUrl,
    setFeedUrl,
    feedName,
    setFeedName,
    employerId,
    handleEmployerSelect,
    employers,
    employerName,
    setEmployerName,
    jobExpirationType,
    setJobExpirationType,
    jobExpirationDays,
    setJobExpirationDays,
    syncFrequency,
    setSyncFrequency,
    utmTrackingTag,
    setUtmTrackingTag,
    noIndexByGoogle,
    setNoIndexByGoogle,
    updateExistingJobs,
    setUpdateExistingJobs,
}: FeedFormProps) {
    return (
        <>
            {/* Feed URL - Highlighted like SmartJobBoard */}
            <div className="rounded-lg bg-teal-900/30 border border-teal-700/50 p-3 mb-4">
                <input
                    type="url"
                    value={feedUrl}
                    onChange={(e) => setFeedUrl(e.target.value)}
                    placeholder="https://example.com/feed/jobs.xml"
                    required
                    className="w-full bg-transparent text-teal-200 placeholder-teal-400/60 focus:outline-none text-sm"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Import Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-200">
                        Import Name <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={feedName}
                        onChange={(e) => setFeedName(e.target.value)}
                        placeholder="e.g., SIGA"
                        required
                        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                    />
                </div>

                {/* Select Employer - Dropdown */}
                <div>
                    <label className="block text-sm font-medium text-slate-200">
                        Select Employer <span className="text-red-400">*</span>
                    </label>
                    <select
                        value={employerId}
                        onChange={(e) => handleEmployerSelect(e.target.value)}
                        required
                        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                    >
                        <option value="">Select an employer...</option>
                        {employers.map((employer) => (
                            <option key={employer.id || employer.userId} value={employer.userId || employer.id}>
                                {employer.organizationName}
                            </option>
                        ))}
                        <option value="rss-imported-employer">-- Other (Manual Entry) --</option>
                    </select>
                    {employerId === "rss-imported-employer" && (
                        <input
                            type="text"
                            value={employerName}
                            onChange={(e) => setEmployerName(e.target.value)}
                            placeholder="Enter employer name manually"
                            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                        />
                    )}
                </div>

                {/* Job Expiration */}
                <div>
                    <label className="block text-sm font-medium text-slate-200">
                        Job Expiration
                    </label>
                    <select
                        value={jobExpirationType}
                        onChange={(e) => setJobExpirationType(e.target.value as "days" | "feed" | "never")}
                        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                    >
                        <option value="feed">Jobs expire if they no longer appear in the feed</option>
                        <option value="days">Jobs expire after X days</option>
                        <option value="never">Jobs never expire automatically</option>
                    </select>
                    {jobExpirationType === "days" && (
                        <input
                            type="number"
                            value={jobExpirationDays}
                            onChange={(e) => setJobExpirationDays(parseInt(e.target.value) || 30)}
                            min={1}
                            max={365}
                            className="mt-2 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                            placeholder="Days until expiration"
                        />
                    )}
                </div>

                {/* Sync Frequency */}
                <div>
                    <label className="block text-sm font-medium text-slate-200">
                        Sync Frequency
                    </label>
                    <select
                        value={syncFrequency}
                        onChange={(e) => setSyncFrequency(e.target.value as "manual" | "hourly" | "daily" | "weekly")}
                        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                    >
                        <option value="manual">Manual only</option>
                        <option value="hourly">Every hour</option>
                        <option value="daily">Once a day</option>
                        <option value="weekly">Once a week</option>
                    </select>
                </div>
            </div>

            {/* UTM Tracking Tag */}
            <div className="mt-4">
                <label className="block text-sm font-medium text-slate-200">
                    UTM Tracking Tag
                    <span className="ml-2 text-slate-500 font-normal">(optional)</span>
                </label>
                <input
                    type="text"
                    value={utmTrackingTag}
                    onChange={(e) => setUtmTrackingTag(e.target.value)}
                    placeholder="utm_source=siga&utm_medium=jobboard&utm_campaign=autoimport"
                    className="mt-1 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">
                    Appended to application URLs for analytics tracking
                </p>
            </div>

            {/* Toggles */}
            <div className="mt-6 space-y-4">
                {/* No-Index by Google */}
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={noIndexByGoogle}
                        onChange={(e) => setNoIndexByGoogle(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-sm text-slate-200">No-Index by Google</span>
                    <span className="text-xs text-slate-500">(prevent jobs from appearing in search)</span>
                </label>

                {/* Update Existing Jobs */}
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={updateExistingJobs}
                        onChange={(e) => setUpdateExistingJobs(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-teal-500 focus:ring-teal-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-sm text-slate-200">Update imported jobs on the next import</span>
                    <span className="text-xs text-slate-500">(refresh job data instead of skipping duplicates)</span>
                </label>
            </div>
        </>
    );
}
