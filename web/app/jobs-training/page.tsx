"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { listJobPostings, listTrainingPrograms } from "@/lib/firestore";
import type { JobPosting, TrainingProgram } from "@/lib/types";
import { PageShell } from "@/components/PageShell";
import OceanWaveHero from "@/components/OceanWaveHero";

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
    <div className="min-h-screen text-slate-100">
      {/* Ocean Wave Hero */}
      <OceanWaveHero
        eyebrow="Jobs & Training"
        title={
          <>
            Find Your Path.
            <br />
            Build Your Future.
          </>
        }
        subtitle="Discover career opportunities with employers committed to Indigenous hiring, and training programs to build your skills."
        size="md"
      >
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/jobs-training/jobs"
            className="rounded-full bg-white px-6 py-3 text-sm font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Browse Jobs
          </Link>
          <Link
            href="/jobs-training/programs"
            className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            View Training
          </Link>
        </div>
      </OceanWaveHero>

      <PageShell>

      {/* Three Cards Section */}
      <div className="grid gap-6 md:grid-cols-3 mb-12">
        {/* Find Jobs Card */}
        <Link
          href="/jobs-training/jobs"
          className="group rounded-2xl border border-slate-800/80 bg-slate-900/50 p-8 text-left transition-all duration-300 hover:border-[#14B8A6]/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#14B8A6]/10"
        >
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-cyan-500/20">
            <span className="text-2xl">💼</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Find Jobs</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Browse job opportunities from employers committed to Indigenous hiring.
          </p>
          <span className="text-sm font-semibold text-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity">
            Browse Jobs →
          </span>
        </Link>

        {/* Build Skills Card */}
        <Link
          href="/jobs-training/programs"
          className="group rounded-2xl border border-slate-800/80 bg-slate-900/50 p-8 text-left transition-all duration-300 hover:border-[#14B8A6]/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#14B8A6]/10"
        >
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-cyan-500/20">
            <span className="text-2xl">📚</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Build Skills</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Access training from Indigenous institutions — professional, trades, and cultural.
          </p>
          <span className="text-sm font-semibold text-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity">
            Browse Training →
          </span>
        </Link>

        {/* My Dashboard Card */}
        <Link
          href="/member/dashboard"
          className="group rounded-2xl border border-slate-800/80 bg-slate-900/50 p-8 text-left transition-all duration-300 hover:border-[#14B8A6]/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#14B8A6]/10"
        >
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-cyan-500/20">
            <span className="text-2xl">📊</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">My Dashboard</h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            Track applications, continue learning, and manage your certificates.
          </p>
          <span className="text-sm font-semibold text-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity">
            View Dashboard →
          </span>
        </Link>
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

      </PageShell>

      {/* CTA Section - Ocean Wave Style */}
      <section className="relative overflow-hidden">
        <div className="animate-gradient bg-gradient-to-r from-blue-900 via-[#14B8A6]/80 to-cyan-800">
          <div className="bg-gradient-to-b from-white/5 to-transparent">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 text-center">
              <h2 className="text-2xl font-bold text-white sm:text-3xl drop-shadow-lg">
                Are you an employer or training provider?
              </h2>
              <p className="mt-3 text-white/80 max-w-2xl mx-auto">
                Post your opportunities on IOPPS and connect with Indigenous talent across North America.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/organization/jobs/new"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-blue-900 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Post a Job
                </Link>
                <Link
                  href="/organization/training/new"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20"
                >
                  Submit Training Program
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function JobsTrainingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen text-slate-100">
          <OceanWaveHero
            eyebrow="Jobs & Training"
            title="Find Your Path. Build Your Future."
            subtitle="Discover career opportunities with employers committed to Indigenous hiring, and training programs to build your skills."
            size="md"
          />
          <PageShell>
            <div className="grid gap-6 md:grid-cols-3 mb-12">
              <div className="h-64 bg-slate-800/50 rounded-2xl animate-pulse" />
              <div className="h-64 bg-slate-800/50 rounded-2xl animate-pulse" />
              <div className="h-64 bg-slate-800/50 rounded-2xl animate-pulse" />
            </div>
          </PageShell>
        </div>
      }
    >
      <JobsTrainingContent />
    </Suspense>
  );
}
