"use client";

interface JobData {
    indigenousPreference: boolean;
    salaryRange: string;
    closingDate: string;
    quickApplyEnabled: boolean;
    applicationLink: string;
    applicationEmail: string;
    jobVideoUrl: string;
}

interface Step3Props {
    data: JobData;
    updateData: (fields: Partial<JobData>) => void;
    onNext: () => void;
    onBack: () => void;
}

export default function Step3Preferences({
    data,
    updateData,
    onNext,
    onBack,
}: Step3Props) {
    // At least one application method required
    const isValid = data.applicationLink || data.applicationEmail;

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-foreground">Preferences</h2>
                <p className="text-sm text-[var(--text-muted)]">
                    Fine-tune who you're looking for and how they should apply.
                </p>
            </div>

            {/* Toggles */}
            <div className="space-y-4 rounded-xl border border-[var(--card-border)] bg-surface p-6">
                <label className="flex items-center justify-between cursor-pointer">
                    <div>
                        <span className="block font-medium text-foreground">
                            Indigenous Preference
                        </span>
                        <span className="block text-sm text-[var(--text-muted)]">
                            Prioritize Indigenous applicants for this role.
                        </span>
                    </div>
                    <div className={`relative flex h-6 w-11 items-center rounded-full transition-colors ${data.indigenousPreference ? 'bg-accent' : 'bg-slate-700'}`}>
                        <input
                            type="checkbox"
                            checked={data.indigenousPreference}
                            onChange={(e) => updateData({ indigenousPreference: e.target.checked })}
                            className="sr-only"
                        />
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-[var(--card-bg)] transition-transform ${data.indigenousPreference ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                </label>

                <label className="flex items-center justify-between cursor-pointer border-t border-[var(--card-border)] pt-4">
                    <div>
                        <span className="block font-medium text-foreground">
                            Enable Quick Apply
                        </span>
                        <span className="block text-sm text-[var(--text-muted)]">
                            Allow candidates to apply using their IOPPS profile.
                        </span>
                    </div>
                    <div className={`relative flex h-6 w-11 items-center rounded-full transition-colors ${data.quickApplyEnabled ? 'bg-accent' : 'bg-slate-700'}`}>
                        <input
                            type="checkbox"
                            checked={data.quickApplyEnabled}
                            onChange={(e) => updateData({ quickApplyEnabled: e.target.checked })}
                            className="sr-only"
                        />
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-[var(--card-bg)] transition-transform ${data.quickApplyEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                </label>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-foreground">
                        Salary Range (Optional)
                    </label>
                    <input
                        type="text"
                        value={data.salaryRange}
                        onChange={(e) => updateData({ salaryRange: e.target.value })}
                        placeholder="e.g. $60,000 - $80,000"
                        className="mt-1 w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-foreground focus:border-[#14B8A6] focus:outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground">
                        Closing Date (Optional)
                    </label>
                    <input
                        type="date"
                        value={data.closingDate}
                        onChange={(e) => updateData({ closingDate: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-foreground focus:border-[#14B8A6] focus:outline-none"
                    />
                </div>
            </div>

            <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">
                    How should candidates apply?
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <input
                        type="url"
                        value={data.applicationLink}
                        onChange={(e) => updateData({ applicationLink: e.target.value })}
                        placeholder="External ATS URL (https://...)"
                        className="w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-foreground focus:border-[#14B8A6] focus:outline-none"
                    />
                    <input
                        type="email"
                        value={data.applicationEmail}
                        onChange={(e) => updateData({ applicationEmail: e.target.value })}
                        placeholder="Email (jobs@company.com)"
                        className="w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-foreground focus:border-[#14B8A6] focus:outline-none"
                    />
                </div>
                {!isValid && (
                    <p className="mt-2 text-xs text-amber-400">Please provide at least one way to apply (Link or Email).</p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-foreground">
                    Video URL (Optional)
                </label>
                <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="h-5 w-5 text-foreground0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    </div>
                    <input
                        type="url"
                        value={data.jobVideoUrl}
                        onChange={(e) => updateData({ jobVideoUrl: e.target.value })}
                        placeholder="YouTube or Vimeo Link"
                        className="w-full rounded-xl border border-[var(--card-border)] bg-surface py-3 pl-10 pr-4 text-foreground focus:border-[#14B8A6] focus:outline-none"
                    />
                </div>
            </div>

            <div className="flex justify-between pt-6">
                <button
                    onClick={onBack}
                    className="text-sm font-semibold text-[var(--text-muted)] hover:text-foreground"
                >
                    Back
                </button>
                <button
                    onClick={onNext}
                    disabled={!isValid}
                    className="rounded-xl bg-accent px-8 py-3 font-semibold text-[var(--text-primary)] transition-all hover:bg-[#16cdb8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    Next: Preview
                </button>
            </div>
        </div>
    );
}
