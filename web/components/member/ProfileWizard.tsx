"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/components/AuthProvider";
import { upsertMemberProfile } from "@/lib/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ProfileWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export default function ProfileWizard({ isOpen, onClose, onComplete }: ProfileWizardProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [location, setLocation] = useState("");
    const [indigenousAffiliation, setIndigenousAffiliation] = useState("");
    const [skills, setSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState("");
    const [resumeUrl, setResumeUrl] = useState("");
    const [uploadingResume, setUploadingResume] = useState(false);

    if (!isOpen || !user) return null;

    const totalSteps = 4;
    const progress = (step / totalSteps) * 100;

    // Handlers
    const handleNext = async () => {
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            await handleComplete();
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleComplete = async () => {
        setSaving(true);
        try {
            await upsertMemberProfile(user.uid, {
                displayName,
                location,
                indigenousAffiliation,
                skills,
                resumeUrl,
                wizardDismissed: true, // Mark as done so it doesn't show again
            });
            onComplete();
        } catch (error) {
            console.error("Error saving profile:", error);
            toast.error("Error saving profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // Skills Logic
    const handleAddSkill = () => {
        const trimmed = skillInput.trim();
        if (trimmed && !skills.includes(trimmed)) {
            setSkills([...skills, trimmed]);
            setSkillInput("");
        }
    };

    const handleRemoveSkill = (skill: string) => {
        setSkills(skills.filter((s) => s !== skill));
    };

    // Resume Logic
    const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size must be less than 5MB");
            return;
        }

        setUploadingResume(true);
        try {
            const resumeRef = ref(storage!, `users/${user.uid}/resumes/${file.name}`);
            await uploadBytes(resumeRef, file);
            const url = await getDownloadURL(resumeRef);
            setResumeUrl(url);
        } catch (error) {
            console.error("Error uploading resume:", error);
            toast.error("Error uploading resume.");
        } finally {
            setUploadingResume(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-background/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-2xl rounded-3xl bg-[#0F172A] shadow-2xl shadow-emerald-900/40 border border-[var(--card-border)]">

                {/* Header / Progress */}
                <div className="relative h-2 w-full overflow-hidden rounded-t-3xl bg-surface">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                {step === 1 && "Welcome to IOPPS! 👋"}
                                {step === 2 && "What are your skills? 🚀"}
                                {step === 3 && "Upload your Resume 📄"}
                                {step === 4 && "You're all set! 🎉"}
                            </h2>
                            <p className="text-[var(--text-muted)] mt-1">
                                {step === 1 && "Let's get your profile set up so you can find the best opportunities."}
                                {step === 2 && "Add your skills to help employers find you."}
                                {step === 3 && "Upload your resume to apply for jobs with one click."}
                                {step === 4 && "Your profile is ready. Good luck with your search!"}
                            </p>
                        </div>
                        {step < 4 && (
                            <button onClick={onClose} className="text-foreground0 hover:text-white transition-colors">
                                Skip
                            </button>
                        )}
                    </div>

                    {/* Content Steps */}
                    <div className="min-h-[300px]">
                        {/* STEP 1: BASICS */}
                        {step === 1 && (
                            <div className="space-y-4 animate-fadeIn">
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Full Name</label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        className="w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Location</label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                                        placeholder="City, Province"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Indigenous Affiliation</label>
                                    <input
                                        type="text"
                                        value={indigenousAffiliation}
                                        onChange={(e) => setIndigenousAffiliation(e.target.value)}
                                        className="w-full rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                                        placeholder="Nation, Community, or Metis Settlement"
                                    />
                                </div>
                            </div>
                        )}

                        {/* STEP 2: SKILLS */}
                        {step === 2 && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={skillInput}
                                        onChange={(e) => setSkillInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleAddSkill()}
                                        className="flex-1 rounded-xl border border-[var(--card-border)] bg-surface px-4 py-3 text-foreground placeholder-slate-500 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/20"
                                        placeholder="Type a skill (e.g. Project Management)"
                                    />
                                    <button
                                        onClick={handleAddSkill}
                                        className="rounded-xl bg-slate-700 px-6 py-3 font-semibold text-white hover:bg-slate-600"
                                    >
                                        Add
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2 mt-4">
                                    {skills.length === 0 && (
                                        <p className="text-foreground0 italic">No skills added yet.</p>
                                    )}
                                    {skills.map((skill) => (
                                        <span key={skill} className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-sm text-accent border border-accent/20">
                                            {skill}
                                            <button onClick={() => handleRemoveSkill(skill)} className="ml-1 hover:text-white">×</button>
                                        </span>
                                    ))}
                                </div>

                                <div className="mt-8">
                                    <p className="text-sm text-[var(--text-muted)] mb-2">Suggestions:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {["Communication", "Leadership", "Microsoft Office", "Customer Service", "Teamwork"].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => !skills.includes(s) && setSkills([...skills, s])}
                                                className="text-xs px-3 py-1 rounded-full bg-surface text-[var(--text-secondary)] hover:bg-slate-700 border border-[var(--card-border)]"
                                            >
                                                + {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: RESUME */}
                        {step === 3 && (
                            <div className="flex flex-col items-center justify-center py-8 animate-fadeIn">
                                {resumeUrl ? (
                                    <div className="w-full p-6 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-accent/20 rounded-lg text-accent">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            </div>
                                            <span className="text-emerald-100 font-medium">Resume Uploaded Successfully!</span>
                                        </div>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-sm text-accent hover:underline"
                                        >
                                            Replace
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full border-2 border-dashed border-[var(--card-border)] rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-accent/50 hover:bg-surface transition-all group"
                                    >
                                        <div className="p-4 bg-surface rounded-full mb-4 group-hover:scale-110 transition-transform">
                                            <svg className="w-8 h-8 text-[var(--text-muted)] group-hover:text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                        </div>
                                        <p className="text-lg font-medium text-foreground">Click to upload Resume</p>
                                        <p className="text-sm text-foreground0 mt-1">PDF, DOC, DOCX (Max 5MB)</p>
                                        {uploadingResume && <p className="mt-4 text-accent animate-pulse">Uploading...</p>}
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    className="hidden"
                                    onChange={handleResumeUpload}
                                />
                            </div>
                        )}

                        {/* STEP 4: COMPLETE */}
                        {step === 4 && (
                            <div className="flex flex-col items-center justify-center py-8 text-center animate-fadeIn">
                                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30">
                                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Profile Completed!</h3>
                                <p className="text-[var(--text-muted)] max-w-md">
                                    You've successfully set up your profile. You can always edit it later or add more details like your education and portfolio.
                                </p>

                                <div className="grid grid-cols-2 gap-4 w-full mt-8">
                                    <button
                                        onClick={onComplete}
                                        className="rounded-xl border border-[var(--card-border)] bg-surface py-4 font-semibold text-white hover:bg-surface transition-colors"
                                    >
                                        View Dashboard
                                    </button>
                                    <Link
                                        href="/careers"
                                        onClick={onComplete}
                                        className="flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-4 font-semibold text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/40 transition-all"
                                    >
                                        Find Jobs
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Buttons */}
                {step < 4 && (
                    <div className="p-6 border-t border-[var(--card-border)] flex justify-between">
                        <button
                            onClick={handleBack}
                            disabled={step === 1}
                            className={`px-6 py-3 rounded-xl font-medium transition-colors ${step === 1 ? "text-slate-600 cursor-not-allowed" : "text-[var(--text-muted)] hover:text-white hover:bg-surface"}`}
                        >
                            Back
                        </button>
                        <button
                            onClick={handleNext}
                            className="bg-accent hover:bg-emerald-400 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                        >
                            {step === 3 ? "Finish" : "Next"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
