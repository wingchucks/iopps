"use client";
// Design: Jobs pages use blue gradient hero (--color-blue) — intentional per-content-type color scheme

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Card from "@/components/Card";
import Badge from "@/components/Badge";
import Avatar from "@/components/Avatar";
import type { Job } from "@/lib/firestore/jobs";

const employmentTypes = ["All", "Full-time", "Part-time", "Contract", "Temporary", "Internship"];

function daysAgo(job: Job): string {
  let ts = 0;
  const createdAt = job.createdAt || job.postedAt;
  if (createdAt && typeof createdAt === "object" && createdAt !== null && "seconds" in (createdAt as Record<string, unknown>)) {
    ts = ((createdAt as Record<string, unknown>).seconds as number) * 1000;
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

  const filtered = useMemo(() => {
    let result = jobs;

    // Text search
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((j) => {
        const text = [j.title, j.employerName || j.orgName, j.orgShort, j.location, j.employmentType || j.jobType, j.salary]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(q);
      });
    }

    // Location
    if (locationFilter.trim()) {
      const loc = locationFilter.toLowerCase().trim();
      result = result.filter((j) => j.location?.toLowerCase().includes(loc));
    }

    // Employment type
    if (typeFilter !== "All") {
      result = result.filter((j) => (j.employmentType || j.jobType)?.toLowerCase() === typeFilter.toLowerCase());
    }

    // Remote
    if (remoteOnly) {
      result = result.filter(
        (j) =>
          j.location?.toLowerCase().includes("remote") ||
          j.jobType?.toLowerCase().includes("remote")
      );
    }

    // Salary filter (simple numeric parse)
    const min = parseFloat(salaryMin);
    const max = parseFloat(salaryMax);
    if (!isNaN(min) || !isNaN(max)) {
      result = result.filter((j) => {
        const salStr = getSalaryDisplay(j);
        if (!salStr) return false;
        const nums = salStr.match(/[\d,.]+[kK]?/g);
        if (!nums) return false;
        const parsed = nums
          .map((n) => {
            const cleaned = n.replace(/[^0-9.kK]/g, "");
            const kMatch = cleaned.match(/^([\d.]+)[kK]$/);
            if (kMatch) return parseFloat(kMatch[1]) * 1000;
            const val = parseFloat(cleaned);
            return val > 0 && val < 1000 ? val * 1000 : val;
          })
          .filter((n): n is number => !isNaN(n));
        if (parsed.length === 0) return false;
        const highest = Math.max(...parsed);
        const lowest = Math.min(...parsed);
        if (!isNaN(min) && highest < min) return false;
        if (!isNaN(max) && lowest > max) return false;
        return true;
      });
    }

    return result;
  }, [jobs, search, locationFilter, typeFilter, salaryMin, salaryMax, remoteOnly]);

  return (
    <AppShell>
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <section
        className="text-center"
        style={{
          background: "linear-gradient(160deg, var(--blue) 0%, var(--navy) 60%, var(--navy-light) 100%)",
          padding: "clamp(32px, 5vw, 60px) clamp(20px, 6vw, 80px)",
        }}
      >
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">Jobs</h1>
        <p className="text-base text-white/70 mb-0 max-w-[520px] mx-auto">
          Find your next opportunity with Indigenous and allied organizations
        </p>
      </section>

      {/* Search + Filters */}
      <div className="max-w-[1000px] mx-auto px-4 md:px-10 py-6">
        {/* Search bar */}
        <div
          className="flex items-center gap-3 rounded-2xl mb-4"
          style={{
            padding: "14px 20px",
            background: "var(--card)",
            border: "2px solid var(--border)",
          }}
        >
          <span className="text-xl text-text-muted">&#128269;</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job titles, organizations, locations..."
            className="flex-1 border-none outline-none bg-transparent text-text text-base"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-text-muted text-lg border-none bg-transparent cursor-pointer"
            >
              &#10005;
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {/* Location */}
          <input
            type="text"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            placeholder="City or province..."
            className="outline-none rounded-xl text-sm"
            style={{
              padding: "10px 14px",
              border: "1.5px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
            }}
          />

          {/* Employment type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl text-sm cursor-pointer"
            style={{
              padding: "10px 14px",
              border: "1.5px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
            }}
          >
            {employmentTypes.map((t) => (
              <option key={t} value={t}>
                {t === "All" ? "All types" : t}
              </option>
            ))}
          </select>

          {/* Salary range */}
          <div className="flex gap-2">
            <input
              type="number"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
              placeholder="Min $"
              className="outline-none rounded-xl text-sm w-full"
              style={{
                padding: "10px 14px",
                border: "1.5px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
              }}
            />
            <input
              type="number"
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
              placeholder="Max $"
              className="outline-none rounded-xl text-sm w-full"
              style={{
                padding: "10px 14px",
                border: "1.5px solid var(--border)",
                background: "var(--card)",
                color: "var(--text)",
              }}
            />
          </div>

          {/* Remote toggle */}
          <button
            onClick={() => setRemoteOnly(!remoteOnly)}
            className="flex items-center justify-center gap-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
            style={{
              padding: "10px 14px",
              border: remoteOnly ? "1.5px solid var(--blue)" : "1.5px solid var(--border)",
              background: remoteOnly ? "var(--blue-soft)" : "var(--card)",
              color: remoteOnly ? "var(--blue)" : "var(--text-sec)",
            }}
          >
            <span
              className="inline-block rounded-full"
              style={{
                width: 8,
                height: 8,
                background: remoteOnly ? "var(--blue)" : "var(--border)",
              }}
            />
            Remote
          </button>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-text-muted mb-4">
            {filtered.length} job{filtered.length !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Jobs grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="skeleton h-[180px] rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card style={{ padding: 48, textAlign: "center" }}>
            <p className="text-4xl mb-3">&#128188;</p>
            <h3 className="text-lg font-bold text-text mb-2">No jobs found</h3>
            <p className="text-sm text-text-muted max-w-[400px] mx-auto">
              Check back soon or browse all opportunities in the{" "}
              <Link href="/feed" className="font-semibold no-underline" style={{ color: "var(--blue)" }}>
                feed
              </Link>
              .
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((job) => {
              const slug = job.id.replace(/^job-/, "");
              const posted = daysAgo(job);
              return (
                <Link key={job.id} href={`/jobs/${slug}`} className="no-underline">
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-shadow h-full"
                    style={job.featured ? { borderLeft: '4px solid var(--gold)' } : undefined}
                  >
                    <div style={{ padding: "18px 20px" }}>
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar
                          name={job.employerName || job.orgShort || job.orgName || ""}
                          size={40}
                          gradient="linear-gradient(135deg, var(--navy), var(--blue))"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-text m-0 mb-0.5 line-clamp-2">
                            {job.title}
                          </h3>
                          <p className="text-sm text-teal font-semibold m-0">
                            {job.employerName || job.orgName || job.orgShort}
                            {String((job as unknown as Record<string, unknown>).source || "") !== "" && (
                              <span className="text-xs text-text-muted ml-2 font-normal">
                                via {String((job as unknown as Record<string, unknown>).source)}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {job.location && (
                          <span className="text-xs text-text-sec">&#128205; {job.location}</span>
                        )}
                        {(job.employmentType || job.jobType) && (
                          <Badge text={job.employmentType || job.jobType || ""} color="var(--blue)" bg="var(--blue-soft)" small />
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-2 items-center">
                          {getSalaryDisplay(job) && (
                            <span className="text-xs font-semibold text-text-sec">
                              &#128176; {getSalaryDisplay(job)}
                            </span>
                          )}
                          {posted && (
                            <span className="text-xs text-text-muted">{posted}</span>
                          )}
                        </div>
                        <span
                          className="text-xs font-semibold whitespace-nowrap"
                          style={{ color: "var(--blue)" }}
                        >
                          Apply &#8594;
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {job.featured && (
                          <Badge text="Featured" color="var(--gold)" bg="var(--gold-soft)" small icon={<span>&#11088;</span>} />
                        )}
                        {(() => {
                          const deadline = (job as unknown as Record<string, unknown>).deadline ?? (job as unknown as Record<string, unknown>).closingDate;
                          if (!deadline) return null;
                          const deadlineDate = new Date(deadline as string);
                          if (isNaN(deadlineDate.getTime())) return null;
                          const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                          if (daysLeft > 0 && daysLeft <= 7) {
                            return <Badge text="Closing Soon" color="#C2410C" bg="rgba(251,146,60,.15)" small />;
                          }
                          return null;
                        })()}
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
