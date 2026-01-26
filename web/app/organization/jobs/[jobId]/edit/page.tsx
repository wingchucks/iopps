"use client";

import { FormEvent, useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getJobPosting, updateJobPosting, deleteJobPosting } from "@/lib/firestore";
import type { JobPosting, LocationType, SalaryPeriod, JobCategory } from "@/lib/types";
import { RichTextEditor } from "@/components/forms/RichTextEditor";
import { SalaryRangeInput } from "@/components/forms/SalaryRangeInput";
import { LocationTypeSelector } from "@/components/forms/LocationTypeSelector";
import { CategorySelect, EmploymentTypeSelect } from "@/components/forms/CategorySelect";

// Helper to detect video provider from URL
function detectVideoProvider(url: string): { provider: "youtube" | "vimeo" | "custom"; videoId?: string } {
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    return { provider: "youtube", videoId: youtubeMatch[1] };
  }
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) {
    return { provider: "vimeo", videoId: vimeoMatch[1] };
  }
  return { provider: "custom" };
}

export default function EditJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);

  // Basic job info
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<JobCategory | "">("");
  const [employmentType, setEmploymentType] = useState("Full-time");

  // Location
  const [locationType, setLocationType] = useState<LocationType>("onsite");
  const [locationAddress, setLocationAddress] = useState("");

  // Job flags
  const [indigenousPreference, setIndigenousPreference] = useState(true);
  const [cpicRequired, setCpicRequired] = useState(false);
  const [willTrain, setWillTrain] = useState(false);

  // Salary (using object format to match SalaryRangeInput component)
  const [salaryRange, setSalaryRange] = useState<{
    min?: number;
    max?: number;
    currency?: string;
    period?: SalaryPeriod;
    disclosed?: boolean;
  }>({
    currency: "CAD",
    period: "yearly",
    disclosed: true,
  });

  // Dates
  const [closingDate, setClosingDate] = useState("");

  // Content
  const [description, setDescription] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [qualifications, setQualifications] = useState("");

  // Job video state
  const [jobVideoUrl, setJobVideoUrl] = useState("");
  const [jobVideoTitle, setJobVideoTitle] = useState("");
  const [jobVideoDescription, setJobVideoDescription] = useState("");

  // Status
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    (async () => {
      try {
        setLoadingJob(true);
        const jobData = await getJobPosting(jobId);

        if (!jobData) {
          setError("Job not found");
          setLoadingJob(false);
          return;
        }

        setJob(jobData);

        // Pre-populate form fields
        setTitle(jobData.title || "");
        setCategory(jobData.category || "");
        setEmploymentType(jobData.employmentType || "Full-time");

        // Location
        setLocationType(jobData.locationType || (jobData.remoteFlag ? "remote" : "onsite"));
        setLocationAddress(jobData.location || "");

        // Flags
        setIndigenousPreference(jobData.indigenousPreference ?? true);
        setCpicRequired(jobData.cpicRequired ?? false);
        setWillTrain(jobData.willTrain ?? false);

        // Handle salary range - could be string or object
        if (jobData.salaryRange && typeof jobData.salaryRange === "object") {
          setSalaryRange({
            min: jobData.salaryRange.min,
            max: jobData.salaryRange.max,
            currency: jobData.salaryRange.currency || "CAD",
            period: jobData.salaryRange.period || "yearly",
            disclosed: true,
          });
        } else if (typeof jobData.salaryRange === "string" && jobData.salaryRange) {
          // Try to parse the string format (legacy)
          const match = jobData.salaryRange.match(/\$?([\d,]+)\s*-\s*\$?([\d,]+)/);
          if (match) {
            setSalaryRange({
              min: parseInt(match[1].replace(/,/g, "")),
              max: parseInt(match[2].replace(/,/g, "")),
              currency: "CAD",
              period: "yearly",
              disclosed: true,
            });
          } else {
            setSalaryRange({ currency: "CAD", period: "yearly", disclosed: true });
          }
        } else {
          setSalaryRange({ currency: "CAD", period: "yearly", disclosed: false });
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

        // Load job video if exists
        if (jobData.jobVideo) {
          setJobVideoUrl(jobData.jobVideo.videoUrl || "");
          setJobVideoTitle(jobData.jobVideo.title || "");
          setJobVideoDescription(jobData.jobVideo.description || "");
        }

        setActive(jobData.active !== false);

        setLoadingJob(false);
      } catch (err) {
        console.error("Error loading job:", err);
        setError("Failed to load job posting");
        setLoadingJob(false);
      }
    })();
  }, [jobId]);

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
      // Prepare job video data if provided
      let jobVideo = undefined;
      if (jobVideoUrl.trim()) {
        const { provider, videoId } = detectVideoProvider(jobVideoUrl);
        jobVideo = {
          videoUrl: jobVideoUrl,
          videoProvider: provider,
          videoId,
          title: jobVideoTitle || undefined,
          description: jobVideoDescription || undefined,
        };
      }

      // Prepare salary range for Firestore (only include min/max if defined)
      const salaryRangeData = salaryRange.disclosed === false ? undefined : {
        ...(salaryRange.min !== undefined && { min: salaryRange.min }),
        ...(salaryRange.max !== undefined && { max: salaryRange.max }),
        currency: salaryRange.currency,
        period: salaryRange.period,
      };

      // Determine location string for display
      const displayLocation = locationType === "remote"
        ? "Remote"
        : locationAddress || "Location not specified";

      await updateJobPosting(jobId, {
        title,
        category: category || undefined,
        location: displayLocation,
        locationType,
        employmentType,
        remoteFlag: locationType === "remote" || locationType === "hybrid",
        indigenousPreference,
        cpicRequired,
        willTrain,
        salaryRange: salaryRangeData,
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
        quickApplyEnabled: true, // Always enable Quick Apply as the only application method
        active,
        jobVideo: jobVideo || undefined, // Set to undefined to remove if cleared
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
    if (!jobId) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteJobPosting(jobId);
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
          href="/organization/dashboard"
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
          href="/organization/dashboard"
          className="inline-flex rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit job posting</h1>
          <p className="mt-2 text-sm text-slate-300">
            Update your job listing. Changes will be visible immediately on the public jobs page.
          </p>
        </div>
        <Link
          href={`/jobs-training/${jobId}`}
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

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        {/* Section 1: Basic Information */}
        <section className="space-y-6">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-lg font-semibold text-slate-100">Basic Information</h2>
            <p className="text-sm text-slate-400">Essential details about the position</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Job Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Senior Software Developer"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#14B8A6]"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Category
              </label>
              <CategorySelect
                value={category}
                onChange={(val) => setCategory(val as JobCategory | "")}
                placeholder="Select a category..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Employment Type <span className="text-red-400">*</span>
              </label>
              <EmploymentTypeSelect
                value={employmentType}
                onChange={setEmploymentType}
              />
            </div>
          </div>
        </section>

        {/* Section 2: Location */}
        <section className="space-y-6">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-lg font-semibold text-slate-100">Location</h2>
            <p className="text-sm text-slate-400">Where will this job be performed?</p>
          </div>

          <LocationTypeSelector
            locationType={locationType}
            locationAddress={locationAddress}
            onLocationTypeChange={setLocationType}
            onAddressChange={setLocationAddress}
          />
        </section>

        {/* Section 3: Compensation */}
        <section className="space-y-6">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-lg font-semibold text-slate-100">Compensation</h2>
            <p className="text-sm text-slate-400">Salary information for candidates</p>
          </div>

          <SalaryRangeInput
            value={salaryRange}
            onChange={setSalaryRange}
          />
        </section>

        {/* Section 4: Job Requirements */}
        <section className="space-y-6">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-lg font-semibold text-slate-100">Job Requirements</h2>
            <p className="text-sm text-slate-400">Special requirements and preferences</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/50 cursor-pointer hover:border-slate-600 transition-colors">
              <input
                type="checkbox"
                checked={indigenousPreference}
                onChange={(e) => setIndigenousPreference(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6]"
              />
              <div>
                <span className="block text-sm font-medium text-slate-100">Indigenous Preference</span>
                <span className="text-xs text-slate-400">Targeted hiring for Indigenous candidates</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/50 cursor-pointer hover:border-slate-600 transition-colors">
              <input
                type="checkbox"
                checked={cpicRequired}
                onChange={(e) => setCpicRequired(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
              />
              <div>
                <span className="block text-sm font-medium text-slate-100">CPIC Required</span>
                <span className="text-xs text-slate-400">Background check required</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-700 bg-slate-800/50 cursor-pointer hover:border-slate-600 transition-colors">
              <input
                type="checkbox"
                checked={willTrain}
                onChange={(e) => setWillTrain(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <span className="block text-sm font-medium text-slate-100">Will Train</span>
                <span className="text-xs text-slate-400">On-the-job training provided</span>
              </div>
            </label>
          </div>
        </section>

        {/* Section 5: Job Description */}
        <section className="space-y-6">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-lg font-semibold text-slate-100">Job Description</h2>
            <p className="text-sm text-slate-400">Detailed information about the role</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Description <span className="text-red-400">*</span>
            </label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Describe the role, your company, and what makes this opportunity unique..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Responsibilities (one per line)
              </label>
              <textarea
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                rows={6}
                placeholder="Lead development projects&#10;Collaborate with cross-functional teams&#10;Review code and mentor juniors"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#14B8A6]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">
                Qualifications (one per line)
              </label>
              <textarea
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                rows={6}
                placeholder="5+ years of experience&#10;Bachelor's degree or equivalent&#10;Strong communication skills"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#14B8A6]"
              />
            </div>
          </div>
        </section>

        {/* Section 6: Dates */}
        <section className="space-y-6">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-lg font-semibold text-slate-100">Posting Duration</h2>
            <p className="text-sm text-slate-400">When should this job be visible?</p>
          </div>

          <div className="max-w-xs">
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Closing Date (optional)
            </label>
            <input
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-[#14B8A6]"
            />
            <p className="mt-1 text-xs text-slate-500">Leave blank to keep the job open indefinitely</p>
          </div>
        </section>

        {/* Application Method - Quick Apply Only */}
        <section className="space-y-6">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-lg font-semibold text-slate-100">Application Method</h2>
            <p className="text-sm text-slate-400">How candidates will apply</p>
          </div>

          <div className="rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/5 p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-[#14B8A6] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-slate-100 mb-1">IOPPS Quick Apply Enabled</h3>
                <p className="text-xs text-slate-300">
                  All applications will be received through IOPPS using the <strong>Quick Apply</strong> button.
                  Candidates can apply with their saved profile and resume. View and manage all applications in your{" "}
                  <Link href="/organization/dashboard" className="text-[#14B8A6] hover:underline font-semibold">
                    employer dashboard
                  </Link>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Job Video Section */}
        <section className="space-y-6">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-lg font-semibold text-slate-100">Job Video</h2>
            <p className="text-sm text-slate-400">Optional video to showcase this role</p>
          </div>

          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h3 className="text-sm font-semibold text-purple-300">Add a video (optional)</h3>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Add a video to showcase this specific role - can be an intro from the hiring manager, a day-in-the-life, or team introduction.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-200">
                  Video URL
                </label>
                <input
                  type="url"
                  value={jobVideoUrl}
                  onChange={(e) => setJobVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">Supports YouTube, Vimeo, or custom video URLs</p>
              </div>

              {jobVideoUrl && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-200">
                      Video Title
                    </label>
                    <input
                      type="text"
                      value={jobVideoTitle}
                      onChange={(e) => setJobVideoTitle(e.target.value)}
                      placeholder="e.g., Meet the Team"
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-200">
                      Video Description
                    </label>
                    <textarea
                      value={jobVideoDescription}
                      onChange={(e) => setJobVideoDescription(e.target.value)}
                      placeholder="Brief description of what candidates will see in the video"
                      rows={2}
                      className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Section: Job Status */}
        <section className="space-y-6">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-lg font-semibold text-slate-100">Job Status</h2>
            <p className="text-sm text-slate-400">Control visibility of this posting</p>
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-[#14B8A6] focus:ring-[#14B8A6]"
              />
              <div>
                <span className="text-sm font-medium text-slate-100">Active job posting</span>
                <p className="text-xs text-slate-400">
                  Uncheck to pause this posting. Paused jobs won&apos;t appear in public listings but applications remain accessible.
                </p>
              </div>
            </label>
          </div>
        </section>

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || deleting}
              className="rounded-xl bg-[#14B8A6] px-6 py-2.5 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link
              href="/organization/dashboard"
              className="rounded-xl border border-slate-700 px-6 py-2.5 text-sm text-slate-200 hover:border-slate-600 transition-colors"
            >
              Cancel
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={saving || deleting}
            className="rounded-xl border border-red-700 px-4 py-2.5 text-sm text-red-300 hover:border-red-600 hover:bg-red-900/20 transition-colors disabled:opacity-60"
          >
            Delete Job
          </button>
        </div>
      </form>
    </div>
  );
}
