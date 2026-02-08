"use client";

import { useState } from "react";

interface JobData {
    title: string;
    location: string;
    employmentType: string;
    salaryRange: string;
    organizationName: string; // Passed from parent
    description: string;
    responsibilities: string[];
    qualifications: string[];
}

interface Step2Props {
    data: JobData;
    updateData: (fields: Partial<JobData>) => void;
    onNext: () => void;
    onBack: () => void;
}

export default function Step2Details({
    data,
    updateData,
    onNext,
    onBack,
}: Step2Props) {
    const [generatingAI, setGeneratingAI] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    const handleGenerateWithAI = async () => {
        setGeneratingAI(true);
        setAiError(null);

        try {
            const response = await fetch("/api/ai/job-description", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: data.title,
                    location: data.location,
                    employmentType: data.employmentType,
                    salaryRange: data.salaryRange, // Use if available, else undefined
                    organizationName: data.organizationName,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate description");
            }

            const result = await response.json();
            updateData({
                description: result.description,
                responsibilities: result.responsibilities,
                qualifications: result.qualifications,
            });
        } catch (err) {
            setAiError("AI generation failed. Please try again or write manually.");
        } finally {
            setGeneratingAI(false);
        }
    };

    const isValid =
        data.description &&
        data.responsibilities.length > 0 &&
        data.qualifications.length > 0;

    return (
        <div className="space-y-6">
            <div className="mb-6 flex items-start justify-between">
                <div>
                    <h2 className="text-xl font-bold text-foreground">Job Details</h2>
                    <p className="text-sm text-[var(--text-muted)]">
                        Tell candidates what they&apos;ll be doing and what you need.
                    </p>
                </div>
                <button
                    onClick={handleGenerateWithAI}
                    disabled={generatingAI}
                    className="flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-500 hover:bg-amber-500/20 disabled:opacity-50"
                >
                    {generatingAI ? (
                        <>
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Generating...
                        </>
                    ) : (
                        <>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Auto-Fill with AI
                        </>
                    )}
                </button>
            </div>

            {aiError && <p className="text-sm text-red-400">{aiError}</p>}

            <div>
                <label
                    htmlFor="description"
                    className="block text-sm font-medium text-foreground"
                >
                    Description <span className="text-red-400">*</span>
                </label>
                <textarea
                    id="description"
                    rows={6}
                    value={data.description}
                    onChange={(e) => updateData({ description: e.target.value })}
                    placeholder="Overview of the role and your company..."
                    className="mt-1 w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div>
                    <label
                        htmlFor="responsibilities"
                        className="block text-sm font-medium text-foreground"
                    >
                        Responsibilities <span className="text-red-400">*</span>
                    </label>
                    <p className="text-xs text-foreground0 mb-2">One item per line</p>
                    <textarea
                        id="responsibilities"
                        rows={8}
                        value={data.responsibilities.join("\n")}
                        onChange={(e) =>
                            updateData({ responsibilities: e.target.value.split("\n") })
                        }
                        className="w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
                    />
                </div>
                <div>
                    <label
                        htmlFor="qualifications"
                        className="block text-sm font-medium text-foreground"
                    >
                        Qualifications <span className="text-red-400">*</span>
                    </label>
                    <p className="text-xs text-foreground0 mb-2">One item per line</p>
                    <textarea
                        id="qualifications"
                        rows={8}
                        value={data.qualifications.join("\n")}
                        onChange={(e) =>
                            updateData({ qualifications: e.target.value.split("\n") })
                        }
                        className="w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none"
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
                    Next: Preferences
                </button>
            </div>
        </div>
    );
}
