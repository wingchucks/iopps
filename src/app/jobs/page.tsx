"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Avatar from "@/components/Avatar";
import type { Job } from "@/lib/firestore/jobs";
import { mixJobsForBrowse, selectFeaturedStripItems } from "@/lib/public-featured";

const employmentTypes = ["All", "Full-time", "Part-time", "Contract", "Temporary", "Internship"];
const JOB_RECENCY_KEYS = ["createdAt", "postedAt", "order"];

function daysAgo(job: Job): string {
  let ts = 0;
  const createdAt = job.createdAt || job.postedAt;
  if (createdAt && typeof createdAt === "object" && createdAt !== null && "seconds" in (createdAt as Record<string, unknown>)) {
    ts = ((createdAt as Record<string, unknown>).seconds as number) * 1000;
  } else if (typeof createdAt === "string") {
    ts = Date.parse(createdAt);
  } else if (job.order) {
    ts = job.order;
  }
  if (!ts) return "";
  const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function getSalaryDisplay(job: Job): string {
  if (job.salary) return job.salary;
  if (!job.salaryRange) return "";
  const sr = job.salaryRange;
  if (sr.disclosed === false) return "";
  const fmt = (n: number) => `$${n.toLocaleString()}`;
  if (sr.min && sr.max) return `${fmt(sr.min)} - ${fmt(sr.max)}`;
  if (sr.min) return `From ${fmt(sr.min)}`;
  if (sr.max) return `Up to ${fmt(sr.max)}`;
  return "";
}

function getEmployerKey(job: Job): string | undefined {
  return job.employerId || job.orgId || job.employerName || job.orgName || job.orgShort || undefined;
}

function getJobHref(job: Job): string {
  return `/jobs/${job.slug || job.id.replace(/^job-/, "")}`;
}

function getClosingSoonLabel(job: Job): string | null {
  const rawDeadline = job.closingDate ?? ((job as unknown as Record<string, unknown>).deadline as string | undefined);
  if (!rawDeadline) return null;

  const deadlineDate = new Date(rawDeadline);
  if (Number.isNaN(deadlineDate.getTime())) return null;

  const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft > 0 && daysLeft <= 7) {
    return daysLeft === 1 ? "Closes tomorrow" : "Closing Soon";
  }

  return null;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/jobs");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setJobs(data.jobs ?? []);
      } catch (err) {
        console.error("Failed to load jobs:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const hasActiveFilters = useMemo(() => (
    Boolean(search.trim())
    || Boolean(locationFilter.trim())
    || typeFilter !== "All"
    || Boolean(salaryMin.trim())
    || Boolean(salaryMax.trim())
    || remoteOnly
  ), [locationFilter, remoteOnly, salaryMax, salaryMin, search, typeFilter]);

  const filtered = useMemo(() => {
    let result = [...jobs];

    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((job) => {
        const text = [
          job.title,
          job.employerName || job.orgName,
          job.orgShort,
          job.location,
          job.employmentType || job.jobType,
          job.salary,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return text.includes(q);
      });
    }

    if (locationFilter.trim()) {
      const location = locationFilter.toLowerCase().trim();
      result = result.filter((job) => job.location?.toLowerCase().includes(location));
    }

    if (typeFilter !== "All") {
      result = result.filter((job) => (job.employmentType || job.jobType)?.toLowerCase() === typeFilter.toLowerCase());
    }

    if (remoteOnly) {
      result = result.filter((job) => (
        job.location?.toLowerCase().includes("remote")
        || job.jobType?.toLowerCase().includes("remote")
        || job.workLocation?.toLowerCase().includes("remote")
        || job.remoteFlag
      ));
    }

    const min = parseFloat(salaryMin);
    const max = parseFloat(salaryMax);
    if (!Number.isNaN(min) || !Number.isNaN(max)) {
      result = result.filter((job) => {
        const salaryDisplay = getSalaryDisplay(job);
        if (!salaryDisplay) return false;

        const values = salaryDisplay.match(/[\d,.]+[kK]?/g);
        if (!values) return false;

        const parsed = values
          .map((value) => {
            const cleaned = value.replace(/[^0-9.kK]/g, "");
            const thousands = cleaned.match(/^([\d.]+)[kK]$/);
            if (thousands) return parseFloat(thousands[1]) * 1000;
            const numeric = parseFloat(cleaned);
            return numeric > 0 && numeric < 1000 ? numeric * 1000 : numeric;
          })
          .filter((value): value is number => !Number.isNaN(value));

        if (parsed.length === 0) return false;

        const highest = Math.max(...parsed);
        const lowest = Math.min(...parsed);
        if (!Number.isNaN(min) && highest < min) return false;
        if (!Number.isNaN(max) && lowest > max) return false;
        return true;
      });
    }

    return result;
  }, [jobs, locationFilter, remoteOnly, salaryMax, salaryMin, search, typeFilter]);

  const featuredJobs = useMemo(() => {
    if (hasActiveFilters) return [];

    return selectFeaturedStripItems(jobs, {
      maxItems: 4,
      getOrgKey: getEmployerKey,
      recencyKeys: JOB_RECENCY_KEYS,
      featuredKeys: ["featuredAt", "updatedAt", "createdAt", "postedAt", "order"],
    });
  }, [hasActiveFilters, jobs]);

  const mixedJobs = useMemo(() => (
    mixJobsForBrowse(filtered, {
      recencyKeys: JOB_RECENCY_KEYS,
      leadingRegularCount: 2,
      firstWindowSize: 12,
      maxFeaturedInFirstWindow: 2,
    })
  ), [filtered]);

  return (
    <AppShell>
      <div className="min-h-screen bg-[#FAFAFA]">
        <section
          className="text-center text-white"
          style={{
            background: "linear-gradient(135deg, #0D9488 0%, #0A0A0A 100%)",
            padding: "clamp(32px, 5vw, 60px) clamp(20px, 6vw, 80px)",
          }}
        >
          <h1 className="mb-2 text-3xl font-extrabold md:text-4xl">Jobs</h1>
          <p className="mx-auto mb-0 max-w-[560px] text-base text-white/78">
            Discover Indigenous and allied employers hiring across Canada.
          </p>
        </section>

        <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-8">
          <div
            className="mb-4 flex items-center gap-3 rounded-[20px] bg-white px-5 py-4 shadow-sm"
            style={{ border: "1px solid rgba(13,148,136,.16)" }}
          >
            <span className="text-xl text-[#0D9488]">&#128269;</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search job titles, employers, locations..."
              className="flex-1 border-none bg-transparent text-base text-[#171717] outline-none placeholder:text-[#737373]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="cursor-pointer border-none bg-transparent text-lg text-[#737373]"
              >
                &#10005;
              </button>
            )}
          </div>

          <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="City or province..."
              className="rounded-xl bg-white px-4 py-3 text-sm text-[#171717] outline-none placeholder:text-[#737373]"
              style={{ border: "1px solid #E5E5E5" }}
            />

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="cursor-pointer rounded-xl bg-white px-4 py-3 text-sm text-[#171717]"
              style={{ border: "1px solid #E5E5E5" }}
            >
              {employmentTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "All" ? "All types" : type}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                placeholder="Min $"
                className="w-full rounded-xl bg-white px-4 py-3 text-sm text-[#171717] outline-none placeholder:text-[#737373]"
                style={{ border: "1px solid #E5E5E5" }}
              />
              <input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                placeholder="Max $"
                className="w-full rounded-xl bg-white px-4 py-3 text-sm text-[#171717] outline-none placeholder:text-[#737373]"
                style={{ border: "1px solid #E5E5E5" }}
              />
            </div>

            <button
              onClick={() => setRemoteOnly(!remoteOnly)}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold transition-colors"
              style={{
                border: remoteOnly ? "1px solid #0D9488" : "1px solid #E5E5E5",
                background: remoteOnly ? "rgba(13,148,136,.08)" : "#FFFFFF",
                color: remoteOnly ? "#0F766E" : "#404040",
              }}
            >
              <span
                className="inline-block rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: remoteOnly ? "#0D9488" : "#D4D4D4",
                }}
              />
              Remote only
            </button>
          </div>

          {!loading && !hasActiveFilters && featuredJobs.length > 0 && (
            <section className="mb-8 rounded-[28px] bg-[#0A0A0A] p-5 text-white shadow-sm md:p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#99F6E4]">
                    Featured Jobs
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Promoted openings from hiring partners
                  </h2>
                  <p className="mt-1 max-w-[560px] text-sm text-white/70">
                    Fresh featured placements, capped at one role per employer.
                  </p>
                </div>
                <p className="text-sm text-white/60">
                  The full results stay mixed below.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {featuredJobs.map((job) => {
                  const employerName = job.employerName || job.orgName || job.orgShort || "Hiring organization";
                  const salary = getSalaryDisplay(job);
                  const posted = daysAgo(job);
                  const closingSoon = getClosingSoonLabel(job);

                  return (
                    <Link key={job.id} href={getJobHref(job)} className="no-underline">
                      <article
                        className="h-full rounded-[24px] p-5 transition-transform duration-200 hover:-translate-y-0.5"
                        style={{
                          border: "1px solid rgba(45,212,191,.18)",
                          background: "linear-gradient(145deg, rgba(20,184,166,.14) 0%, rgba(23,23,23,1) 45%, rgba(10,10,10,1) 100%)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar
                              name={employerName}
                              src={job.companyLogoUrl}
                              size={52}
                              gradient="linear-gradient(135deg, #14B8A6, #0F766E)"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#99F6E4]">
                                Featured Placement
                              </p>
                              <p className="truncate text-sm font-semibold text-white/78">
                                {employerName}
                              </p>
                            </div>
                          </div>
                          {posted && (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-white/70">
                              {posted}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-4 text-xl font-semibold leading-snug text-white">
                          {job.title}
                        </h3>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {job.location && (
                            <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/74">
                              &#128205; {job.location}
                            </span>
                          )}
                          {(job.employmentType || job.jobType) && (
                            <Badge
                              text={job.employmentType || job.jobType || ""}
                              color="#99F6E4"
                              bg="rgba(20,184,166,.16)"
                              small
                            />
                          )}
                          {salary && (
                            <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-white/80">
                              &#128176; {salary}
                            </span>
                          )}
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-2">
                            {closingSoon && (
                              <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#CCFBF1]">
                                {closingSoon}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-[#99F6E4]">
                            View role &#8594;
                          </span>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-[#171717]">
                {hasActiveFilters ? "Matching jobs" : "Latest jobs"}
              </h2>
              <p className="text-sm text-[#525252]">
                {hasActiveFilters
                  ? "Featured placements are hidden while search or filters are active."
                  : "Results stay mixed by recency so promoted jobs do not take over the browse list."}
              </p>
            </div>
            {!loading && (
              <p className="text-sm text-[#737373]">
                {mixedJobs.length} job{mixedJobs.length !== 1 ? "s" : ""} found
              </p>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <div key={index} className="skeleton h-[220px] rounded-2xl" />
              ))}
            </div>
          ) : mixedJobs.length === 0 ? (
            <Card style={{ padding: 48, textAlign: "center" }}>
              <p className="mb-3 text-4xl">&#128188;</p>
              <h3 className="mb-2 text-lg font-bold text-text">No jobs found</h3>
              <p className="mx-auto max-w-[420px] text-sm text-text-muted">
                Try adjusting your filters or browse all public opportunities in{" "}
                <Link href="/feed" className="font-semibold no-underline" style={{ color: "#0D9488" }}>
                  the feed
                </Link>
                .
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {mixedJobs.map((job) => {
                const employerName = job.employerName || job.orgName || job.orgShort || "Hiring organization";
                const salary = getSalaryDisplay(job);
                const posted = daysAgo(job);
                const closingSoon = getClosingSoonLabel(job);

                return (
                  <Link key={job.id} href={getJobHref(job)} className="no-underline">
                    <Card
                      className="h-full cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                      style={job.featured ? { border: "1px solid rgba(13,148,136,.22)" } : undefined}
                    >
                      <div className="flex h-full flex-col p-5">
                        <div className="mb-4 flex items-start gap-3">
                          <Avatar
                            name={employerName}
                            src={job.companyLogoUrl}
                            size={42}
                            gradient="linear-gradient(135deg, #14B8A6, #0F766E)"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <h3 className="flex-1 text-base font-bold leading-snug text-text">
                                {job.title}
                              </h3>
                              {job.featured && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-[#99F6E4]/40 bg-[#CCFBF1] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0F766E]">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#14B8A6]" />
                                  Featured
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm font-semibold text-[#0F766E]">
                              {employerName}
                            </p>
                          </div>
                        </div>

                        <div className="mb-4 flex flex-wrap gap-2">
                          {job.location && (
                            <span className="text-xs text-[#525252]">
                              &#128205; {job.location}
                            </span>
                          )}
                          {(job.employmentType || job.jobType) && (
                            <Badge
                              text={job.employmentType || job.jobType || ""}
                              color="#0F766E"
                              bg="rgba(13,148,136,.1)"
                              small
                            />
                          )}
                        </div>

                        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#525252]">
                          {salary && (
                            <span className="font-semibold text-[#404040]">
                              &#128176; {salary}
                            </span>
                          )}
                          {posted && <span>{posted}</span>}
                          {closingSoon && (
                            <span className="rounded-full bg-[#CCFBF1] px-2.5 py-1 font-semibold text-[#0F766E]">
                              {closingSoon}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-end border-t border-black/5 pt-3">
                          <span className="text-sm font-semibold text-[#0D9488]">
                            View details &#8594;
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
