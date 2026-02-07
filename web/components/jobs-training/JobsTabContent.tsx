"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listJobPostings, getMemberProfile } from "@/lib/firestore";
import { useAuth } from "@/components/AuthProvider";
import JobMatchBadge from "@/components/jobs/JobMatchBadge";
import type { JobPosting, MemberProfile } from "@/lib/types";

const EMPLOYMENT_TYPES = [
  { value: "", label: "All Types" },
  { value: "Full-time", label: "Full-time" },
  { value: "Part-time", label: "Part-time" },
  { value: "Contract", label: "Contract" },
  { value: "Temporary", label: "Temporary" },
  { value: "Internship", label: "Internship" },
];

export function JobsTabContent() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [indigenousOnly, setIndigenousOnly] = useState(false);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);

  // Fetch member profile for logged-in users
  useEffect(() => {
    if (user) {
      getMemberProfile(user.uid).then(setMemberProfile).catch(() => setMemberProfile(null));
    } else {
      setMemberProfile(null);
    }
  }, [user]);

  useEffect(() => {
    loadJobs();
  }, [employmentType, remoteOnly, indigenousOnly]);

  async function loadJobs() {
    setLoading(true);
    try {
      const jobList = await listJobPostings({
        activeOnly: true,
        employmentType: employmentType || undefined,
        remoteOnly: remoteOnly || undefined,
        indigenousOnly: indigenousOnly || undefined,
      });
      setJobs(jobList);
    } catch (error) {
      console.error("Failed to load jobs:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredJobs = jobs.filter((job) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.title.toLowerCase().includes(query) ||
      job.employerName?.toLowerCase().includes(query) ||
      job.location?.toLowerCase().includes(query) ||
      job.description?.toLowerCase().includes(query)
    );
  });

  const formatSalary = (job: JobPosting): string | null => {
    if (!job.salaryRange) return null;
    if (typeof job.salaryRange === "string") return job.salaryRange;
    if (job.salaryRange.min || job.salaryRange.max) {
      const currency = job.salaryRange.currency || "CAD";
      if (job.salaryRange.min && job.salaryRange.max) {
        return `$${job.salaryRange.min.toLocaleString()} - $${job.salaryRange.max.toLocaleString()} ${currency}`;
      }
      if (job.salaryRange.min) return `From $${job.salaryRange.min.toLocaleString()} ${currency}`;
      if (job.salaryRange.max) return `Up to $${job.salaryRange.max.toLocaleString()} ${currency}`;
    }
    return null;
  };

  const hasFilters = searchQuery || employmentType || remoteOnly || indigenousOnly;

  return (
    <div>
      {/* Filters */}
      <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-6 mb-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground0 mb-2 block">
              Search Jobs
            </label>
            <input
              type="text"
              placeholder="Job title, company, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-3 text-sm text-white placeholder:text-foreground0 focus:border-[#14B8A6] focus:outline-none"
            />
          </div>

          {/* Employment Type */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground0 mb-2 block">
              Job Type
            </label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="w-full rounded-lg border border-[var(--card-border)] bg-surface px-4 py-3 text-sm text-white focus:border-[#14B8A6] focus:outline-none"
            >
              {EMPLOYMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-col justify-end gap-3">
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
                className="rounded border-[var(--card-border)] bg-surface text-[#14B8A6] focus:ring-[#14B8A6]"
              />
              Remote Only
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={indigenousOnly}
                onChange={(e) => setIndigenousOnly(e.target.checked)}
                className="rounded border-[var(--card-border)] bg-surface text-[#14B8A6] focus:ring-[#14B8A6]"
              />
              Indigenous Preference
            </label>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex justify-between items-center mb-6">
        <p className="text-[var(--text-muted)]">
          {loading ? "Loading..." : `${filteredJobs.length} jobs found`}
        </p>
        {hasFilters && (
          <button
            onClick={() => {
              setSearchQuery("");
              setEmploymentType("");
              setRemoteOnly(false);
              setIndigenousOnly(false);
            }}
            className="text-sm text-[#14B8A6] hover:text-[#16cdb8]"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-surface h-32" />
          ))}
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <Link
              key={job.id}
              href={`/careers/${job.id}`}
              className="group flex items-center justify-between rounded-2xl border border-[var(--card-border)] bg-surface p-6 transition-all hover:border-[#14B8A6]/50"
            >
              <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20 border border-[#14B8A6]/40">
                  <span className="text-2xl">💼</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-lg font-bold text-white group-hover:text-[#14B8A6] transition-colors">
                      {job.title}
                    </span>
                    {memberProfile && (
                      <JobMatchBadge job={job} profile={memberProfile} showDetails />
                    )}
                    {job.indigenousPreference && (
                      <span className="rounded bg-accent/20 border border-[#14B8A6]/40 px-2 py-0.5 text-xs font-semibold text-[#14B8A6] uppercase">
                        Indigenous Preference
                      </span>
                    )}
                    {job.remoteFlag && (
                      <span className="rounded bg-green-500/20 border border-green-500/40 px-2 py-0.5 text-xs font-semibold text-green-400 uppercase">
                        Remote
                      </span>
                    )}
                    <span className="rounded bg-surface border border-[var(--card-border)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)] uppercase">
                      {job.employmentType}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
                    <span className="text-[#14B8A6] font-medium">{job.employerName}</span>
                    <span>📍 {job.location}</span>
                    {formatSalary(job) && <span>💰 {formatSalary(job)}</span>}
                  </div>
                </div>
              </div>
              <button className="hidden sm:block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[#16cdb8]">
                View Job →
              </button>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-12 text-center">
          <span className="text-5xl mb-4 block">🔍</span>
          <h3 className="text-xl font-bold text-white mb-2">No Jobs Found</h3>
          <p className="text-[var(--text-muted)]">
            {hasFilters
              ? "Try adjusting your search or filters."
              : "New job postings will appear here soon."}
          </p>
        </div>
      )}

      {/* CTA Section */}
      <section className="mt-12 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/50 border border-[var(--card-border)] p-8 text-center">
        <h2 className="text-xl font-bold text-white sm:text-2xl">
          Are You an Employer?
        </h2>
        <p className="mt-2 text-[var(--text-muted)] max-w-xl mx-auto text-sm">
          Post your job openings on IOPPS and connect with Indigenous talent across North America.
        </p>
        <Link
          href="/organization/jobs/new"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 font-semibold text-[var(--text-primary)] hover:bg-[#16cdb8] transition-colors text-sm"
        >
          Post a Job
        </Link>
      </section>
    </div>
  );
}
