"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createJobApplication } from "@/lib/firestore";
import type { JobPosting } from "@/lib/types";
import FileUploader from "@/components/FileUploader";
import {
    PencilSquareIcon,
    ArrowUpTrayIcon,
    TrashIcon,
    PlusCircleIcon,
    DocumentIcon
} from "@heroicons/react/24/outline";

interface QuickApplyButtonProps {
    job: JobPosting;
    memberProfile?: {
        resumeUrl?: string;
        defaultCoverLetter?: string;
        displayName?: string;
    };
}

type CoverLetterType = "text" | "file";

interface UploadedFile {
    name: string;
    url: string;
    path: string;
    type: string;
}

export default function QuickApplyButton({ job, memberProfile }: QuickApplyButtonProps) {
    const { user } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [applying, setApplying] = useState(false);
    const [success, setSuccess] = useState(false);

    // Resume State
    const [resumeSource, setResumeSource] = useState<"saved" | "upload">("saved");
    const [uploadedResume, setUploadedResume] = useState<UploadedFile | null>(null);

    // Cover Letter State
    const [coverLetterType, setCoverLetterType] = useState<CoverLetterType>("text");
    const [coverLetterText, setCoverLetterText] = useState(memberProfile?.defaultCoverLetter || "");
    const [coverLetterFile, setCoverLetterFile] = useState<UploadedFile | null>(null);

    // Additional Documents State
    const [additionalDocs, setAdditionalDocs] = useState<UploadedFile[]>([]);
    const [showAddDoc, setShowAddDoc] = useState(false);

    // Auto-switch to upload mode if no saved resume
    useEffect(() => {
        if (!memberProfile?.resumeUrl) {
            setResumeSource("upload");
        }
    }, [memberProfile]);

    if (!user || !job.quickApplyEnabled) {
        return null;
    }

    const hasResume = !!memberProfile?.resumeUrl;

    async function handleQuickApply() {
        if (!user) return;

        setApplying(true);

        // Determine which resume to use
        const resumeToUse =
            resumeSource === "upload" && uploadedResume
                ? uploadedResume.url
                : memberProfile?.resumeUrl;

        // Validation: Must have a resume
        if (!resumeToUse) {
            alert("Please upload a resume or use your saved resume");
            setApplying(false);
            return;
        }

        // Validation: If uploading cover letter file, must have file
        if (coverLetterType === "file" && !coverLetterFile) {
            alert("Please upload a cover letter file or switch to 'Write Manually'.");
            setApplying(false);
            return;
        }

        try {
            await createJobApplication({
                jobId: job.id,
                memberId: user.uid,
                employerId: job.employerId,
                resumeUrl: resumeToUse,
                memberDisplayName: memberProfile?.displayName || user.email || undefined,

                // Old field compatibility
                coverLetter: coverLetterType === 'text' ? coverLetterText : undefined,

                // New Fields
                coverLetterType,
                coverLetterContent: coverLetterType === 'text' ? coverLetterText : undefined,
                coverLetterUrl: coverLetterFile?.url,
                coverLetterPath: coverLetterFile?.path,
                additionalDocuments: additionalDocs,
            });

            setSuccess(true);
            setTimeout(() => {
                setShowModal(false);
                setSuccess(false);
                // Reset form
                setResumeSource("saved");
                setUploadedResume(null);
                setCoverLetterType('text');
                setCoverLetterText(memberProfile?.defaultCoverLetter || "");
                setCoverLetterFile(null);
                setAdditionalDocs([]);
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
                    <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl my-8">
                        {success ? (
                            <div className="text-center py-8">
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
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-50">Quick Apply</h2>
                                        <p className="mt-2 text-sm text-slate-400">
                                            Apply to <span className="font-semibold text-slate-200">{job.title}</span> at {job.employerName}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="text-slate-500 hover:text-white"
                                    >
                                        <span className="sr-only">Close</span>
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="mt-6 space-y-6">
                                    {/* Resume Section */}
                                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
                                                <DocumentIcon className="h-5 w-5 text-slate-400" />
                                                Resume <span className="text-red-400">*</span>
                                            </h3>
                                        </div>

                                        {/* Toggle between saved resume and upload */}
                                        {hasResume && (
                                            <div className="flex bg-slate-800 rounded-lg p-1 mb-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setResumeSource("saved")}
                                                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${resumeSource === "saved"
                                                            ? "bg-slate-700 text-white shadow-sm"
                                                            : "text-slate-400 hover:text-slate-200"
                                                        }`}
                                                >
                                                    Use Saved Resume
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setResumeSource("upload")}
                                                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${resumeSource === "upload"
                                                            ? "bg-slate-700 text-white shadow-sm"
                                                            : "text-slate-400 hover:text-slate-200"
                                                        }`}
                                                >
                                                    Upload New Resume
                                                </button>
                                            </div>
                                        )}

                                        {/* Saved Resume Display */}
                                        {resumeSource === "saved" && memberProfile?.resumeUrl ? (
                                            <div className="p-3 bg-[#14B8A6]/10 border border-[#14B8A6]/30 rounded-lg">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <DocumentIcon className="h-5 w-5 text-[#14B8A6]" />
                                                        <span className="text-sm text-slate-200">Using your saved resume</span>
                                                    </div>
                                                    <a
                                                        href={memberProfile.resumeUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-[#14B8A6] hover:underline"
                                                    >
                                                        View
                                                    </a>
                                                </div>
                                            </div>
                                        ) : resumeSource === "saved" ? (
                                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                                <p className="text-sm text-red-200">
                                                    ⚠ No resume saved. Please upload one below or add one to your{" "}
                                                    <a href="/member/dashboard" className="underline font-semibold">
                                                        profile
                                                    </a>
                                                    .
                                                </p>
                                            </div>
                                        ) : null}

                                        {/* Resume Upload */}
                                        {resumeSource === "upload" || !memberProfile?.resumeUrl ? (
                                            <div className="space-y-3">
                                                {uploadedResume ? (
                                                    <div className="flex items-center justify-between p-3 bg-[#14B8A6]/10 border border-[#14B8A6]/30 rounded-lg">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <DocumentIcon className="h-5 w-5 text-[#14B8A6] flex-shrink-0" />
                                                            <span className="text-sm text-slate-200 truncate">
                                                                {uploadedResume.name}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setUploadedResume(null)}
                                                            className="text-slate-400 hover:text-red-400 transition-colors"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <FileUploader
                                                        label="Upload Resume (PDF or Word)"
                                                        accept=".pdf,.doc,.docx"
                                                        maxSizeMB={10}
                                                        storagePath={`users/${user.uid}/resumes`}
                                                        onUploadComplete={(url, path, name) => {
                                                            setUploadedResume({ name, url, path, type: "document" });
                                                        }}
                                                        onError={(err) => alert(err)}
                                                        className="border-slate-700"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Cover Letter Section */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="block text-sm font-medium text-slate-200">
                                                Cover Letter (Optional)
                                            </label>
                                            <div className="flex bg-slate-800 rounded-lg p-1">
                                                <button
                                                    onClick={() => setCoverLetterType("text")}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${coverLetterType === "text"
                                                            ? "bg-slate-700 text-white shadow-sm"
                                                            : "text-slate-400 hover:text-slate-200"
                                                        }`}
                                                >
                                                    <PencilSquareIcon className="h-3.5 w-3.5" />
                                                    Write
                                                </button>
                                                <button
                                                    onClick={() => setCoverLetterType("file")}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${coverLetterType === "file"
                                                            ? "bg-slate-700 text-white shadow-sm"
                                                            : "text-slate-400 hover:text-slate-200"
                                                        }`}
                                                >
                                                    <ArrowUpTrayIcon className="h-3.5 w-3.5" />
                                                    Upload
                                                </button>
                                            </div>
                                        </div>

                                        {coverLetterType === "text" ? (
                                            <div>
                                                <textarea
                                                    value={coverLetterText}
                                                    onChange={(e) => setCoverLetterText(e.target.value)}
                                                    rows={6}
                                                    placeholder="Introduce yourself and explain why you're a great fit for this role..."
                                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:border-[#14B8A6] focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
                                                />
                                                <div className="flex justify-between mt-1">
                                                    <p className="text-xs text-slate-500">
                                                        {coverLetterText.length} characters
                                                    </p>
                                                    <a href="/member/tools/cover-letter-builder" target="_blank" className="text-xs text-[#14B8A6] hover:underline flex items-center gap-1">
                                                        Need help? Use our Cover Letter Builder ↗
                                                    </a>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {coverLetterFile ? (
                                                    <div className="flex items-center justify-between p-3 bg-[#14B8A6]/10 border border-[#14B8A6]/30 rounded-lg">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <DocumentIcon className="h-5 w-5 text-[#14B8A6] flex-shrink-0" />
                                                            <span className="text-sm text-slate-200 truncate">{coverLetterFile.name}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => setCoverLetterFile(null)}
                                                            className="text-slate-400 hover:text-red-400 transition-colors"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <FileUploader
                                                        label="Upload Cover Letter (PDF or Word)"
                                                        accept=".pdf,.doc,.docx"
                                                        maxSizeMB={5}
                                                        storagePath={`users/${user.uid}/applications`}
                                                        onUploadComplete={(url, path, name) => {
                                                            setCoverLetterFile({ name, url, path, type: 'document' });
                                                        }}
                                                        onError={(err) => alert(err)}
                                                        className="border-slate-700"
                                                    />
                                                )}
                                                <p className="text-xs text-slate-500">
                                                    Don't have one? <a href="/member/tools/cover-letter-builder" target="_blank" className="text-[#14B8A6] hover:underline">Create one with our builder</a>.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Additional Documents Section */}
                                    <div className="border-t border-slate-800 pt-6">
                                        <h3 className="font-medium text-slate-200 mb-3 flex items-center justify-between">
                                            <span>Additional Documents</span>
                                            <span className="text-xs font-normal text-slate-500">Portfolio, Certifications, etc.</span>
                                        </h3>

                                        {additionalDocs.length > 0 && (
                                            <div className="space-y-2 mb-3">
                                                {additionalDocs.map((doc, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg border border-slate-700">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <DocumentIcon className="h-4 w-4 text-slate-400" />
                                                            <a href={doc.url} target="_blank" className="text-sm text-slate-300 hover:text-[#14B8A6] truncate">{doc.name}</a>
                                                        </div>
                                                        <button
                                                            onClick={() => setAdditionalDocs(prev => prev.filter((_, i) => i !== idx))}
                                                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                                                        >
                                                            <TrashIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {showAddDoc ? (
                                            <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-semibold text-slate-400 uppercase">New Document</span>
                                                    <button onClick={() => setShowAddDoc(false)} className="text-xs text-slate-500 hover:text-white">Cancel</button>
                                                </div>
                                                <FileUploader
                                                    label="Select File"
                                                    accept=".pdf,.doc,.docx,.jpg,.png"
                                                    maxSizeMB={10}
                                                    storagePath={`users/${user.uid}/applications`}
                                                    onUploadComplete={(url, path, name) => {
                                                        const type = name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx') ? 'document' : 'image';
                                                        setAdditionalDocs(prev => [...prev, { name, url, path, type }]);
                                                        setShowAddDoc(false);
                                                    }}
                                                    onError={(err) => alert(err)}
                                                />
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowAddDoc(true)}
                                                className="flex items-center gap-2 text-sm text-[#14B8A6] hover:text-[#0F9488] transition-colors font-medium hover:bg-[#14B8A6]/5 px-3 py-2 rounded-lg -ml-3"
                                            >
                                                <PlusCircleIcon className="h-5 w-5" />
                                                Add Another Document
                                            </button>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3 pt-4 border-t border-slate-800">
                                        <button
                                            onClick={handleQuickApply}
                                            disabled={applying || !((resumeSource === "saved" && hasResume) || (resumeSource === "upload" && uploadedResume))}
                                            className="flex-1 rounded-full bg-gradient-to-r from-[#14B8A6] to-[#0B8A7A] px-6 py-3 font-semibold text-slate-900 shadow-lg shadow-[#14B8A6]/20 transition-all hover:shadow-[#14B8A6]/30 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {applying ? "Submitting Application..." : "Submit Application"}
                                        </button>
                                        <button
                                            onClick={() => setShowModal(false)}
                                            disabled={applying}
                                            className="px-6 py-3 font-semibold text-slate-400 hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
