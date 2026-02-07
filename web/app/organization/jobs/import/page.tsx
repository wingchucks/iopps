"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { parseJobCSV, ParsedJob } from "@/lib/csv-parser";
import { createJobPosting, getEmployerProfile } from "@/lib/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ImportJobsPage() {
    const { user, role } = useAuth();
    const router = useRouter();
    const [jobs, setJobs] = useState<ParsedJob[]>([]);
    const [step, setStep] = useState<"UPLOAD" | "PREVIEW" | "IMPORTING" | "DONE">("UPLOAD");
    const [organizationName, setOrganizationName] = useState("");

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const parsed = parseJobCSV(text);
            setJobs(parsed);
            setStep("PREVIEW");

            if (user) {
                const profile = await getEmployerProfile(user.uid);
                if (profile) setOrganizationName(profile.organizationName);
            }
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!user) return;
        setStep("IMPORTING");

        let successCount = 0;
        for (const job of jobs) {
            // Skip invalid jobs
            if (job.errors && job.errors.length > 0) continue;

            try {
                // Remove parser metadata
                const { errors: _errors, ...cleanJob } = job as any;

                await createJobPosting({
                    ...cleanJob,
                    employerId: user.uid,
                    employerName: organizationName || "Imported Job",
                    active: false, // Draft
                    paymentStatus: 'pending',
                    productType: 'SINGLE',
                    createdAt: new Date(),
                });
                successCount++;
            } catch (err) {
                console.error("Failed to import job", err);
            }
        }

        setStep("DONE");
    };

    if (!user || role !== "employer") return <div className="p-12 text-center text-[var(--text-secondary)]">Access Restricted</div>;

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="border-b border-[var(--card-border)] bg-surface py-8">
                <div className="mx-auto max-w-4xl px-4">
                    <Link href="/organization/jobs/new" className="text-sm text-[var(--text-muted)] hover:text-white mb-4 block">← Back to Post Job</Link>
                    <h1 className="text-2xl font-bold text-foreground">Bulk Import Jobs</h1>
                    <p className="text-[var(--text-muted)]">Upload a CSV to create multiple job drafts at once.</p>
                </div>
            </div>

            <div className="mx-auto max-w-4xl px-4 mt-8">
                {step === "UPLOAD" && (
                    <div className="bg-surface border border-[var(--card-border)] rounded-2xl p-12 text-center">
                        <div className="mx-auto w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-6">
                            <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        </div>
                        <h3 className="text-lg font-medium text-foreground mb-2">Upload your CSV file</h3>
                        <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm mx-auto">
                            Ensure your CSV has headers like Title, Location, Description, Employment Type, etc.
                        </p>
                        <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-[var(--text-muted)]
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-accent file:text-slate-900
                            hover:file:bg-[#16cdb8]
                            cursor-pointer
                        "/>
                    </div>
                )}

                {step === "PREVIEW" && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-foreground">Preview ({jobs.length} Jobs)</h3>
                            <div className="flex gap-3">
                                <button onClick={() => setStep("UPLOAD")} className="text-[var(--text-muted)] text-sm hover:text-white">Cancel</button>
                                <button onClick={handleImport} className="bg-accent text-slate-900 px-6 py-2 rounded-lg font-bold hover:bg-[#16cdb8]">Import as Drafts</button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {jobs.map((job, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border ${job.errors && job.errors.length > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-[var(--card-border)] bg-surface'}`}>
                                    <h4 className="font-bold text-foreground">{job.title || "Untitled Job"}</h4>
                                    <div className="text-sm text-[var(--text-muted)] mt-1 flex gap-4">
                                        <span>{job.location || "No Location"}</span>
                                        <span>•</span>
                                        <span>{job.employmentType}</span>
                                    </div>
                                    {job.errors && job.errors.length > 0 && (
                                        <div className="mt-2 text-xs text-red-400">
                                            Missing: {job.errors.join(", ")}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {step === "IMPORTING" && (
                    <div className="text-center py-20">
                        <div className="animate-spin h-10 w-10 border-4 border-[#14B8A6] border-t-transparent rounded-full mx-auto mb-4"></div>
                        <h3 className="text-xl font-bold text-foreground">Importing Jobs...</h3>
                    </div>
                )}

                {step === "DONE" && (
                    <div className="text-center py-20 bg-accent/10 border border-accent/30 rounded-2xl">
                        <div className="mx-auto w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-6 text-accent text-3xl">✓</div>
                        <h3 className="text-2xl font-bold text-foreground mb-2">Import Complete!</h3>
                        <p className="text-[var(--text-muted)] mb-8">Your jobs have been saved as drafts. You can review and publish them from your dashboard.</p>
                        <Link href="/organization/jobs" className="bg-accent text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-[#16cdb8]">
                            View My Jobs
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
