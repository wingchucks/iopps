"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  getJobPosting,
  listJobApplications,
  updateApplicationStatus,
} from "@/lib/firestore";
import type { JobApplication, JobPosting, ApplicationStatus } from "@/lib/types";

export default function EmployerJobApplicationsPage() {
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId;
  const { user, role, loading } = useAuth();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId || !user || role !== "employer") return;
    (async () => {
      try {
        const jobDoc = await getJobPosting(jobId);
        setJob(jobDoc);
        const apps = await listJobApplications(jobId);
        setApplications(apps);
      } catch (err) {
        console.error(err);
        setError("Unable to load applications for this job.");
      } finally {
        setAppsLoading(false);
      }
    })();
  }, [jobId, role, user]);

  const handleStatusChange = async (
    applicationId: string,
    status: ApplicationStatus
  ) => {
    try {
      setUpdatingId(applicationId);
      await updateApplicationStatus(applicationId, status);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status } : app
        )
      );
    } catch (err) {
      console.error(err);
      setError("Could not update application status.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-[var(--text-secondary)]">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Please sign in
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Employers must be signed in to view job applications.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-accent/90 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (role !== "employer") {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Employer access only
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Switch to your employer account to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#14B8A6]">
            Applications
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {job?.title ?? "Job"}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Review and track candidates who have recorded their applications to
            this posting.
          </p>
        </div>
        <Link
          href="/organization"
          className="text-xs text-[#14B8A6] underline"
        >
          Back to dashboard
        </Link>
      </div>

      <section className="rounded-lg border border-[var(--card-border)] bg-slate-900/60 p-4">
        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
        {appsLoading ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading applications...</p>
        ) : applications.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No applications have been recorded for this job yet.
          </p>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className="rounded-md border border-[var(--card-border)] bg-background/40 p-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {app.memberDisplayName || "Applicant"}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {app.memberEmail || "Email not provided"}
                    </p>
                    {app.note && (
                      <p className="mt-2 text-xs text-[var(--text-secondary)]">
                        Note: {app.note}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                    <span className="rounded-full border border-[var(--card-border)] px-3 py-1 uppercase tracking-widest">
                      {app.status}
                    </span>
                    <select
                      value={app.status}
                      disabled={updatingId === app.id}
                      onChange={(e) =>
                        handleStatusChange(
                          app.id,
                          e.target.value as ApplicationStatus
                        )
                      }
                      className="rounded-md border border-[var(--card-border)] bg-surface px-2 py-1 text-xs text-foreground focus:border-[#14B8A6] focus:outline-none"
                    >
                      <option value="submitted">submitted</option>
                      <option value="reviewed">reviewed</option>
                      <option value="shortlisted">shortlisted</option>
                      <option value="rejected">rejected</option>
                      <option value="hired">hired</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
