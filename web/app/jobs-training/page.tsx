"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { listJobPostings, listTrainingPrograms } from "@/lib/firestore";
import type { JobPosting, TrainingProgram } from "@/lib/types";
import { PageShell } from "@/components/PageShell";

function JobsTrainingContent() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [jobData, programData] = await Promise.all([
          listJobPostings({ activeOnly: true }),
          listTrainingPrograms({ status: "approved", activeOnly: true }),
        ]);
        setJobs(jobData);
        setPrograms(programData);
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const featuredJobs = useMemo(() => {
    return jobs.filter((job) => job.indigenousPreference).slice(0, 3);
  }, [jobs]);

  const featuredPrograms = useMemo(() => {
    return programs.filter((p) => p.featured || p.indigenousFocused).slice(0, 3);
  }, [programs]);

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "professional":
        return "teal";
      case "trades":
        return "amber";
      case "cultural":
        return "sky";
      default:
        return "teal";
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "professional":
        return "💼";
      case "trades":
        return "🔧";
      case "cultural":
        return "🪶";
      default:
        return "📚";
    }
  };

  const formatSalary = (salaryRange?: JobPosting["salaryRange"]): string | null => {
    if (!salaryRange) return null;
    if (typeof salaryRange === "string") return salaryRange;
    if (salaryRange.min || salaryRange.max) {
      const currency = salaryRange.currency || "CAD";
      if (salaryRange.min && salaryRange.max) {
        return `$${salaryRange.min.toLocaleString()} - $${salaryRange.max.toLocaleString()} ${currency}`;
      }
      if (salaryRange.min) return `From $${salaryRange.min.toLocaleString()} ${currency}`;
      if (salaryRange.max) return `Up to $${salaryRange.max.toLocaleString()} ${currency}`;
    }
    return null;
  };

  return (
    <PageShell>
      {/* Breadcrumb */}
      <nav className="mb-8 text-sm text-slate-400">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <span className="mx-2">→</span>
        <span className="text-white">Jobs & Training</span>
      </nav>

      {/* Hero Section */}
      <div className="relative text-center mb-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#14B8A6]">
          Jobs & Training
        </p>
        <h1 className="mt-4 text-4xl font-bold italic tracking-tight text-white sm:text-5xl lg:text-6xl">
          Find Your Path.
          <br />
          Build Your Future.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          Discover career opportunities with employers committed to Indigenous hiring,
          and training programs to build your skills.
        </p>
      </div>

      {/* Three Cards Section */}
      <div className="grid gap-6 md:grid-cols-3 mb-12">
        {/* Find Jobs Card */}
        <Link
          href="/jobs-training/jobs"
          className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-left transition-all hover:border-[#14B8A6]/50 hover:-translate-y-1"
        >
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-[#14B8A6]/20 border border-[#14B8A6]/40">
            <span className="text-2xl">💼</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Find Jobs</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Browse {jobs.length || "100"}+ job opportunities from employers committed to Indigenous hiring.
          </p>
          <span className="text-sm font-semibold text-[#14B8A6] group-hover:translate-x-1 inline-block transition-transform">
            Browse Jobs →
          </span>
        </Link>

        {/* Build Skills Card */}
        <Link
          href="/jobs-training/programs"
          className="group rounded-2xl border border-sky-500/30 bg-slate-900/50 p-8 text-left transition-all hover:border-sky-500/50 hover:-translate-y-1"
        >
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-500/40">
            <span className="text-2xl">📚</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Build Skills</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Access training from Indigenous institutions — professional, trades, and cultural.
          </p>
          <span className="text-sm font-semibold text-sky-400 group-hover:translate-x-1 inline-block transition-transform">
            Browse Training →
          </span>
        </Link>

        {/* My Dashboard Card */}
        <Link
          href="/member/dashboard"
          className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-left transition-all hover:border-amber-500/50 hover:-translate-y-1"
        >
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40">
            <span className="text-2xl">📊</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">My Dashboard</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Track applications, continue learning, and manage your certificates.
          </p>
          <span className="text-sm font-semibold text-amber-400 group-hover:translate-x-1 inline-block transition-transform">
            View Dashboard →
          </span>
        </Link>
      </div>

      {/* Stats Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-[#14B8A6] mb-1">250+</div>
            <div className="text-sm text-slate-400">Active Jobs</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#14B8A6] mb-1">85+</div>
            <div className="text-sm text-slate-400">Training Programs</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#14B8A6] mb-1">120+</div>
            <div className="text-sm text-slate-400">Employers</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#14B8A6] mb-1">45+</div>
            <div className="text-sm text-slate-400">Training Providers</div>
          </div>
        </div>
      </div>

      {/* Featured Jobs Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Featured Jobs</h2>
          <Link
            href="/jobs-training/jobs"
            className="text-sm font-semibold text-[#14B8A6] hover:text-[#16cdb8] transition-colors"
          >
            View All Jobs →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-24" />
            ))}
          </div>
        ) : featuredJobs.length > 0 ? (
          <div className="space-y-4">
            {featuredJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs-training/jobs/${job.id}`}
                className="group flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-[#14B8A6]/50"
              >
                <div className="flex items-center gap-5">
                  <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-[#14B8A6]/20 border border-[#14B8A6]/40">
                    <span className="text-xl">💼</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-lg font-bold text-white group-hover:text-[#14B8A6] transition-colors">
                        {job.title}
                      </span>
                      {job.indigenousPreference && (
                        <span className="rounded bg-[#14B8A6]/20 border border-[#14B8A6]/40 px-2 py-0.5 text-xs font-semibold text-[#14B8A6] uppercase">
                          Indigenous Preference
                        </span>
                      )}
                      <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-xs font-medium text-slate-400 uppercase">
                        {job.employmentType}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                      <span className="text-[#14B8A6] font-medium">{job.employerName}</span>
                      <span>📍 {job.location}</span>
                      {formatSalary(job.salaryRange) && <span>💰 {formatSalary(job.salaryRange)}</span>}
                    </div>
                  </div>
                </div>
                <button className="hidden sm:block rounded-lg bg-[#14B8A6] px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-[#16cdb8]">
                  View Job →
                </button>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
            <p className="text-slate-400">Featured jobs coming soon!</p>
            <Link
              href="/jobs-training/jobs"
              className="mt-4 inline-block text-[#14B8A6] hover:text-[#16cdb8] font-medium"
            >
              Browse all jobs →
            </Link>
          </div>
        )}
      </section>

      {/* Featured Training Section */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Featured Training</h2>
          <Link
            href="/jobs-training/programs"
            className="text-sm font-semibold text-[#14B8A6] hover:text-[#16cdb8] transition-colors"
          >
            View All Training →
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-slate-800/50 h-64" />
            ))}
          </div>
        ) : featuredPrograms.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredPrograms.map((program) => {
              const colorClass = getCategoryColor(program.category);
              return (
                <Link
                  key={program.id}
                  href={`/jobs-training/programs/${program.id}`}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-slate-700"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${colorClass}-500/20 border border-${colorClass}-500/40`}
                    >
                      <span className="text-xl">{getCategoryIcon(program.category)}</span>
                    </div>
                    {program.format && (
                      <span className="rounded-md bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300">
                        {program.format}
                      </span>
                    )}
                  </div>
                  <div className={`text-xs font-semibold text-${colorClass}-400 uppercase mb-1.5`}>
                    {program.providerName}
                  </div>
                  <h3 className="font-bold text-white mb-3 leading-snug line-clamp-2">
                    {program.title}
                  </h3>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-4">
                    {program.duration && <span>⏱ {program.duration}</span>}
                    {program.viewCount && <span>👥 {program.viewCount} enrolled</span>}
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                    <span
                      className={`text-lg font-bold ${
                        program.cost === "Free" || program.fundingAvailable
                          ? "text-[#14B8A6]"
                          : "text-white"
                      }`}
                    >
                      {program.cost || "Free"}
                    </span>
                    <span className={`text-sm font-semibold text-${colorClass}-400`}>
                      Learn More
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
            <p className="text-slate-400">Featured training programs coming soon!</p>
            <Link
              href="/jobs-training/programs"
              className="mt-4 inline-block text-[#14B8A6] hover:text-[#16cdb8] font-medium"
            >
              Browse all programs →
            </Link>
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/50 border border-slate-700 p-8 sm:p-12 text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Are you an employer or training provider?
        </h2>
        <p className="mt-3 text-slate-400 max-w-2xl mx-auto">
          Post your opportunities on IOPPS and connect with Indigenous talent across North America.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/organization/jobs/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#14B8A6] px-6 py-3 font-semibold text-slate-900 transition-all hover:bg-[#0d9488]"
          >
            Post a Job
          </Link>
          <Link
            href="/organization/training/new"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-600 px-6 py-3 font-semibold text-white transition-all hover:border-slate-500 hover:bg-slate-800"
          >
            Submit Training Program
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

export default function JobsTrainingPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div className="text-center mb-16">
            <div className="h-6 w-32 mx-auto bg-slate-800 rounded animate-pulse mb-4" />
            <div className="h-16 w-96 mx-auto bg-slate-800 rounded animate-pulse mb-6" />
            <div className="h-6 w-64 mx-auto bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="grid gap-6 md:grid-cols-3 mb-12">
            <div className="h-64 bg-slate-800/50 rounded-2xl animate-pulse" />
            <div className="h-64 bg-slate-800/50 rounded-2xl animate-pulse" />
            <div className="h-64 bg-slate-800/50 rounded-2xl animate-pulse" />
          </div>
        </PageShell>
      }
    >
      <JobsTrainingContent />
    </Suspense>
  );
}
