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

  const inputSurfaceStyle = {
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
  } satisfies React.CSSProperties;

  const featuredSectionStyle = {
    border: "1px solid color-mix(in srgb, var(--teal) 22%, var(--border))",
    background: "linear-gradient(145deg, color-mix(in srgb, var(--teal) 18%, var(--card)) 0%, var(--card) 58%, color-mix(in srgb, var(--card) 84%, var(--bg)) 100%)",
  } satisfies React.CSSProperties;

  const featuredCardStyle = {
    border: "1px solid color-mix(in srgb, var(--teal) 20%, var(--border))",
    background: "linear-gradient(150deg, color-mix(in srgb, var(--teal) 14%, var(--card)) 0%, var(--card) 60%, color-mix(in srgb, var(--card) 88%, var(--bg)) 100%)",
  } satisfies React.CSSProperties;

  return (
    <AppShell>
      <div className="min-h-screen bg-bg text-text transition-colors">
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
            className="mb-4 flex items-center gap-3 rounded-[20px] px-5 py-4 shadow-sm transition-colors"
            style={{
              ...inputSurfaceStyle,
              border: "1px solid color-mix(in srgb, var(--teal) 16%, var(--border))",
            }}
          >
            <span className="text-xl text-[#0D9488]">&#128269;</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search job titles, employers, locations..."
              className="flex-1 border-none bg-transparent text-base text-text outline-none placeholder:text-text-muted"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="cursor-pointer border-none bg-transparent text-lg text-text-muted"
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
              className="rounded-xl px-4 py-3 text-sm text-text outline-none placeholder:text-text-muted transition-colors"
              style={inputSurfaceStyle}
            />

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="cursor-pointer rounded-xl px-4 py-3 text-sm text-text transition-colors"
              style={inputSurfaceStyle}
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
                className="w-full rounded-xl px-4 py-3 text-sm text-text outline-none placeholder:text-text-muted transition-colors"
                style={inputSurfaceStyle}
              />
              <input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                placeholder="Max $"
                className="w-full rounded-xl px-4 py-3 text-sm text-text outline-none placeholder:text-text-muted transition-colors"
                style={inputSurfaceStyle}
              />
            </div>

            <button
              onClick={() => setRemoteOnly(!remoteOnly)}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
              style={{
                border: remoteOnly
                  ? "1px solid color-mix(in srgb, var(--teal) 70%, var(--border))"
                  : "1px solid var(--border)",
                background: remoteOnly
                  ? "color-mix(in srgb, var(--teal) 12%, var(--card))"
                  : "var(--card)",
                color: remoteOnly ? "var(--teal)" : "var(--text-sec)",
              }}
            >
              <span
                className="inline-block rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: remoteOnly
                    ? "var(--teal)"
                    : "color-mix(in srgb, var(--text-muted) 55%, var(--border))",
                }}
              />
              Remote only
            </button>
          </div>

          {!loading && !hasActiveFilters && featuredJobs.length > 0 && (
            <section
              className="mb-8 rounded-[28px] p-5 text-text shadow-sm transition-colors md:p-6"
              style={featuredSectionStyle}
            >
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#99F6E4]">
                    Featured Jobs
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-text">
                    Promoted openings from hiring partners
                  </h2>
                  <p className="mt-1 max-w-[560px] text-sm text-text-sec">
                    Fresh featured placements, capped at one role per employer.
                  </p>
                </div>
                <p className="text-sm text-text-muted">
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
                        style={featuredCardStyle}
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
                              <p className="truncate text-sm font-semibold text-text-sec">
                                {employerName}
                              </p>
                            </div>
                          </div>
                          {posted && (
                            <span
                              className="rounded-full px-3 py-1 text-[11px] font-semibold text-text-muted"
                              style={{
                                border: "1px solid color-mix(in srgb, var(--text-muted) 16%, var(--border))",
                                background: "color-mix(in srgb, var(--card) 86%, var(--bg))",
                              }}
                            >
                              {posted}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-4 text-xl font-semibold leading-snug text-text">
                          {job.title}
                        </h3>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {job.location && (
                            <span
                              className="rounded-full px-3 py-1 text-xs text-text-sec"
                              style={{
                                border: "1px solid color-mix(in srgb, var(--text-muted) 16%, var(--border))",
                                background: "color-mix(in srgb, var(--card) 88%, var(--bg))",
                              }}
                            >
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
                            <span
                              className="rounded-full px-3 py-1 text-xs font-semibold text-text"
                              style={{
                                border: "1px solid color-mix(in srgb, var(--text-muted) 16%, var(--border))",
                                background: "color-mix(in srgb, var(--card) 88%, var(--bg))",
                              }}
                            >
                              &#128176; {salary}
                            </span>
                          )}
                        </div>

                        <div className="mt-5 flex items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-2">
                            {closingSoon && (
                              <span
                                className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F766E]"
                                style={{ background: "color-mix(in srgb, var(--teal) 16%, var(--card))" }}
                              >
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
              <h2 className="text-2xl font-semibold text-text">
                {hasActiveFilters ? "Matching jobs" : "Latest jobs"}
              </h2>
              <p className="text-sm text-text-sec">
                {hasActiveFilters
                  ? "Featured placements are hidden while search or filters are active."
                  : "Results stay mixed by recency so promoted jobs do not take over the browse list."}
              </p>
            </div>
            {!loading && (
              <p className="text-sm text-text-muted">
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
                      style={job.featured ? { border: "1px solid color-mix(in srgb, var(--teal) 22%, var(--border))" } : undefined}
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
                                <span
                                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                                  style={{
                                    border: "1px solid color-mix(in srgb, var(--teal) 35%, var(--border))",
                                    background: "color-mix(in srgb, var(--teal) 12%, var(--card))",
                                    color: "var(--teal)",
                                  }}
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-teal-light" />
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
                            <span className="text-xs text-text-sec">
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

                        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-text-sec">
                          {salary && (
                            <span className="font-semibold text-text">
                              &#128176; {salary}
                            </span>
                          )}
                          {posted && <span>{posted}</span>}
                          {closingSoon && (
                            <span
                              className="rounded-full px-2.5 py-1 font-semibold"
                              style={{
                                background: "color-mix(in srgb, var(--teal) 12%, var(--card))",
                                color: "var(--teal)",
                              }}
                            >
                              {closingSoon}
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-end border-t border-border pt-3">
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
