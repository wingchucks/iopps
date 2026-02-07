"use client";

import type { EmployerProfile } from "@/lib/types";

// Field mapping select component (defined outside to avoid recreation on each render)
interface FieldMappingSelectProps {
    label: string;
    field: keyof FieldMappings;
    required?: boolean;
    fieldMappings: FieldMappings;
    availableFields: string[];
    onUpdateMapping: (field: keyof FieldMappings, value: string) => void;
}

function FieldMappingSelect({
    label,
    field,
    required = false,
    fieldMappings,
    availableFields,
    onUpdateMapping,
}: FieldMappingSelectProps) {
    return (
        <div>
            <label className="block text-sm font-medium text-foreground">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            <select
                value={fieldMappings[field] || ""}
                onChange={(e) => onUpdateMapping(field, e.target.value)}
                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
            >
                <option value="">Select field</option>
                {availableFields.map((f) => (
                    <option key={f} value={f}>
                        {f}
                    </option>
                ))}
            </select>
        </div>
    );
}

interface FieldMappings {
    jobIdOrUrl?: string;
    title?: string;
    description?: string;
    jobType?: string;
    category?: string;
    experience?: string;
    applyUrl?: string;
    expirationDate?: string;
    featured?: string;
    location?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    remote?: string;
    salaryString?: string;
    salaryFrom?: string;
    salaryTo?: string;
    salaryPeriod?: string;
}

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
    // Keyword filtering
    keywordFilterEnabled: boolean;
    setKeywordFilterEnabled: (value: boolean) => void;
    keywordFilterKeywords: string;
    setKeywordFilterKeywords: (value: string) => void;
    keywordFilterMatchIn: ("title" | "description")[];
    setKeywordFilterMatchIn: (value: ("title" | "description")[]) => void;
    // Field mappings
    fieldMappings: FieldMappings;
    setFieldMappings: (value: FieldMappings) => void;
    availableFields: string[];
    onDetectFields: () => void;
    detectingFields: boolean;
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
    keywordFilterEnabled,
    setKeywordFilterEnabled,
    keywordFilterKeywords,
    setKeywordFilterKeywords,
    keywordFilterMatchIn,
    setKeywordFilterMatchIn,
    fieldMappings,
    setFieldMappings,
    availableFields,
    onDetectFields,
    detectingFields,
}: FeedFormProps) {

    const updateMapping = (field: keyof FieldMappings, value: string) => {
        if (value) {
            // Set the value if not empty
            setFieldMappings({
                ...fieldMappings,
                [field]: value,
            });
        } else {
            // Remove the key entirely if empty (don't set to undefined)
            const newMappings = { ...fieldMappings };
            delete newMappings[field];
            setFieldMappings(newMappings);
        }
    };

    return (
        <>
            {/* Feed URL - Highlighted like SmartJobBoard */}
            <div className="rounded-lg bg-teal-900/30 border border-teal-700/50 p-3 mb-4">
                <div className="flex gap-2">
                    <input
                        type="url"
                        value={feedUrl}
                        onChange={(e) => setFeedUrl(e.target.value)}
                        placeholder="https://example.com/feed/jobs.xml"
                        required
                        className="flex-1 bg-transparent text-teal-200 placeholder-teal-400/60 focus:outline-none text-sm"
                    />
                    <button
                        type="button"
                        onClick={onDetectFields}
                        disabled={!feedUrl || detectingFields}
                        className="rounded-md bg-accent px-3 py-1 text-xs font-medium text-white hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {detectingFields ? "Detecting..." : "Detect Fields"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Import Name */}
                <div>
                    <label className="block text-sm font-medium text-foreground">
                        Import Name <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={feedName}
                        onChange={(e) => setFeedName(e.target.value)}
                        placeholder="e.g., SIGA"
                        required
                        className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
                    />
                </div>

                {/* Select Employer - Dropdown */}
                <div>
                    <label className="block text-sm font-medium text-foreground">
                        Select Employer <span className="text-red-400">*</span>
                    </label>
                    <select
                        value={employerId}
                        onChange={(e) => handleEmployerSelect(e.target.value)}
                        required
                        className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
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
                            className="mt-2 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
                        />
                    )}
                </div>

                {/* Job Expiration */}
                <div>
                    <label className="block text-sm font-medium text-foreground">
                        Job Expiration
                    </label>
                    <select
                        value={jobExpirationType}
                        onChange={(e) => setJobExpirationType(e.target.value as "days" | "feed" | "never")}
                        className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
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
                            className="mt-2 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
                            placeholder="Days until expiration"
                        />
                    )}
                </div>

                {/* Sync Frequency */}
                <div>
                    <label className="block text-sm font-medium text-foreground">
                        Sync Frequency
                    </label>
                    <select
                        value={syncFrequency}
                        onChange={(e) => setSyncFrequency(e.target.value as "manual" | "hourly" | "daily" | "weekly")}
                        className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
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
                <label className="block text-sm font-medium text-foreground">
                    UTM Tracking Tag
                    <span className="ml-2 text-foreground0 font-normal">(optional)</span>
                </label>
                <input
                    type="text"
                    value={utmTrackingTag}
                    onChange={(e) => setUtmTrackingTag(e.target.value)}
                    placeholder="utm_source=siga&utm_medium=jobboard&utm_campaign=autoimport"
                    className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
                />
                <p className="mt-1 text-xs text-foreground0">
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
                        className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-teal-500 focus:ring-offset-background"
                    />
                    <span className="text-sm text-foreground">No-Index by Google</span>
                    <span className="text-xs text-foreground0">(prevent jobs from appearing in search)</span>
                </label>

                {/* Update Existing Jobs */}
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={updateExistingJobs}
                        onChange={(e) => setUpdateExistingJobs(e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-teal-500 focus:ring-offset-background"
                    />
                    <span className="text-sm text-foreground">Update imported jobs on the next import</span>
                    <span className="text-xs text-foreground0">(refresh job data instead of skipping duplicates)</span>
                </label>
            </div>

            {/* Keyword Filtering Section */}
            <div className="mt-6 pt-6 border-t border-[var(--card-border)]">
                <h3 className="text-lg font-semibold text-foreground mb-4">Keyword Filtering</h3>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                    Filter jobs to only import those matching specific keywords. Useful for large feeds like Government of Canada.
                </p>

                <label className="flex items-center gap-3 cursor-pointer mb-4">
                    <input
                        type="checkbox"
                        checked={keywordFilterEnabled}
                        onChange={(e) => setKeywordFilterEnabled(e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-teal-500 focus:ring-offset-background"
                    />
                    <span className="text-sm text-foreground">Enable keyword filtering</span>
                </label>

                {keywordFilterEnabled && (
                    <div className="space-y-4 pl-7">
                        {/* Match In */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Search for keywords in:
                            </label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={keywordFilterMatchIn.includes("title")}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setKeywordFilterMatchIn([...keywordFilterMatchIn, "title"]);
                                            } else {
                                                setKeywordFilterMatchIn(keywordFilterMatchIn.filter(m => m !== "title"));
                                            }
                                        }}
                                        className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-teal-500 focus:ring-offset-background"
                                    />
                                    <span className="text-sm text-[var(--text-secondary)]">Job Title</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={keywordFilterMatchIn.includes("description")}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setKeywordFilterMatchIn([...keywordFilterMatchIn, "description"]);
                                            } else {
                                                setKeywordFilterMatchIn(keywordFilterMatchIn.filter(m => m !== "description"));
                                            }
                                        }}
                                        className="h-4 w-4 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-teal-500 focus:ring-offset-background"
                                    />
                                    <span className="text-sm text-[var(--text-secondary)]">Job Description</span>
                                </label>
                            </div>
                        </div>

                        {/* Custom Keywords */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Custom Keywords
                                <span className="ml-2 text-foreground0 font-normal">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={keywordFilterKeywords}
                                onChange={(e) => setKeywordFilterKeywords(e.target.value)}
                                placeholder="indigenous, first nations, métis, inuit"
                                className="mt-1 w-full rounded-md border border-[var(--card-border)] bg-surface px-3 py-2 text-sm text-foreground focus:border-[#14B8A6] focus:outline-none"
                            />
                            <p className="mt-1 text-xs text-foreground0">
                                Comma-separated. Leave empty to use default Indigenous keywords: indigenous, first nation, first nations, métis, metis, inuit, aboriginal, native, fnmi, reconciliation
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Field Mappings Section */}
            <div className="mt-8 pt-6 border-t border-[var(--card-border)]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Match XML fields from your feed to job fields</h3>
                    {availableFields.length > 0 && (
                        <span className="text-xs text-accent bg-teal-900/30 px-2 py-1 rounded">
                            {availableFields.length} fields detected
                        </span>
                    )}
                </div>

                {availableFields.length === 0 ? (
                    <div className="rounded-lg bg-surface border border-[var(--card-border)] p-4 text-center">
                        <p className="text-sm text-[var(--text-muted)]">
                            Enter the feed URL above and click &quot;Detect Fields&quot; to discover available XML fields.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Core Job Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <FieldMappingSelect label="Job Id or URL" field="jobIdOrUrl" required fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                            <FieldMappingSelect label="Job Title" field="title" required fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                            <FieldMappingSelect label="Job Description" field="description" fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                            <FieldMappingSelect label="Job Type" field="jobType" fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                            <FieldMappingSelect label="Categories" field="category" fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                            <FieldMappingSelect label="Experience" field="experience" fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                            <FieldMappingSelect label="Apply URL" field="applyUrl" fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                            <FieldMappingSelect label="Expiration Date" field="expirationDate" fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                            <FieldMappingSelect label="Featured" field="featured" fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                        </div>

                        {/* Location Fields */}
                        <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Location Fields</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <FieldMappingSelect label="City or Location" field="location" fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                            <FieldMappingSelect label="State" field="state" fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                            <FieldMappingSelect label="Country" field="country" fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                            <FieldMappingSelect label="Zip Code" field="zipCode" fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                            <FieldMappingSelect label="Remote" field="remote" fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                        </div>

                        {/* Salary Fields */}
                        <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Salary Fields</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FieldMappingSelect label="Salary string" field="salaryString" fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                            <div className="md:col-span-2 flex items-center">
                                <span className="text-foreground0 text-sm">OR</span>
                            </div>
                            <FieldMappingSelect label="Salary From" field="salaryFrom" fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                            <FieldMappingSelect label="Salary To" field="salaryTo" fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                            <FieldMappingSelect label="Salary Period" field="salaryPeriod" fieldMappings={fieldMappings} availableFields={availableFields} onUpdateMapping={updateMapping} />
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
