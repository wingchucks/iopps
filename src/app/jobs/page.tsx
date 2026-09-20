"use client";
import { matchesCanadianLocation } from "@/lib/canadian-provinces";
import {
  FormEvent,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import OpportunityHeader from "@/components/OpportunityHeader";
import Card from "@/components/Card";
import EmployerLogo from "@/components/EmployerLogo";
import { addedAt, closesAt, employerLogo, employerName as getEmployerName, jobArea, jobSummary, loadEmployerBrands, matchesDiscoveryFilters, salaryInfo, type EmployerBrand } from "@/lib/job-discovery";
import DirectoryPagination, {
  useDirectoryFilter,
  useDirectoryFilterActions,
  useDirectoryPagination,
} from "@/components/DirectoryPagination";
import { resolveApplicationDestination } from "@/lib/application-destination";
import { trackJobFunnelEvent } from "@/lib/job-funnel-analytics";
import type { Job } from "@/lib/firestore/jobs";
import { mixJobsForBrowse } from "@/lib/public-featured";
import { useJobSearchDrafts } from "./useJobSearchDrafts";
import { canonicalEmployerName, matchesEmployerFilter, projectEmployerFilters } from "./employerFilters";
const employmentTypes = [
  "All",
  "Full-time",
  "Part-time",
  "Contract",
  "Temporary",
  "Internship",
  "Casual",
];
const JOB_RECENCY_KEYS = ["createdAt", "postedAt", "order"];
function daysAgo(job: Job): string {
  let ts = 0;
  const createdAt = job.createdAt || job.postedAt;
  if (
    createdAt &&
    typeof createdAt === "object" &&
    createdAt !== null &&
    "seconds" in (createdAt as Record<string, unknown>)
  ) {
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
function getApplyLabel(job: Job): string {
  return resolveApplicationDestination(job, job.slug || job.id).label;
}
function getJobHref(job: Job): string {
  return `/jobs/${job.slug || job.id.replace(/^job-/, "")}`;
}
export default function JobsPage() {
  return (
    <Suspense fallback={null}>
      <JobsPageContent />
    </Suspense>
  );
}
function JobsPageContent() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [brands, setBrands] = useState<EmployerBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [searchReady, setSearchReady] = useState(false);
  const [search] = useDirectoryFilter("q", "");
  const [locationFilter] = useDirectoryFilter(
    "location",
    "",
  );
  const [typeFilter, setTypeFilter] = useDirectoryFilter("type", "All");
  const [salaryMin, setSalaryMin] = useDirectoryFilter("salaryMin", "");
  const [salaryMax, setSalaryMax] = useDirectoryFilter("salaryMax", "");
  const [remoteParam, setRemoteParam] = useDirectoryFilter("remote", "");
  const [employer, setEmployer] = useDirectoryFilter("employer", "");
  const [area, setArea] = useDirectoryFilter("area", "");
  const [added, setAdded] = useDirectoryFilter("added", "");
  const [closing, setClosing] = useDirectoryFilter("closing", "");
  const [disclosed, setDisclosed] = useDirectoryFilter("disclosed", "");
  const [training, setTraining] = useDirectoryFilter("training", "");
  const [salaryPeriod, setSalaryPeriod] = useDirectoryFilter("salaryPeriod", "year");
  const [sort, setSort] = useDirectoryFilter("sort", "recommended");
  const updateFilters = useDirectoryFilterActions();
  const { drafts, edit, flush, reset } = useJobSearchDrafts();
  const clearFilters = () => {
    reset();
    updateFilters(Object.fromEntries(["q","location","type","salaryMin","salaryMax","salaryPeriod","remote","employer","area","added","closing","disclosed","training","sort"].map(key => [key, null])));
  };
  const employers = useMemo(() => projectEmployerFilters(jobs), [jobs]);
  const areas = useMemo(() => [...new Set(jobs.map(jobArea).filter(Boolean))].sort(), [jobs]);
  const remoteOnly = remoteParam === "1";
  const setRemoteOnly = (next: boolean) => setRemoteParam(next ? "1" : "");
  const resultsRef = useRef<HTMLDivElement>(null);
  const submitSearch = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    flush();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(false);
      try {
        const [res, employerBrands] = await Promise.all([fetch("/api/jobs"), loadEmployerBrands()]);
        setBrands(employerBrands);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setJobs(data.jobs ?? []);
      } catch (err) {
        console.error("Failed to load jobs:", err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [retry]);
  const hasActiveFilters = useMemo(
    () =>
      Boolean(search.trim()) ||
      Boolean(locationFilter.trim()) ||
      typeFilter !== "All" ||
      Boolean(salaryMin.trim()) ||
      Boolean(salaryMax.trim()) ||
      remoteOnly || Boolean(employer || area || added || closing || disclosed || training),
    [locationFilter, remoteOnly, salaryMax, salaryMin, search, typeFilter, employer, area, added, closing, disclosed, training],
  );
  const filtered = useMemo(() => {
    let result = [...jobs];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((job) => {
        const text = [
          job.title,
          job.employerName || job.orgName,
          job.orgShort,
          (job.employerName || job.orgName || "")
            .split(/\s+/)
            .map((word) => word[0] || "")
            .join(""),
          job.location,
          job.employmentType || job.jobType,
          job.salary,
          jobArea(job),
          job.description,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(q);
      });
    }
    if (locationFilter.trim()) {
      const location = locationFilter.toLowerCase().trim();
      result = result.filter((job) =>
        matchesCanadianLocation(job.location, location),
      );
    }
    if (typeFilter !== "All") {
      result = result.filter(
        (job) =>
          (job.employmentType || job.jobType)?.toLowerCase() ===
          typeFilter.toLowerCase(),
      );
    }
    if (remoteOnly) {
      result = result.filter(
        (job) =>
          job.location?.toLowerCase().includes("remote") ||
          job.jobType?.toLowerCase().includes("remote") ||
          job.workLocation?.toLowerCase().includes("remote") ||
          job.remoteFlag,
      );
    }
    result = result.filter(job => matchesEmployerFilter(job, employer, employers) && matchesDiscoveryFilters(job, { employer: "", area, added, closing, disclosed, training, salaryPeriod, salaryMin, salaryMax }));
    return result;
  }, [
    jobs,
    employers,
    locationFilter,
    remoteOnly,
    salaryMax,
    salaryMin,
    search,
    typeFilter, employer, area, added, closing, disclosed, training, salaryPeriod,
  ]);
  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => trackJobFunnelEvent("job_search_results", { resultCount: filtered.length }), 500);
    return () => clearTimeout(timer);
  }, [filtered, loading]);
  const mixedJobs = useMemo(
    () => sort === "newest" ? [...filtered].sort((a,b) => addedAt(b)-addedAt(a)) : sort === "closing" ? [...filtered].sort((a,b) => (closesAt(a) || Infinity)-(closesAt(b) || Infinity)) :
      mixJobsForBrowse(filtered, {
        recencyKeys: JOB_RECENCY_KEYS,
        leadingRegularCount: 2,
        firstWindowSize: 12,
        maxFeaturedInFirstWindow: 2,
      }),
    [filtered, sort],
  );
  const { page, pageItems, totalPages, setPage } =
    useDirectoryPagination(mixedJobs);
  useEffect(() => {
    // SSR inputs must not accept text before the draft initialization effects run.
    // Readiness is independent of the jobs request, so loading never blocks typing.
    setSearchReady(true);
  }, []);
  const inputSurfaceStyle = {
    border: "1px solid var(--border)",
    background: "var(--card)",
    color: "var(--text)",
  } satisfies React.CSSProperties;
  return (
    <>
      <OpportunityHeader />
      <div className="op-jobs journey-jobs min-h-screen text-text transition-colors">
        <section className="journey-jobs-hero">
          <p className="op-eyebrow">Careers / Your next chapter</p>
          <h1 className="mb-2 text-3xl font-extrabold md:text-4xl">
            Find work. <span>Move forward.</span>
          </h1>
          <p className="mx-auto mb-0 max-w-[560px] text-base text-white/78">
            Connecting First Nations, Métis and Inuit talent with Indigenous and allied employers across Canada. Everyone is welcome to explore and apply.
          </p>
          <Link href="/for-employers" className="mt-4 inline-block text-sm font-semibold text-white underline underline-offset-4">Hiring? Post a job on IOPPS →</Link>
        </section>
        <div className="journey-jobs-body mx-auto max-w-[1100px] px-4 py-6 md:px-8">
          <form
            onSubmit={submitSearch}
            className="mb-4 flex items-center gap-3 rounded-[20px] px-4 py-3 shadow-sm transition-colors sm:px-5 sm:py-4"
            role="search"
            style={{
              ...inputSurfaceStyle,
              border:
                "1px solid color-mix(in srgb, var(--teal) 16%, var(--border))",
            }}
          >
            <span className="text-xl text-[#08766e]">&#128269;</span>
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={drafts.q}
              disabled={!searchReady}
              onChange={(e) => edit("q", e.target.value)}
              placeholder="Search job titles, employers, locations..."
              className="min-w-0 flex-1 border-none bg-transparent text-base text-text outline-none placeholder:text-text-muted"
              aria-label="Search jobs"
            />
            {drafts.q && (
              <button
                type="button"
                onClick={() => { edit("q", ""); flush(); }}
                className="cursor-pointer border-none bg-transparent px-1 text-lg text-text-muted"
                aria-label="Clear job search"
              >
                &#10005;
              </button>
            )}
            <button
              type="submit"
              disabled={!searchReady}
              className="brand-button shrink-0 cursor-pointer rounded-full border-none px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors"
              style={{ background: "var(--button-gradient)" }}
            >
              Search
            </button>
          </form>
          {!searchReady && <p role="status" className="mb-3 text-sm text-text-sec">Preparing search…</p>}
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              aria-label="Filter jobs by city or province"
              value={drafts.location}
              disabled={!searchReady}
              onChange={(e) => edit("location", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitSearch();
                }
              }}
              placeholder="City or province..."
              className="rounded-xl px-4 py-3 text-sm text-text outline-none placeholder:text-text-muted transition-colors"
              style={inputSurfaceStyle}
            />
            <select
              aria-label="Filter jobs by employment type"
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

            <button
              type="button"
              aria-pressed={remoteOnly}
              onClick={() => setRemoteOnly(!remoteOnly)}
              className="brand-button flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
              style={{
                border: remoteOnly
                  ? "1px solid color-mix(in srgb, var(--teal) 70%, var(--border))"
                  : "1px solid var(--border)",
                background: remoteOnly
                  ? "var(--button-gradient)"
                  : "var(--button-gradient-soft)",
                color: remoteOnly ? "#fff" : "var(--button-gradient-soft-text)",
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
          <details className="job-more-filters mb-6" open={Boolean(employer || area || added || closing || disclosed || training || salaryMin || salaryMax || salaryPeriod !== "year") || undefined}>
            <summary>More filters <span>Pay, employer, job area &amp; more</span></summary>
            <div className="border-b border-border p-4"><p className="mb-2 text-sm font-semibold">Pay range</p>            <div className="flex min-w-0 flex-wrap gap-2">
              <select aria-label="Pay period" value={salaryPeriod} onChange={e => setSalaryPeriod(e.target.value)} className="w-full rounded-xl px-3 py-2 text-sm" style={inputSurfaceStyle}><option value="year">Annual pay</option><option value="hour">Hourly pay</option><option value="month">Monthly pay</option><option value="week">Weekly pay</option></select>
              <input
                type="number"
                min="0" aria-label="Minimum pay"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                placeholder="Min $"
                className="min-w-0 w-[calc(50%-4px)] rounded-xl px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted transition-colors"
                style={inputSurfaceStyle}
              />
              <input
                type="number"
                min="0" aria-label="Maximum pay"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                placeholder="Max $"
                className="min-w-0 w-[calc(50%-4px)] rounded-xl px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted transition-colors"
                style={inputSurfaceStyle}
              />
            </div></div>
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <label>Employer<select aria-label="Employer" value={canonicalEmployerName(employer)} onChange={e => setEmployer(e.target.value)}><option value="">All employers</option>{employers.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label>Job area<select aria-label="Job area" value={area} onChange={e => setArea(e.target.value)}><option value="">All job areas</option>{areas.map(name => <option key={name}>{name}</option>)}</select></label>
              <label>Added to IOPPS<select aria-label="Added to IOPPS" value={added} onChange={e => setAdded(e.target.value)}><option value="">Any time</option><option value="1">Last 24 hours</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></label>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-3 px-4 pb-4">
              <label className="job-check"><input aria-label="Closing in 7 days" type="checkbox" checked={closing === "1"} onChange={e => setClosing(e.target.checked ? "1" : "")}/>Closing in 7 days</label>
              <label className="job-check"><input aria-label="Pay disclosed" type="checkbox" checked={disclosed === "1"} onChange={e => setDisclosed(e.target.checked ? "1" : "")}/>Pay disclosed</label>
              <label className="job-check"><input aria-label="Training provided" type="checkbox" checked={training === "1"} onChange={e => setTraining(e.target.checked ? "1" : "")}/>Training provided</label>
            </div>
            <p className="px-4 pb-4 text-sm text-text-sec">Filters use details supplied in each listing. Pay ranges compare only the selected pay period.</p>
          </details>
          {(hasActiveFilters || drafts.q || drafts.location) && <button className="job-clear mb-5" onClick={clearFilters}>Clear all filters</button>}
          <div
            ref={resultsRef}
            className="mb-4 scroll-mt-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"
          >
            <div>
              <h2 className="text-2xl font-semibold text-text">
                {hasActiveFilters ? "Matching jobs" : "Latest jobs"}
              </h2>
              <p className="text-sm text-text-sec">
                {hasActiveFilters
                  ? "Showing the best matches for your search."
                  : "The newest roles from Indigenous-led and allied employers across Canada."}
              </p>
            </div>
            <label className="job-sort">Sort by<select aria-label="Sort by" value={sort} onChange={e => setSort(e.target.value)}><option value="recommended">Recommended</option><option value="newest">Recently added</option><option value="closing">Closing soon</option></select></label>
            {!loading && (
              <p className="text-sm text-text-muted" aria-live="polite">
                {`${mixedJobs.length} job${mixedJobs.length !== 1 ? "s" : ""} found`}
              </p>
            )}
          </div>
          {loading ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <div key={index} className="skeleton h-[220px] rounded-2xl" />
              ))}
            </div>
          ) : loadError ? (
            <div role="alert" className="op-job-card">
              <h3>Jobs couldn’t be loaded</h3>
              <p>Please try again in a moment.</p>
              <button
                className="op-button"
                onClick={() => setRetry((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          ) : mixedJobs.length === 0 ? (
            <Card style={{ padding: 48, textAlign: "center" }}>
              <p className="mb-3 text-4xl">&#128188;</p>
              <h3 className="mb-2 text-lg font-bold text-text">
                No jobs found
              </h3>
              <p className="mx-auto max-w-[420px] text-sm text-text-muted">
                Try a different keyword or location, or clear your filters to see all jobs.
              </p>
              {hasActiveFilters && <button className="op-button mt-5" onClick={clearFilters}>Show all jobs</button>}
            </Card>
          ) : (
            <div
              id="directory-results"
              tabIndex={-1}
              className="grid grid-cols-1 gap-4"
            >
              {pageItems.map((job) => {
                const employerName = getEmployerName(job);
                const pay = salaryInfo(job);
                const summary = jobSummary(job);
                const closingDate = closesAt(job);
                const posted = daysAgo(job);
                return (
                  <Link key={job.id} href={getJobHref(job)} className="job-rich-card no-underline">
                    <div className="job-brand-panel"><EmployerLogo name={employerName} src={employerLogo(job, brands)} /><span className="job-brand-name">{employerName}</span></div>
                    <div className="job-rich-content">
                      <div className="job-card-kicker"><span>{jobArea(job) || "Career opportunity"}</span>{job.featured && <span className="job-chip">Featured</span>}</div>
                      <h3>{job.title}</h3>
                      <div className="job-facts"><span>{job.location || "Location not listed"}</span>{(job.employmentType || job.jobType) && <span>{job.employmentType || job.jobType}</span>}{job.workLocation && <span>{job.workLocation}</span>}</div>
                      <p className="job-summary">{summary || "Explore this opportunity and review the employer’s application details."}</p>
                      <div className="job-facts job-benefits">{job.willTrain && <span className="job-chip">Training provided</span>}{job.indigenousPreference && <span className="job-chip">Indigenous preference stated</span>}{job.benefits?.slice(0,2).map(benefit => <span className="job-chip" key={benefit}>{benefit}</span>)}</div>
                      <div className="job-card-bottom"><div><strong>{pay?.display || "Pay not listed"}</strong><span>{closingDate ? `Closes ${new Date(closingDate).toLocaleDateString("en-CA", {month:"short",day:"numeric",timeZone:"UTC"})}` : "See listing for closing details"}</span></div><span className="job-view">View opportunity <span aria-hidden="true">↗</span></span></div>
                      <div className="job-footnote"><span>{getApplyLabel(job)}</span>{posted && <span>{`Added to IOPPS ${posted.toLowerCase()}`}</span>}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          <DirectoryPagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      </div>
    </>
  );
}
