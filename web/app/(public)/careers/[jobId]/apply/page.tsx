"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  Card,
  CardContent,
  Button,
  Input,
  Skeleton,
} from "@/components/ui";
import type { JobPosting } from "@/lib/firestore/jobs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobApiResponse {
  job: JobPosting;
}

// ---------------------------------------------------------------------------
// Inner Form Component (rendered inside ProtectedRoute)
// ---------------------------------------------------------------------------

function ApplyForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { user } = useAuth();

  const [job, setJob] = useState<JobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [resumeUrl, setResumeUrl] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Fetch job details for display
  useEffect(() => {
    async function fetchJob() {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) {
          setError("Job not found");
          return;
        }
        const data: JobApiResponse = await res.json();
        setJob(data.job);
      } catch (err) {
        console.error("Failed to fetch job:", err);
        setError("Failed to load job details");
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    // Client-side validation: at least resume or cover letter required
    if (!resumeUrl.trim() && !coverLetter.trim()) {
      setError("Please provide a resume URL or cover letter.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeUrl: resumeUrl.trim() || undefined,
          coverLetter: coverLetter.trim() || undefined,
          note: additionalNotes.trim() || undefined,
          memberEmail: user.email ?? undefined,
          memberDisplayName: user.displayName ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message =
          (data as { error?: string } | null)?.error ||
          "Failed to submit application";
        setError(message);
        return;
      }

      router.push(`/careers/${jobId}/apply/success`);
    } catch (err) {
      console.error("Failed to submit application:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          <Skeleton className="mb-4 h-4 w-24" />
          <Skeleton className="mb-2 h-8 w-3/4" />
          <Skeleton className="mb-8 h-5 w-1/2" />
          <Skeleton variant="rectangular" className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
          <h1 className="text-2xl font-bold text-text-primary">
            Job Not Found
          </h1>
          <p className="mt-3 text-text-secondary">
            This job posting may have been removed or is no longer available.
          </p>
          <div className="mt-8">
            <Button href="/careers">Browse All Jobs</Button>
          </div>
        </div>
      </div>
    );
  }

  const companyName = job.employerName || job.companyName || "Company";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/* Back link */}
        <Link
          href={`/careers/${jobId}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Job
        </Link>

        {/* Job title header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">
            Apply for {job.title}
          </h1>
          <p className="mt-1 text-text-secondary">{companyName}</p>
        </div>

        {/* Application form */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Resume URL */}
              <Input
                label="Resume URL"
                name="resume-url"
                type="url"
                placeholder="https://drive.google.com/your-resume"
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
                helperText="Paste a link to your resume (Google Drive, Dropbox, etc.)"
              />

              {/* Cover Letter */}
              <div className="w-full">
                <label
                  htmlFor="cover-letter"
                  className="mb-1.5 block text-sm font-medium text-text-primary"
                >
                  Cover Letter
                </label>
                <textarea
                  id="cover-letter"
                  name="cover-letter"
                  rows={6}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Tell the employer why you are a great fit for this role..."
                  className="flex w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-text-primary ring-offset-background placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              {/* Additional Notes */}
              <div className="w-full">
                <label
                  htmlFor="additional-notes"
                  className="mb-1.5 block text-sm font-medium text-text-primary"
                >
                  Additional Notes{" "}
                  <span className="font-normal text-text-muted">(optional)</span>
                </label>
                <textarea
                  id="additional-notes"
                  name="additional-notes"
                  rows={3}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Anything else you would like the employer to know..."
                  className="flex w-full rounded-lg border border-input-border bg-input px-3 py-2 text-sm text-text-primary ring-offset-background placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-sm text-error">
                  {error}
                </div>
              )}

              {/* Validation hint */}
              <p className="text-xs text-text-muted">
                A resume URL or cover letter is required to submit your
                application.
              </p>

              {/* Submit button */}
              <div className="flex items-center justify-between pt-2">
                <Link
                  href={`/careers/${jobId}`}
                  className="text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  Cancel
                </Link>
                <Button
                  type="submit"
                  loading={submitting}
                  disabled={submitting}
                  size="lg"
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Export (ProtectedRoute wrapper)
// ---------------------------------------------------------------------------

export default function ApplyPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);

  return (
    <ProtectedRoute>
      <ApplyForm jobId={jobId} />
    </ProtectedRoute>
  );
}
