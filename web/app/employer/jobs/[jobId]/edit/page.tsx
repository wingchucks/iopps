"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getJobPosting, updateJobPosting, deleteJobPosting } from "@/lib/firestore";
import type { JobPosting } from "@/lib/types";

const employmentTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Seasonal",
  "Internship",
];

export default function EditJobPage({ params }: { params: { jobId: string } }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [remoteFlag, setRemoteFlag] = useState(false);
  const [indigenousPreference, setIndigenousPreference] = useState(true);
  const [salaryRange, setSalaryRange] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [description, setDescription] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [applicationLink, setApplicationLink] = useState("");
  const [applicationEmail, setApplicationEmail] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!params.jobId) return;

    (async () => {
      try {
        setLoadingJob(true);
        const jobData = await getJobPosting(params.jobId);

        if (!jobData) {
          setError("Job not found");
          setLoadingJob(false);
          return;
        }

        setJob(jobData);

        // Pre-populate form fields
        setTitle(jobData.title || "");
        setLocation(jobData.location || "");
        setEmploymentType(jobData.employmentType || "Full-time");
        setRemoteFlag(jobData.remoteFlag ?? false);
        setIndigenousPreference(jobData.indigenousPreference ?? true);
        // Handle both string and object salary range formats
        if (typeof jobData.salaryRange === "string") {
          setSalaryRange(jobData.salaryRange);
        } else if (jobData.salaryRange && typeof jobData.salaryRange === "object") {
          const { min, max, currency = "CAD" } = jobData.salaryRange;
          if (min && max) {
            setSalaryRange(`$${min.toLocaleString()} - $${max.toLocaleString()} ${currency}`);
          } else if (min) {
            setSalaryRange(`$${min.toLocaleString()}+ ${currency}`);
          } else if (max) {
            setSalaryRange(`Up to $${max.toLocaleString()} ${currency}`);
          } else {
            setSalaryRange("");
          }
        } else {
          setSalaryRange("");
        }

        // Convert Firestore Timestamp to YYYY-MM-DD format
        if (jobData.closingDate) {
          const date = typeof jobData.closingDate === 'string'
            ? new Date(jobData.closingDate)
            : jobData.closingDate.toDate();
          setClosingDate(date.toISOString().split('T')[0]);
        } else {
          setClosingDate("");
        }

        setDescription(jobData.description || "");

        // Convert arrays to newline-separated strings
        setResponsibilities(
          Array.isArray(jobData.responsibilities)
            ? jobData.responsibilities.join("\n")
            : ""
        );
        setQualifications(
          Array.isArray(jobData.qualifications)
            ? jobData.qualifications.join("\n")
            : ""
        );

        setApplicationLink(jobData.applicationLink || "");
        setApplicationEmail(jobData.applicationEmail || "");
        setActive(jobData.active !== false);

        setLoadingJob(false);
      } catch (err) {
        console.error("Error loading job:", err);
        setError("Failed to load job posting");
        setLoadingJob(false);
      }
    })();
  }, [params.jobId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !job) return;

    // Authorization check: only allow the employer who owns the job to edit it
    if (job.employerId !== user.uid) {
      setError("You don't have permission to edit this job posting");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateJobPosting(params.jobId, {
        title,
        location,
        employmentType,
        remoteFlag,
        indigenousPreference,
        salaryRange,
        closingDate,
        description,
        responsibilities: responsibilities
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        qualifications: qualifications
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        applicationLink,
        applicationEmail,
        active,
      });
      router.push("/employer");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Could not update job posting."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!params.jobId) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteJobPosting(params.jobId);
      router.push("/employer");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not delete job posting.");
      setDeleting(false);
    }
  };

  if (loading || loadingJob) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-slate-300">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Please sign in
        </h1>
        <p className="text-sm text-slate-300">
          Sign in as an employer to edit job postings.
        </p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-[#14B8A6] hover:text-[#14B8A6]"
          >
            Register
          </Link>
        </div>
      </div>
    );
  }

  if (role !== "employer") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Employer access required
        </h1>
        <p className="text-sm text-slate-300">
          Switch to an employer account to edit jobs.
        </p>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-red-400">
          {error}
        </h1>
        <Link
          href="/employer"
          className="inline-flex rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Authorization check
  if (job && job.employerId !== user.uid) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-red-400">
          Access denied
        </h1>
        <p className="text-sm text-slate-300">
          You don&rsquo;t have permission to edit this job posting.
        </p>
        <Link
          href="/employer"
          className="inline-flex rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit job posting</h1>
          <p className="mt-2 text-sm text-slate-300">
            Update your job listing. Changes will be visible immediately on the public jobs page.
          </p>
        </div>
        <Link
          href={`/jobs/${params.jobId}`}
          target="_blank"
          className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-[#14B8A6] hover:text-[#14B8A6] transition-colors whitespace-nowrap"
        >
          View public listing
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-100">
            Are you sure you want to delete this job posting?
          </p>
          <p className="mt-1 text-xs text-amber-200">
            This action cannot be undone. All applications will remain accessible in your dashboard.
          </p>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete job posting"}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:border-slate-600 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Job title
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Location
          </label>
          <input
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Employment type
            </label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            >
              {employmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Salary range (optional)
            </label>
            <input
              type="text"
              value={salaryRange}
              onChange={(e) => setSalaryRange(e.target.value)}
              placeholder="$65,000 - $78,000"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={remoteFlag}
              onChange={(e) => setRemoteFlag(e.target.checked)}
            />
            Remote / hybrid friendly
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={indigenousPreference}
              onChange={(e) => setIndigenousPreference(e.target.checked)}
            />
            Indigenous preference / targeted hiring
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Closing date (optional)
          </label>
          <input
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Job description
          </label>
          <textarea
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Responsibilities (one per line)
            </label>
            <textarea
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200">
              Qualifications (one per line)
            </label>
            <textarea
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              rows={5}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200">
            Application link (URL)
          </label>
          <input
            type="url"
            value={applicationLink}
            onChange={(e) => setApplicationLink(e.target.value)}
            placeholder="https://example.com/apply"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-200">
            Application email (optional)
          </label>
          <input
            type="email"
            value={applicationEmail}
            onChange={(e) => setApplicationEmail(e.target.value)}
            placeholder="talent@organization.ca"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-[#14B8A6] focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-400">
            Provide at least one of link or email so community members can apply.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <label className="inline-flex items-center gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4"
            />
            <div>
              <span className="font-medium">Active job posting</span>
              <p className="text-xs text-slate-400">
                Uncheck to pause this posting. Paused jobs won't appear in public listings but applications remain accessible.
              </p>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || deleting}
              className="rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <Link
              href="/employer"
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-600 transition-colors"
            >
              Cancel
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={saving || deleting}
            className="rounded-md border border-red-700 px-4 py-2 text-sm text-red-300 hover:border-red-600 hover:bg-red-900/20 transition-colors disabled:opacity-60"
          >
            Delete job
          </button>
        </div>
      </form>
    </div>
  );
}
