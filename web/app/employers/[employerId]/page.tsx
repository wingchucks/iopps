import { notFound } from "next/navigation";
import Link from "next/link";
import { getEmployerProfile, listEmployerJobs } from "@/lib/firestore";
import type { EmployerProfile, JobPosting } from "@/lib/types";
import EmployerInterviewSection from "@/components/employer/EmployerInterviewSection";
import ShareButtons from "@/components/ShareButtons";

type PageProps = {
  params: {
    employerId: string;
  };
};

export default async function EmployerPublicProfilePage({ params }: PageProps) {
  const { employerId } = params;

  let profile: EmployerProfile | null = null;
  let jobs: JobPosting[] = [];
  let error: string | null = null;

  try {
    profile = await getEmployerProfile(employerId);
    if (!profile) {
      notFound();
    }
    jobs = await listEmployerJobs(employerId);
    // Filter to only show active jobs
    jobs = jobs.filter((job) => job.active !== false);
  } catch (err) {
    console.error("Error loading employer profile:", err);
    error = "Failed to load employer profile";
  }

  if (error || !profile) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Error loading profile
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          {error || "Employer not found"}
        </p>
        <Link
          href="/jobs"
          className="mt-4 inline-flex rounded-md bg-[#14B8A6] px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-[#14B8A6]/90 transition-colors"
        >
          Browse jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      {/* Header Section */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-lg">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          {/* Logo */}
          {profile.logoUrl && (
            <div className="flex-shrink-0">
              <img
                src={profile.logoUrl}
                alt={`${profile.organizationName} logo`}
                className="h-24 w-24 rounded-lg object-cover border border-slate-700"
              />
            </div>
          )}

          {/* Organization Info */}
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.3em] text-[#14B8A6]">
              Employer profile
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">
              {profile.organizationName}
            </h1>

            {profile.location && (
              <p className="mt-2 text-sm text-slate-400">
                📍 {profile.location}
              </p>
            )}

            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-sm text-[#14B8A6] hover:underline"
              >
                🌐 {profile.website}
              </a>
            )}
          </div>
        </div>

        {/* Description */}
        {profile.description && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              About
            </h2>
            <p className="mt-2 text-sm text-slate-300 whitespace-pre-line">
              {profile.description}
            </p>
          </div>
        )}

        {/* TRC #92 Badge */}
        <div className="mt-6 rounded-xl border border-[#14B8A6]/30 bg-[#14B8A6]/5 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="h-6 w-6 flex-shrink-0 text-[#14B8A6]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-semibold text-[#14B8A6]">
                Truth and Reconciliation Commitment
              </p>
              <p className="mt-1 text-xs text-slate-400">
                This employer is committed to TRC Call to Action #92: meaningful
                consultation, building respectful relationships, and creating
                opportunities for Indigenous peoples.
              </p>
            </div>
          </div>
        </div>

        {/* Share Buttons */}
        <div className="mt-6 pt-6 border-t border-slate-800">
          <ShareButtons
            title={`${profile.organizationName} - Employer Profile on IOPPS`}
            description={profile.description?.substring(0, 150) + '...' || `Learn more about ${profile.organizationName} and their commitment to Indigenous employment`}
          />
        </div>
      </section>

      {/* Employer Interview Section */}
      {profile.interviews && profile.interviews.length > 0 && (
        <EmployerInterviewSection employer={profile} />
      )}

      {/* Active Jobs Section */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-50">
              Active job postings
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {jobs.length} {jobs.length === 1 ? "position" : "positions"} currently available
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="block rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-[#14B8A6] hover:bg-slate-900"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-100">{job.title}</h3>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span>📍 {job.location}</span>
                      <span>•</span>
                      <span>{job.employmentType}</span>
                      {job.remoteFlag && (
                        <>
                          <span>•</span>
                          <span>Remote/Hybrid</span>
                        </>
                      )}
                      {job.salaryRange && (
                        <>
                          <span>•</span>
                          <span>{job.salaryRange}</span>
                        </>
                      )}
                    </div>
                    {job.indigenousPreference && (
                      <span className="mt-2 inline-block rounded-full bg-[#14B8A6]/10 px-3 py-1 text-xs text-[#14B8A6]">
                        Indigenous preference
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#14B8A6] hover:underline">
                    View details →
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-8 text-center">
              <p className="text-sm text-slate-400">
                This employer has no active job postings at the moment.
              </p>
              <Link
                href="/jobs"
                className="mt-4 inline-flex rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-[#14B8A6] hover:text-[#14B8A6] transition-colors"
              >
                Browse all jobs
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Back to Jobs Link */}
      <div className="text-center">
        <Link
          href="/jobs"
          className="inline-flex text-sm text-slate-400 hover:text-[#14B8A6] transition-colors"
        >
          ← Back to all jobs
        </Link>
      </div>
    </div>
  );
}
