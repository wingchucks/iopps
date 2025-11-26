"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createJobApplication } from "@/lib/firestore";
import type { JobPosting } from "@/lib/types";

interface QuickApplyButtonProps {
    job: JobPosting;
    memberProfile?: {
        resumeUrl?: string;
        defaultCoverLetter?: string;
        displayName?: string;
    };
}

export default function QuickApplyButton({ job, memberProfile }: QuickApplyButtonProps) {
    const { user } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [applying, setApplying] = useState(false);
    const [coverLetter, setCoverLetter] = useState(memberProfile?.defaultCoverLetter || "");
    const [success, setSuccess] = useState(false);

    if (!user || !job.quickApplyEnabled) {
        return null;
    }

    const hasResume = !!memberProfile?.resumeUrl;

    async function handleQuickApply() {
        if (!user || !memberProfile) return;

        setApplying(true);

        try {
            await createJobApplication({
                jobId: job.id,
                memberId: user.uid,
                employerId: job.employerId,
                resumeUrl: memberProfile.resumeUrl,
                coverLetter: coverLetter.trim() || undefined,
                memberDisplayName: memberProfile.displayName || user.email || undefined,
            });

            setSuccess(true);
            setTimeout(() => {
                setShowModal(false);
                setSuccess(false);
            }, 2000);
        } catch (error) {
            console.error("Quick apply error:", error);
            alert("Failed to submit application. Please try again.");
        } finally {
            setApplying(false);
        }
    }

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="rounded-full bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition hover:bg-[#0F9488]"
            >
                ⚡ Quick Apply
            </button>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
                        {success ? (
                            <div className="text-center">
                                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                                    <svg
                                        className="h-8 w-8 text-green-400"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-slate-50">Application Submitted!</h3>
                                <p className="mt-2 text-slate-400">
                                    Your application has been sent to {job.employerName || "the employer"}.
                                </p>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-2xl font-bold text-slate-50">Quick Apply</h2>
                                <p className="mt-2 text-sm text-slate-400">
                                    Apply to <span className="font-semibold text-slate-200">{job.title}</span> at {job.employerName}
                                </p>

                                <div className="mt-6 space-y-4">
                                    {/* Resume Section */}
                                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold text-slate-100">Resume</h3>
                                                {hasResume ? (
                                                    <p className="mt-1 text-sm text-slate-400">
                                                        ✓ Using your saved resume
                                                    </p>
                                                ) : (
                                                    <p className="mt-1 text-sm text-red-400">
                                                        ⚠ No resume uploaded. Please add one to your profile first.
                                                    </p>
                                                )}
                                            </div>
                                            {hasResume && (
                                                <a
                                                    href={memberProfile.resumeUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-[#14B8A6] hover:underline"
                                                >
                                                    View Resume
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Cover Letter Section */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-200">
                                            Cover Letter (Optional)
                                        </label>
                                        <textarea
                                            value={coverLetter}
                                            onChange={(e) => setCoverLetter(e.target.value)}
                                            rows={6}
                                            placeholder="Introduce yourself and explain why you're a great fit for this role..."
                                            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30"
                                        />
                                        <p className="mt-1 text-xs text-slate-500">
                                            {coverLetter.length} characters
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={handleQuickApply}
                                            disabled={applying || !hasResume}
                                            className="flex-1 rounded-lg bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition hover:bg-[#0F9488] disabled:opacity-50"
                                        >
                                            {applying ? "Submitting..." : "Submit Application"}
                                        </button>
                                        <button
                                            onClick={() => setShowModal(false)}
                                            disabled={applying}
                                            className="flex-1 rounded-lg border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition hover:border-slate-600 disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                    </div>

                                    {!hasResume && (
                                        <p className="text-center text-sm text-slate-400">
                                            Go to your{" "}
                                            <a href="/member/dashboard" className="text-[#14B8A6] hover:underline">
                                                profile
                                            </a>{" "}
                                            to upload your resume
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
