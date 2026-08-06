"use client";

import { Suspense, useState, useEffect } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import Badge from "@/components/Badge";
import Button from "@/components/Button";
import Card from "@/components/Card";
import ShareButton from "@/components/ShareButton";
import { buildLoginRedirectHref, displayAmount, displayLocation, isMailtoHref, normalizeExternalHref } from "@/lib/utils";
import { savePost, unsavePost, isPostSaved } from "@/lib/firestore/savedItems";
import { hasApplied } from "@/lib/firestore/applications";
import { useAuth } from "@/lib/auth-context";
import { sanitizeHtml } from "@/lib/sanitize-html";
import type { Job } from "@/lib/firestore/jobs";

export default function JobDetailPage() {
  return (
    <AppShell>
      <div className="min-h-screen bg-bg">
        <Suspense fallback={null}>
          <JobDetailContent />
        </Suspense>
      </div>
    </AppShell>
  );
}

type RelatedJob = Pick<
  Job,
  "id" | "slug" | "title" | "employerName" | "orgName" | "location" | "jobType" | "employmentType" | "salary" | "externalApplyUrl"
>;

function JobDetailContent() {
  const params = useParams();
  const slug = params.slug as string;
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [applied, setApplied] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [employerJobs, setEmployerJobs] = useState<RelatedJob[]>([]);
  const [similarJobs, setSimilarJobs] = useState<RelatedJob[]>([]);
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function load() {
      let loadedJob: Job | null = null;
      // Load job data
      try {
        const res = await fetch(`/api/jobs/${slug}`);
        if (!res.ok) {
          setJob(null);
          setLoading(false);
          return;
        }
        const data = await res.json();
        loadedJob = data.job ?? null;
        setJob(loadedJob);

        // Track view (fire-and-forget)
        if (loadedJob) {
          fetch(`/api/jobs/${slug}/view`, { method: "POST" }).catch(() => {});

          // M-2: fetch related jobs so the detail page isn't a dead end
          fetch(`/api/jobs/${slug}/related`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              if (!data) return;
              if (Array.isArray(data.employerJobs)) setEmployerJobs(data.employerJobs);
              if (Array.isArray(data.similarJobs)) setSimilarJobs(data.similarJobs);
            })
            .catch(() => {});
        }
      } catch (err) {
        console.error("Failed to load job:", err);
        setJob(null);
      } finally {
        setLoading(false);
      }

      // Check saved/applied status separately — don't let these crash the job display
      const jobId = loadedJob?.id || slug;
      if (user && jobId) {
        try {
          const alreadyApplied = await hasApplied(user.uid, jobId);
          setApplied(alreadyApplied);
        } catch { /* ignore — user just won't see applied state */ }
        try {
          const alreadySaved = await isPostSaved(user.uid, jobId);
          setSaved(alreadySaved);
        } catch { /* ignore — user just won't see saved state */ }
      }
    }
    load();
  }, [slug, user]);

  const handleSave = async () => {
    if (!job) return;
    // C-3: anonymous save -> route to login, preserve save intent via ?save=1
    if (!user) {
      const target = `${pathname || `/jobs/${slug}`}?save=1`;
      router.push(buildLoginRedirectHref(target));
      return;
    }
    const jobId = job.id || slug;
    setActionLoading("save");
    try {
      if (saved) {
        await unsavePost(user.uid, jobId);
        setSaved(false);
      } else {
        await savePost(user.uid, jobId, job.title, "job", job.employerName || job.orgName || "");
        setSaved(true);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setActionLoading("");
    }
  };

  // C-3: when returning from login with ?save=1 intent, auto-fire save once
  useEffect(() => {
    if (!user || !job || saved) return;
    if (searchParams?.get("save") !== "1") return;
    const cleanQs = new URLSearchParams(searchParams.toString());
    cleanQs.delete("save");
    const qs = cleanQs.toString();
    router.replace(qs ? `${pathname}?${qs}` : (pathname || `/jobs/${slug}`));
    void handleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, job, saved]);

  if (loading) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
        <div className="skeleton h-4 w-24 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="skeleton h-6 w-48 rounded mb-3" />
            <div className="skeleton h-10 w-80 rounded mb-3" />
            <div className="skeleton h-[200px] rounded-2xl mb-6" />
            <div className="skeleton h-[150px] rounded-2xl" />
          </div>
          <div>
            <div className="skeleton h-[280px] rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">💼</p>
        <h2 className="text-2xl font-extrabold text-text mb-2">Job Not Found</h2>
        <p className="text-text-sec mb-6">This job posting doesn&apos;t exist or may have been removed.</p>
        <Link href="/jobs">
          <Button primary>Browse Jobs →</Button>
        </Link>
      </div>
    );
  }

  const jobType = job.employmentType || job.jobType;
  const employerName = job.employerName || job.orgName || job.orgShort || "";
  const closingDate = job.closingDate
    ? new Date(job.closingDate as string).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })
    : null;
  const applicationUrl = job.applicationUrl
    || (job as unknown as Record<string, unknown>).applicationLink as string | undefined
    || (job as unknown as Record<string, unknown>).externalUrl as string | undefined
    || (job as unknown as Record<string, unknown>).externalApplyUrl as string | undefined;
  const normalizedApplicationHref = normalizeExternalHref(applicationUrl);
  const applicationHrefIsMailto = isMailtoHref(normalizedApplicationHref);
  const shouldUseInternalApply = applicationHrefIsMailto && Boolean(job.orgId || job.employerId);
  const applicationLinkProps = applicationHrefIsMailto ? {} : { target: "_blank", rel: "noopener noreferrer" };
  const internalApplyPath = `/jobs/${slug}/apply`;
  const loginRedirectHref = buildLoginRedirectHref(internalApplyPath);
  const workLocation = (job as unknown as Record<string, unknown>).workLocation as string | undefined;
  const category = (job as unknown as Record<string, unknown>).category as string | undefined;
  const positions = (job as unknown as Record<string, unknown>).positions as string | undefined;
  const requiresResume = !!(job as unknown as Record<string, unknown>).requiresResume;
  const requiresCoverLetter = !!(job as unknown as Record<string, unknown>).requiresCoverLetter;
  const requiresReferences = !!(job as unknown as Record<string, unknown>).requiresReferences;
  const salaryLabel = displayAmount(job.salary);
  const locationLabel = displayLocation(job.location);

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6 md:px-10 md:py-8">
      {/* Back link */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1 text-sm text-text-muted no-underline hover:text-teal mb-4"
      >
        ← Back to Jobs
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {job.featured && (
                <Badge text="Featured" color="var(--gold)" bg="var(--gold-soft)" small icon={<span>⭐</span>} />
              )}
              {jobType && (
                <Badge text={jobType} color="var(--blue)" bg="var(--blue-soft)" small />
              )}
              {workLocation && (
                <Badge text={workLocation} color="var(--teal)" bg="var(--teal-soft)" small />
              )}
              {job.indigenousPreference && (
                <Badge text="Indigenous Preference" color="var(--teal)" bg="var(--teal-soft)" small />
              )}
              {!!(job as unknown as Record<string, unknown>).willTrain && (
                <Badge text="Will Train" color="var(--green)" bg="var(--green-soft, rgba(16,185,129,.12))" small />
              )}
              {!!(job as unknown as Record<string, unknown>).driversLicense && (
                <Badge text="Driver's License Required" color="var(--amber)" bg="var(--amber-soft, rgba(217,119,6,.12))" small />
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-text mb-3">{job.title}</h1>

            <div className="flex items-center gap-3 mb-3">
              <Avatar
                name={job.orgShort || employerName}
                size={40}
                gradient="linear-gradient(135deg, var(--navy), var(--blue))"
              />
              <div>
                <p className="text-[15px] text-teal font-bold m-0">{employerName}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-text-sec">
              {locationLabel && <span>📍 {locationLabel}</span>}
              {salaryLabel && <span>💰 {salaryLabel}</span>}
              {closingDate && <span>📅 Closes: {closingDate}</span>}
            </div>
          </div>

          {/* Description */}
          {job.description ? (
            <>
              <h3 className="text-lg font-bold text-text mb-2">About This Role</h3>
              {job.description.includes("<") ? (
                <div
                  className="text-sm text-text-sec leading-relaxed mb-6 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.description) }}
                />
              ) : (
                <p className="text-sm text-text-sec leading-relaxed mb-6 whitespace-pre-line">
                  {job.description}
                </p>
              )}
            </>
          ) : normalizedApplicationHref && !shouldUseInternalApply ? (
            <div className="mb-6 p-5 rounded-2xl border border-border bg-[var(--card)]">
              <p className="text-sm text-text-sec mb-4">
                Full job details are available on the employer&apos;s career site.
              </p>
              <a href={normalizedApplicationHref} {...applicationLinkProps} className="no-underline">
                <Button primary style={{ borderRadius: 12, padding: "12px 24px", fontSize: 15, fontWeight: 700 }}>
                  View Full Details &amp; Apply ↗
                </Button>
              </a>
            </div>
          ) : null}

          {/* Requirements */}
          {job.requirements && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Requirements</h3>
              <p className="text-sm text-text-sec leading-relaxed mb-6 whitespace-pre-line">
                {job.requirements}
              </p>
            </>
          )}

          {/* Responsibilities */}
          {Array.isArray((job as unknown as Record<string, unknown>).responsibilities) &&
            ((job as unknown as Record<string, unknown>).responsibilities as string[]).length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Responsibilities</h3>
              <ul className="mb-6 pl-0 list-none">
                {((job as unknown as Record<string, unknown>).responsibilities as string[]).map((r, i) => (
                  <li key={i} className="flex gap-2 items-start mb-2">
                    <span className="text-teal text-sm mt-0.5">✓</span>
                    <span className="text-sm text-text-sec">{r}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Qualifications */}
          {Array.isArray((job as unknown as Record<string, unknown>).qualifications) &&
            ((job as unknown as Record<string, unknown>).qualifications as string[]).length > 0 && (
            <>
              <h3 className="text-lg font-bold text-text mb-2">Qualifications</h3>
              <ul className="mb-6 pl-0 list-none">
                {((job as unknown as Record<string, unknown>).qualifications as string[]).map((q, i) => (
                  <li key={i} className="flex gap-2 items-start mb-2">
                    <span className="text-blue text-sm mt-0.5">•</span>
                    <span className="text-sm text-text-sec">{q}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <Card className="mb-4" style={{ position: "sticky", top: 80 }}>
            <div style={{ padding: 20 }}>
              {/* M-4: show where the Apply action routes */}
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                {normalizedApplicationHref && !shouldUseInternalApply
                  ? "Apply on employer site"
                  : "Apply on IOPPS"}
              </p>
              {/* Apply button */}
              {normalizedApplicationHref && !shouldUseInternalApply ? (
                <a href={normalizedApplicationHref} {...applicationLinkProps} className="block no-underline mb-3">
                  <Button
                    primary
                    full
                    style={{ padding: "14px 24px", borderRadius: 14, fontSize: 16, fontWeight: 700 }}
                  >
                    Apply Now ↗
                  </Button>
                </a>
              ) : !user ? (
                <Link href={loginRedirectHref} className="block no-underline mb-3">
                  <Button
                    primary
                    full
                    style={{ padding: "14px 24px", borderRadius: 14, fontSize: 16, fontWeight: 700 }}
                  >
                    Sign In to Apply
                  </Button>
                </Link>
              ) : (
                <Button
                  primary
                  full
                  onClick={() => { if (!applied) router.push(internalApplyPath); }}
                  style={{
                    background: applied ? "var(--green)" : "var(--teal)",
                    padding: "14px 24px",
                    borderRadius: 14,
                    fontSize: 16,
                    fontWeight: 700,
                    marginBottom: 12,
                    cursor: applied ? "default" : "pointer",
                  }}
                >
                  {applied ? "✓ Applied" : "Apply Now"}
                </Button>
              )}

              {/* Save button */}
              <Button
                full
                onClick={handleSave}
                style={{
                  borderRadius: 14,
                  padding: "12px 24px",
                  fontSize: 14,
                  marginBottom: 16,
                  opacity: actionLoading === "save" ? 0.7 : 1,
                }}
              >
                {saved ? "✓ Saved" : "🔖 Save Job"}
              </Button>

              <ShareButton
                title={job.title}
                text="Share Job"
                full
                style={{
                  borderRadius: 14,
                  padding: "12px 24px",
                  fontSize: 14,
                  marginBottom: 16,
                }}
              />

              {/* Job Details */}
              <div className="border-t border-border pt-4">
                <p className="text-xs font-bold text-text-muted mb-3 tracking-[1px]">JOB DETAILS</p>
                <div className="flex flex-col gap-2.5">
                  {jobType && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Type</span>
                      <span className="text-xs font-semibold text-text">{jobType}</span>
                    </div>
                  )}
                  {salaryLabel && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Salary</span>
                      <span className="text-xs font-semibold text-text">{salaryLabel}</span>
                    </div>
                  )}
                  {locationLabel && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Location</span>
                      <span className="text-xs font-semibold text-text">{locationLabel}</span>
                    </div>
                  )}
                  {closingDate && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Deadline</span>
                      <span className="text-xs font-semibold" style={{ color: "var(--red, #ef4444)" }}>{closingDate}</span>
                    </div>
                  )}
                  {job.department && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Department</span>
                      <span className="text-xs font-semibold text-text">{job.department}</span>
                    </div>
                  )}
                  {category && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Category</span>
                      <span className="text-xs font-semibold text-text">{category}</span>
                    </div>
                  )}
                  {positions && positions !== "1" && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Openings</span>
                      <span className="text-xs font-semibold text-text">{positions}</span>
                    </div>
                  )}
                  {!!(job as unknown as Record<string, unknown>).willTrain && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Training</span>
                      <span className="text-xs font-semibold" style={{ color: "var(--green)" }}>Will Train ✓</span>
                    </div>
                  )}
                  {!!(job as unknown as Record<string, unknown>).driversLicense && (
                    <div className="flex justify-between">
                      <span className="text-xs text-text-muted">Driver&apos;s License</span>
                      <span className="text-xs font-semibold" style={{ color: "var(--amber)" }}>Required</span>
                    </div>
                  )}
                </div>
              </div>
              {(requiresResume || requiresCoverLetter || requiresReferences) && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-bold text-text-muted mb-2 tracking-[1px]">TO APPLY</p>
                  <div className="flex flex-col gap-1.5">
                    {requiresResume && <span className="text-xs text-text-sec">📄 Resume / CV required</span>}
                    {requiresCoverLetter && <span className="text-xs text-text-sec">✉️ Cover letter required</span>}
                    {requiresReferences && <span className="text-xs text-text-sec">👥 References required</span>}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {(employerJobs.length > 0 || similarJobs.length > 0) && (
        <div className="mt-10 space-y-10">
          {employerJobs.length > 0 && (
            <RelatedJobList
              title={`More from ${employerName}`}
              jobs={employerJobs}
            />
          )}
          {similarJobs.length > 0 && (
            <RelatedJobList title="Similar roles" jobs={similarJobs} />
          )}
        </div>
      )}
    </div>
  );
}

function RelatedJobList({ title, jobs }: { title: string; jobs: RelatedJob[] }) {
  return (
    <section>
      <h2 className="text-xl font-extrabold text-text mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {jobs.map((job) => {
          const href = `/jobs/${job.slug || job.id}`;
          const employer = job.employerName || job.orgName || "";
          const isExternal = Boolean(job.externalApplyUrl);
          return (
            <Link key={job.id} href={href} className="no-underline">
              <Card className="hover:-translate-y-0.5 transition-transform">
                <div className="p-4 flex flex-col gap-1.5">
                  <h3 className="text-[15px] font-bold text-text m-0 line-clamp-2">{job.title}</h3>
                  {employer && (
                    <p className="text-xs text-teal font-semibold m-0">{employer}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted mt-1">
                    {job.location && <span>📍 {job.location}</span>}
                    {(job.jobType || job.employmentType) && (
                      <span>· {job.jobType || job.employmentType}</span>
                    )}
                    {job.salary && <span>· {job.salary}</span>}
                  </div>
                  <p className="text-[11px] font-semibold text-text-muted mt-1 m-0">
                    {isExternal ? "Apply on employer site ↗" : "Apply on IOPPS"}
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
