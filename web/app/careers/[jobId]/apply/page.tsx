"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getJobPosting } from "@/lib/firestore/jobs";
import { getMemberProfile } from "@/lib/firestore/members";
import { createJobApplication } from "@/lib/firestore/applications";
import type { JobPosting, MemberProfile } from "@/lib/types";

const STEPS = [
  { label: "Your Info" },
  { label: "Documents" },
  { label: "Review" },
];

export default function ApplyPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  return (
    <ProtectedRoute>
      <ApplyFlow jobId={jobId} />
    </ProtectedRoute>
  );
}

function ApplyFlow({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [job, setJob] = useState<JobPosting | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [interestStatement, setInterestStatement] = useState("");
  const [portfolioURL, setPortfolioURL] = useState("");
  const [coverLetter, setCoverLetter] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [jobData, memberData] = await Promise.all([
          getJobPosting(jobId),
          user ? getMemberProfile(user.uid) : null,
        ]);
        setJob(jobData);
        setProfile(memberData);
        if (user) {
          setDisplayName(user.displayName || "");
          setEmail(user.email || "");
        }
        if (memberData) {
          setInterestStatement(memberData.tagline || "");
        }
      } catch (err) {
        console.error("Failed to load:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId, user]);

  const handleSubmit = async () => {
    if (!user || !job) return;
    setSubmitting(true);
    try {
      await createJobApplication({
        jobId: job.id,
        employerId: job.employerId,
        memberId: user.uid,
        memberEmail: email,
        memberDisplayName: displayName,
        coverLetter,
        note: interestStatement,
        coverLetterType: "text",
        coverLetterContent: coverLetter,
        portfolioUrls: portfolioURL ? [portfolioURL] : undefined,
      });
      router.push(`/careers/${jobId}/apply/success`);
    } catch (err) {
      console.error("Failed to submit:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <p className="text-[var(--text-muted)]">Job not found</p>
        <Link href="/discover" className="mt-4 text-sm text-accent hover:underline">
          Back to Discover
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-[var(--border)] bg-[var(--card-bg)]">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href={`/careers/${jobId}`} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            &larr; Back to job
          </Link>
          <span className="text-sm font-medium text-[var(--text-primary)]">Apply</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{job.title}</h1>
        <p className="mt-1 text-sm text-accent">{job.employerName}</p>

        <div className="mt-6 mb-8">
          <ProgressBar steps={STEPS} current={step} />
        </div>

        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-6 shadow-sm">
          {/* Step 0: Your Info */}
          {step === 0 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Your Information</h2>
              <p className="text-sm text-[var(--text-muted)]">Pre-filled from your profile. Edit if needed.</p>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Full Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(306) 555-0100"
                  className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Why are you interested?</label>
                <textarea
                  value={interestStatement}
                  onChange={(e) => setInterestStatement(e.target.value)}
                  rows={3}
                  placeholder="What excites you about this role..."
                  className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 1: Documents */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Documents</h2>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Cover Letter</label>
                <textarea
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  rows={6}
                  placeholder="Write your cover letter or paste it here..."
                  className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)] resize-none"
                />
              </div>

              {profile?.resumeUrl && (
                <div className="rounded-xl border border-[var(--card-border)] bg-[var(--accent-bg)] p-4">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Resume on file</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Your saved resume will be included with this application.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Portfolio URL (optional)</label>
                <input
                  type="url"
                  value={portfolioURL}
                  onChange={(e) => setPortfolioURL(e.target.value)}
                  placeholder="https://yourportfolio.com"
                  className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Review & Submit</h2>
              <p className="text-sm text-[var(--text-muted)]">Please review your application before submitting.</p>

              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--card-border)] p-4">
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Applying to</p>
                  <p className="mt-1 font-semibold text-[var(--text-primary)]">{job.title}</p>
                  <p className="text-sm text-accent">{job.employerName}</p>
                </div>

                <div className="rounded-xl border border-[var(--card-border)] p-4">
                  <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Your Details</p>
                  <p className="mt-1 text-sm text-[var(--text-primary)]">{displayName}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{email}</p>
                  {phone && <p className="text-sm text-[var(--text-secondary)]">{phone}</p>}
                </div>

                {interestStatement && (
                  <div className="rounded-xl border border-[var(--card-border)] p-4">
                    <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Interest Statement</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{interestStatement}</p>
                  </div>
                )}

                {coverLetter && (
                  <div className="rounded-xl border border-[var(--card-border)] p-4">
                    <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Cover Letter</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)] whitespace-pre-wrap line-clamp-4">{coverLetter}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
